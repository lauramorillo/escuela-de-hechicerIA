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

  const [submissions, houseScores] = await Promise.all([
    dbService.getSubmissions(workshopId, identity.studentId),
    dbService.getHouseScores(workshopId),
  ]);

  const canonicalClasses = [CLASSES.transfiguration, CLASSES.defense, CLASSES.battle];

  res.json({
    classes: canonicalClasses,
    submissions,
    houseScores,
    student: {
      studentId: identity.studentId,
      house,
    },
  });
}

