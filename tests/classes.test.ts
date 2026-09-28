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
    expect(CLASSES.battle.attachments?.length).toBeGreaterThanOrEqual(2);
    expect(CLASSES.battle.attachments?.[0].content).toContain("lanzar_contrahechizo");
  });


  it("debe guardar y recuperar las entregas de un estudiante", async () => {
    const ws = trackWorkshop(`ws-test-classes-${Date.now()}`);
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
    const ws = trackWorkshop(`ws-test-points-${Date.now()}`);
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

});
