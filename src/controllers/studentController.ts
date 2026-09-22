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

export function resetSession(req: Request, res: Response): void {
  clearStudentSession(res);
  if (req.method === "GET" && req.accepts("html") && !req.xhr) {
    res.redirect("/");
    return;
  }
  res.json({ success: true, message: "Sesión reiniciada" });
}
