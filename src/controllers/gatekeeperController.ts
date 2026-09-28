import type { Request, Response } from "express";
import { dbService } from "../../db.ts";

const GATE_COOKIE_NAME = "workshop_gate_pass";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getGatekeeperStatus(req: Request, res: Response): Promise<void> {
  try {
    const workshopId = await dbService.getEffectiveWorkshopId();
    const passkey = await dbService.getWorkshopPasskey();

    // Si no hay passkey configurada o está vacía, no se requiere palabra clave
    if (!passkey) {
      res.json({ required: false, authenticated: true, workshopId });
      return;
    }

    // Verificar si el cliente ya tiene una cookie válida para el workshop y passkey actual
    const cookie = req.cookies?.[GATE_COOKIE_NAME];
    let isAuthenticated = false;

    if (cookie) {
      try {
        const parsed = typeof cookie === "string" ? JSON.parse(cookie) : cookie;
        if (
          parsed?.workshopId === workshopId &&
          typeof parsed?.passkey === "string" &&
          parsed.passkey.toLowerCase() === passkey.toLowerCase()
        ) {
          isAuthenticated = true;
        }
      } catch {
        isAuthenticated = false;
      }
    }

    res.json({
      required: true,
      authenticated: isAuthenticated,
      workshopId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al verificar acceso" });
  }
}

export async function verifyGatekeeperPasskey(req: Request, res: Response): Promise<void> {
  try {
    const workshopId = await dbService.getEffectiveWorkshopId();
    const expectedPasskey = await dbService.getWorkshopPasskey();

    if (!expectedPasskey) {
      res.json({ ok: true, workshopId });
      return;
    }

    const { passkey } = req.body || {};
    const entered = typeof passkey === "string" ? passkey.trim().toLowerCase() : "";
    const target = expectedPasskey.trim().toLowerCase();

    if (entered === target) {
      // Guardar cookie de pase autorizada para este taller
      res.cookie(
        GATE_COOKIE_NAME,
        JSON.stringify({ workshopId, passkey: target }),
        {
          maxAge: THIRTY_DAYS_MS,
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
      error: "Encantamiento o palabra clave incorrecta. Las puertas de Hogwarts no ceden.",
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Error al validar la palabra clave" });
  }
}
