import { describe, it, expect, afterAll } from "vitest";
import { dbService } from "../db.ts";
import { CLASSES } from "../src/services/professorAI.ts";

describe("Clases y Profesores Agénticos", () => {
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

  it("debe contener las 3 clases oficiales del taller", () => {
    expect(CLASSES.transfiguration).toBeDefined();
    expect(CLASSES.transfiguration.professor).toContain("McGonagall");
    expect(CLASSES.transfiguration.attachments).toBeDefined();
    expect(CLASSES.transfiguration.attachments?.length).toBeGreaterThanOrEqual(2);
    expect(CLASSES.transfiguration.attachments?.[0].content).toContain("GRINGOTTS-VAULT-CALC");

    expect(CLASSES.defense).toBeDefined();
    expect(CLASSES.defense.professor).toContain("Lupin");
    expect(CLASSES.defense.subExercises).toBeDefined();
    expect(CLASSES.defense.subExercises?.length).toBe(2);
    expect(CLASSES.defense.subExercises?.[0].id).toBe("defense_attack");
    expect(CLASSES.defense.subExercises?.[1].id).toBe("defense_guard");

    expect(CLASSES.battle).toBeDefined();
    expect(CLASSES.battle.title).toContain("Batalla de Hogwarts");
    expect(CLASSES.battle.attachments).toBeDefined();
    expect(CLASSES.battle.attachments?.length).toBeGreaterThanOrEqual(3);
    expect(CLASSES.battle.attachments?.[0].content).toContain("grimorio-hechizos.jpg");
    expect(CLASSES.battle.attachments?.[1].content).toContain("espantar_dementores");
  });


  it("debe guardar y recuperar las entregas de un estudiante", async () => {
    const ws = trackWorkshop(`test-classes-${Date.now()}`);
    await dbService.ensureHousesInitialized(ws);

    const studentId = "student_hermione";
    await dbService.assignStudentToBalancedHouse(ws, studentId, "gryffindor");

    const submission = {
      class_id: "transfiguration",
      answer: "Alineo la varita con el objeto y pronuncio la fórmula de transfiguración molecular.",
      grade: "E",
      grade_label: "Extraordinario",
      points: 50,
      feedback: "Excelente precisión teórica.",
      advice: "Mantenga la concentración.",
    };

    await dbService.saveSubmission(ws, studentId, submission);

    const submissions = await dbService.getSubmissions(ws, studentId);
    expect(submissions.transfiguration).toBeDefined();
    expect(submissions.transfiguration.grade).toBe("E");
    expect(submissions.transfiguration.points).toBe(50);
  });

  it("debe sumar puntos de casa y reflejarlos en las puntuaciones", async () => {
    const ws = trackWorkshop(`test-points-${Date.now()}`);
    await dbService.ensureHousesInitialized(ws);

    const initialScores = await dbService.getHouseScores(ws);
    expect(initialScores.gryffindor).toBe(0);

    const updatedScore = await dbService.addHousePoints(ws, "gryffindor", 50);
    expect(updatedScore).toBe(50);

    const secondScore = await dbService.addHousePoints(ws, "gryffindor", 30);
    expect(secondScore).toBe(80);

    const allScores = await dbService.getHouseScores(ws);
    expect(allScores.gryffindor).toBe(80);
    expect(allScores.slytherin).toBe(0);
  });

  it("debe calcular la puntuación de la casa estrictamente como la suma de puntos de sus alumnos en reintentos", async () => {
    const ws = trackWorkshop(`test-sum-${Date.now()}`);
    await dbService.ensureHousesInitialized(ws);

    const student1 = "student_ron";
    await dbService.assignStudentToBalancedHouse(ws, student1, "gryffindor");

    // Envío incorrecto con -5 puntos (Trol)
    await dbService.saveSubmission(ws, student1, {
      class_id: "transfiguration",
      grade: "T",
      grade_label: "Trol",
      points: -5,
      total_awarded_points: -5,
      feedback: "Incorrecto",
      advice: "Practica más",
      house: "gryffindor",
    } as any);

    let scores = await dbService.getHouseScores(ws);
    expect(scores.gryffindor).toBe(-5);

    // Reenvío corregido con 23 puntos (25 base - 2 penalización acumulada)
    await dbService.saveSubmission(ws, student1, {
      class_id: "transfiguration",
      grade: "E",
      grade_label: "Extraordinario",
      points: 23,
      total_awarded_points: 23,
      attempt_count: 2,
      retry_penalty: 2,
      feedback: "Corregido",
      advice: "Bien",
      house: "gryffindor",
    } as any);

    scores = await dbService.getHouseScores(ws);
    // Debe ser exactamente 23 puntos (la suma de los alumnos de Gryffindor), NO 28 (+delta) ni 46 (doble suma)
    expect(scores.gryffindor).toBe(23);

    // Segundo alumno de Gryffindor con 15 puntos
    const student2 = "student_hermione_2";
    await dbService.assignStudentToBalancedHouse(ws, student2, "gryffindor");
    await dbService.saveSubmission(ws, student2, {
      class_id: "transfiguration",
      grade: "S",
      grade_label: "Supera las expectativas",
      points: 15,
      total_awarded_points: 15,
      feedback: "Notable",
      advice: "Bien",
      house: "gryffindor",
    } as any);

    scores = await dbService.getHouseScores(ws);
    // 23 + 15 = 38 puntos
    expect(scores.gryffindor).toBe(38);
  });

  it("debe garantizar la sincronización concurrente con múltiples alumnos enviando resultados simultáneamente", async () => {
    const ws = trackWorkshop(`test-concurrent-${Date.now()}`);
    await dbService.ensureHousesInitialized(ws);

    const submissionsCount = 20;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < submissionsCount; i++) {
      const studentId = `concurrent_student_${i}`;
      const house = i % 2 === 0 ? "gryffindor" : "slytherin";
      const points = (i + 1) * 2; // Valores deterministas

      promises.push((async () => {
        await dbService.assignStudentToBalancedHouse(ws, studentId, house);
        await dbService.saveSubmission(ws, studentId, {
          class_id: "transfiguration",
          grade: "A",
          grade_label: "Aceptable",
          points,
          total_awarded_points: points,
          feedback: `Envío ${i}`,
          advice: "Ánimo",
          house,
        } as any);
      })());
    }

    await Promise.all(promises);

    const scores = await dbService.getHouseScores(ws);

    let expectedGryffindor = 0;
    let expectedSlytherin = 0;
    for (let i = 0; i < submissionsCount; i++) {
      const points = (i + 1) * 2;
      if (i % 2 === 0) {
        expectedGryffindor += points;
      } else {
        expectedSlytherin += points;
      }
    }

    expect(scores.gryffindor).toBe(expectedGryffindor);
    expect(scores.slytherin).toBe(expectedSlytherin);
  });

  it("debe persistir y verificar el desbloqueo de la Fase 2 de defensa para un estudiante", async () => {
    const ws = trackWorkshop(`test-defense-unlock-${Date.now()}`);
    await dbService.ensureHousesInitialized(ws);

    const studentId = "student_lupin_pupil";
    await dbService.assignStudentToBalancedHouse(ws, studentId, "ravenclaw");

    const studentBefore = await dbService.getStudent(ws, studentId);
    expect(studentBefore?.defense_unlocked).toBeFalsy();

    await dbService.setStudentDefenseUnlocked(ws, studentId);

    const studentAfter = await dbService.getStudent(ws, studentId);
    expect(studentAfter?.defense_unlocked).toBe(true);
  });
});
