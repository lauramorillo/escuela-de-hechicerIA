import type { Request, Response } from "express";

export interface StudentSession {
  studentId: string;
  house: string;
  phrase: string;
  workshopId: string;
}

const SESSION_COOKIE_NAME = "student_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function readStudentSession(req: Request): StudentSession | null {
  const cookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (!cookie) return null;

  try {
    const data = typeof cookie === "string" ? JSON.parse(cookie) : cookie;
    if (data?.studentId && data?.house) {
      return data as StudentSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStudentSession(res: Response, session: StudentSession): void {
  res.cookie(SESSION_COOKIE_NAME, JSON.stringify(session), {
    maxAge: THIRTY_DAYS_MS,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}

export function clearStudentSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/", sameSite: "lax" });
  res.cookie(SESSION_COOKIE_NAME, "", { maxAge: 0, expires: new Date(0), path: "/" });
}
