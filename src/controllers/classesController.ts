import type { Request, Response } from "express";
import { dbService, HOUSES, type HouseId } from "../../db.ts";
import { readStudentSession } from "../services/session.ts";
import { CLASSES } from "../services/professorAI.ts";

function resolveStudentIdentity(req: Request): {
  studentId?: string;
  house?: string;
  workshopId?: string;
} {
  const session = readStudentSession(req);
  const studentId =
    session?.studentId ||
    (typeof req.headers["x-student-id"] === "string" ? req.headers["x-student-id"] : undefined) ||
    (typeof req.query.studentId === "string" ? req.query.studentId : undefined) ||
    (typeof req.body?.studentId === "string" ? req.body.studentId : undefined);

  const house =
    session?.house ||
    (typeof req.headers["x-student-house"] === "string" ? req.headers["x-student-house"] : undefined) ||
    (typeof req.query.house === "string" ? req.query.house : undefined) ||
    (typeof req.body?.house === "string" ? req.body.house : undefined);

  const workshopId =
    session?.workshopId ||
    (typeof req.headers["x-workshop-id"] === "string" ? req.headers["x-workshop-id"] : undefined) ||
    (typeof req.query.workshopId === "string" ? req.query.workshopId : undefined) ||
    (typeof req.body?.workshopId === "string" ? req.body.workshopId : undefined);

  return { studentId, house, workshopId };
}

export async function getAvailableClasses(req: Request, res: Response): Promise<void> {
  const identity = resolveStudentIdentity(req);
  if (!identity.studentId) {
    res.status(401).json({ error: "No se encontró sesión de estudiante. Debes pasar primero por el Sombrero Seleccionador." });
    return;
  }

  const workshopId = identity.workshopId || (await dbService.getEffectiveWorkshopId());
  const student = await dbService.getStudent(workshopId, identity.studentId);
  const house = student?.house || (identity.house?.toLowerCase() as HouseId) || "gryffindor";

  const [submissions, houseScores, unlockedClasses] = await Promise.all([
    dbService.getSubmissions(workshopId, identity.studentId),
    dbService.getHouseScores(workshopId),
    dbService.getUnlockedClasses(workshopId),
  ]);

  const unlockedSet = new Set(unlockedClasses);
  const canonicalClasses = [CLASSES.transfiguration, CLASSES.defense, CLASSES.battle].map((cls) => {
    if (unlockedSet.has(cls.id)) {
      return cls;
    }
    // Si el desafío está bloqueado, ocultar el enunciado, adjuntos y detalles para que nadie pueda cotillearlo
    return {
      id: cls.id,
      title: cls.title,
      professor: cls.professor,
      subject: cls.subject,
      icon: cls.icon,
      description: cls.description,
      assignment: "🔒 Este desafío permanece sellado por el Claustro. Espera a que la Profesora lo active.",
      attachments: [],
      subExercises: [],
      hints: [],
    };
  });

  res.json({
    classes: canonicalClasses,
    unlockedClasses,
    submissions,
    houseScores,
    student: {
      studentId: identity.studentId,
      house,
      defenseUnlocked: Boolean(student?.defense_unlocked),
    },
  });
}

export async function unlockDefensePhase1(req: Request, res: Response): Promise<void> {
  const identity = resolveStudentIdentity(req);
  const studentId = req.body?.studentId || identity.studentId;
  if (!studentId) {
    res.status(400).json({ error: "No se proporcionó el identificador del estudiante." });
    return;
  }

  const workshopId = identity.workshopId || (await dbService.getEffectiveWorkshopId());
  await dbService.setStudentDefenseUnlocked(workshopId, studentId);
  res.json({ success: true, studentId, defenseUnlocked: true });
}

