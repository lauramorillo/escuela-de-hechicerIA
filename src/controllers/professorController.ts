import type { Request, Response } from "express";
import { dbService } from "../../db.ts";

const PROFESSOR_COOKIE_NAME = "professor_cloister_pass";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const VALID_CLASS_IDS = new Set(["transfiguration", "defense", "battle"]);

async function isProfessorAuthenticated(req: Request): Promise<boolean> {
  const expectedPasskey = await dbService.getProfessorPasskey();
  const target = expectedPasskey.trim().toLowerCase();

  // 1. Header directo
  const headerPass = req.headers["x-professor-password"];
  if (typeof headerPass === "string" && headerPass.trim().toLowerCase() === target) {
    return true;
  }

  // 2. Cookie de sesión
  const cookie = req.cookies?.[PROFESSOR_COOKIE_NAME];
  if (cookie) {
    try {
      const parsed = typeof cookie === "string" ? JSON.parse(cookie) : cookie;
      if (typeof parsed?.passkey === "string" && parsed.passkey.trim().toLowerCase() === target) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

export async function getProfessorStatus(req: Request, res: Response): Promise<void> {
  try {
    const [workshopId, authenticated] = await Promise.all([
      dbService.getEffectiveWorkshopId(),
      isProfessorAuthenticated(req),
    ]);
    res.json({ authenticated, workshopId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al comprobar el acceso de profesora" });
  }
}

export async function verifyProfessorPasskey(req: Request, res: Response): Promise<void> {
  try {
    const [workshopId, expectedPasskey] = await Promise.all([
      dbService.getEffectiveWorkshopId(),
      dbService.getProfessorPasskey(),
    ]);

    const { password } = req.body || {};
    const entered = typeof password === "string" ? password.trim().toLowerCase() : "";
    const target = expectedPasskey.trim().toLowerCase();

    if (entered && entered === target) {
      res.cookie(
        PROFESSOR_COOKIE_NAME,
        JSON.stringify({ passkey: target }),
        {
          maxAge: SEVEN_DAYS_MS,
          httpOnly: false,
          sameSite: "lax",
          path: "/",
        }
      );
      res.json({ ok: true, workshopId });
      return;
    }

    res.status(401).json({
      ok: false,
      error: "Contraseña del Claustro incorrecta. Acceso exclusivo para la Profesora.",
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Error al verificar la contraseña" });
  }
}

export async function logoutProfessor(_req: Request, res: Response): Promise<void> {
  res.clearCookie(PROFESSOR_COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
}

export async function getProfessorDashboard(req: Request, res: Response): Promise<void> {
  try {
    const authenticated = await isProfessorAuthenticated(req);
    if (!authenticated) {
      res.status(401).json({ error: "No autorizado. Introduce la contraseña de Profesora." });
      return;
    }

    const workshopId =
      (typeof req.query.workshopId === "string" && req.query.workshopId.trim()) ||
      (await dbService.getEffectiveWorkshopId());

    const summary = await dbService.getTournamentSummary(workshopId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al obtener el panel de profesora" });
  }
}

export async function toggleClassLock(req: Request, res: Response): Promise<void> {
  try {
    const authenticated = await isProfessorAuthenticated(req);
    if (!authenticated) {
      res.status(401).json({ error: "No autorizado. Introduce la contraseña de Profesora." });
      return;
    }

    const { classId, unlocked } = req.body || {};
    if (typeof classId !== "string" || !VALID_CLASS_IDS.has(classId)) {
      res.status(400).json({ error: "Identificador de desafío no válido." });
      return;
    }

    const workshopId =
      (typeof req.body?.workshopId === "string" && req.body.workshopId.trim()) ||
      (await dbService.getEffectiveWorkshopId());

    const unlockedClasses = await dbService.setClassUnlocked(workshopId, classId, Boolean(unlocked));
    res.json({
      ok: true,
      workshopId,
      classId,
      unlocked: Boolean(unlocked),
      unlockedClasses,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al actualizar el estado del desafío" });
  }
}
