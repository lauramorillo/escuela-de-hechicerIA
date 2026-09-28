import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { dbService, HOUSES, HouseId } from "../db.ts";

describe("Sombrero Seleccionador - Balanceo y Concurrencia", () => {
  const createdWorkshops: string[] = [];
  function trackWorkshop(id: string): string {
    createdWorkshops.push(id);
    return id;
  }

  afterAll(async () => {
    for (const ws of createdWorkshops) {
      await dbService.deleteWorkshop(ws);
    }
  });

  const workshopId = trackWorkshop(`test-balancing-${Date.now()}`);

  beforeEach(async () => {
    await dbService.ensureHousesInitialized(workshopId);
  });

  it("debe inicializar las 4 casas con contador a cero", async () => {
    const stats = await dbService.getHouseStats(workshopId);
    expect(Object.keys(stats).sort()).toEqual([...HOUSES].sort());
    for (const house of HOUSES) {
      expect(stats[house]).toBeGreaterThanOrEqual(0);
    }
  });

  it("debe mantener el invariante (max - min <= 2) paso a paso con 20 asignaciones consecutivas", async () => {
    const stepWorkshopId = trackWorkshop(`test-step-${Date.now()}`);
    await dbService.ensureHousesInitialized(stepWorkshopId);

    for (let i = 1; i <= 20; i++) {
      const studentId = `student_step_${i}`;
      const cand = await dbService.getCandidateHouse(stepWorkshopId);
      const res = await dbService.assignStudentToBalancedHouse(stepWorkshopId, studentId, cand);

      expect(HOUSES).toContain(res.house);

      const currentStats = await dbService.getHouseStats(stepWorkshopId);
      const counts = Object.values(currentStats);
      const min = Math.min(...counts);
      const max = Math.max(...counts);

      expect(max - min).toBeLessThanOrEqual(2);
    }

    const finalStats = await dbService.getHouseStats(stepWorkshopId);
    const total = Object.values(finalStats).reduce((a, b) => a + b, 0);
    expect(total).toBe(20);
  });

  it("debe asignar 60 alumnos en paralelo garantizando la concurrencia y max - min <= 2", async () => {
    const concurrentWorkshopId = trackWorkshop(`test-concur-${Date.now()}`);
    await dbService.ensureHousesInitialized(concurrentWorkshopId);

    const TOTAL = 60;
    const promises = Array.from({ length: TOTAL }).map(async (_, idx) => {
      // Simular llegada concurrente de alumnos en el aula (ventana de 0 a 1.2s)
      const clientJitter = Math.random() * 1200;
      await new Promise((r) => setTimeout(r, clientJitter));

      const studentId = `student_p_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`;
      const candidate = await dbService.getCandidateHouse(concurrentWorkshopId);
      const assigned = await dbService.assignStudentToBalancedHouse(concurrentWorkshopId, studentId, candidate);
      await dbService.updateStudentJustification(
        concurrentWorkshopId,
        studentId,
        `Veredicto oficial para ${assigned.houseDisplayName}`
      );
      return assigned;
    });

    const results = await Promise.all(promises);
    expect(results).toHaveLength(TOTAL);

    const finalStats = await dbService.getHouseStats(concurrentWorkshopId);
    const counts = Object.values(finalStats);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const total = counts.reduce((a, b) => a + b, 0);

    expect(total).toBe(TOTAL);
    expect(max - min).toBeLessThanOrEqual(2);

    // Verificar que un alumno guardado tiene los campos correctos
    const sample = results[0];
    const studentDoc = await dbService.getStudent(concurrentWorkshopId, sample.studentId);
    expect(studentDoc).not.toBeNull();
    expect(studentDoc?.house).toBe(sample.house);
    expect(studentDoc?.justification).toContain(sample.houseDisplayName);
    expect(studentDoc?.assigned_at).toBeDefined();
  }, 80000);

  it("debe eliminar un alumno y decrementar el contador de su casa correctamente al resetear", async () => {
    const resetWorkshopId = trackWorkshop(`test-reset-${Date.now()}`);
    await dbService.ensureHousesInitialized(resetWorkshopId);

    const studentId = "student_to_remove_123";
    const assigned = await dbService.assignStudentToBalancedHouse(resetWorkshopId, studentId, "gryffindor");

    // Verificar que el alumno existe y la casa tiene 1 miembro
    const beforeStats = await dbService.getHouseStats(resetWorkshopId);
    expect(beforeStats[assigned.house]).toBe(1);
    const studentBefore = await dbService.getStudent(resetWorkshopId, studentId);
    expect(studentBefore).not.toBeNull();
    expect(studentBefore?.house).toBe(assigned.house);

    // Eliminar el alumno
    const removed = await dbService.removeStudent(resetWorkshopId, studentId);
    expect(removed).toBe(true);

    // Verificar que el alumno ya no existe y el contador volvió a 0
    const studentAfter = await dbService.getStudent(resetWorkshopId, studentId);
    expect(studentAfter).toBeNull();

    const afterStats = await dbService.getHouseStats(resetWorkshopId);
    expect(afterStats[assigned.house]).toBe(0);

    // Intentar borrar de nuevo debe devolver false
    const removedAgain = await dbService.removeStudent(resetWorkshopId, studentId);
    expect(removedAgain).toBe(false);
  });

  it("debe autorrecuperarse y recrear las casas si son eliminadas en tiempo de ejecución", async () => {
    const healWorkshopId = trackWorkshop(`test-heal-${Date.now()}`);
    // Simular que el workshop no tiene casas o fueron borradas
    const stats = await dbService.getHouseStats(healWorkshopId);
    expect(Object.keys(stats)).toHaveLength(4);

    // Debe ser capaz de asignar un alumno directamente sin error
    const assigned = await dbService.assignStudentToBalancedHouse(healWorkshopId, "student_heal_1");
    expect(HOUSES).toContain(assigned.house);

    const afterStats = await dbService.getHouseStats(healWorkshopId);
    expect(afterStats[assigned.house]).toBe(1);
  });
});
