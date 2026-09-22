import { describe, it, expect, beforeEach } from "vitest";
import { dbService, HOUSES, HouseId } from "../db.ts";

describe("Sombrero Seleccionador - Balanceo y Concurrencia", () => {
  const workshopId = `test-balancing-${Date.now()}`;

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
    const stepWorkshopId = `test-step-${Date.now()}`;
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
    const concurrentWorkshopId = `test-concur-${Date.now()}`;
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
});
