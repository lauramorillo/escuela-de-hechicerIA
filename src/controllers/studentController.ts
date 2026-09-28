import type { Request, Response } from "express";
import { dbService, HOUSE_NAMES } from "../../db.ts";
import { readStudentSession, clearStudentSession } from "../services/session.ts";
import { getDefaultVerdict } from "../services/sortingHatAI.ts";

export async function getStudentSession(req: Request, res: Response): Promise<void> {
  const session = readStudentSession(req);
  if (!session) {
    res.json({ assigned: false });
    return;
  }

  const workshopId = session.workshopId || (await dbService.getEffectiveWorkshopId());
  const student = await dbService.getStudent(workshopId, session.studentId);
  const houseName = student ? HOUSE_NAMES[student.house] || student.house : session.house;
  const phrase = student?.justification || session.phrase || getDefaultVerdict(houseName);

  res.json({
    assigned: true,
    studentId: session.studentId,
    house: houseName,
    phrase,
    workshopId,
  });
}

export async function resetSession(req: Request, res: Response): Promise<void> {
  const session = readStudentSession(req);
  const studentId =
    session?.studentId ||
    (typeof req.query.studentId === "string" ? req.query.studentId : undefined) ||
    (typeof req.body?.studentId === "string" ? req.body.studentId : undefined);

  const workshopId =
    session?.workshopId ||
    (typeof req.query.workshopId === "string" ? req.query.workshopId : undefined) ||
    (typeof req.body?.workshopId === "string" ? req.body.workshopId : undefined) ||
    (await dbService.getEffectiveWorkshopId());

  let studentRemoved = false;
  if (studentId) {
    studentRemoved = await dbService.removeStudent(workshopId, studentId);
  }

  clearStudentSession(res);

  if (req.method === "GET" && req.accepts("html") && !req.xhr) {
    res.redirect("/");
    return;
  }

  res.json({
    success: true,
    message: studentRemoved
      ? "Sesión reiniciada y alumno eliminado de la casa"
      : "Sesión reiniciada",
    studentId,
    studentRemoved,
  });
}
