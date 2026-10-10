import type { Request, Response } from "express";
import { dbService, type HouseId } from "../../db.ts";

function getEvaluationServiceUrl(): string {
  const url = process.env.EVALUATION_SERVICE_URL;

  if (url && url.trim()) {
    return url.trim();
  }

  // Si estamos en Cloud Run (Google Cloud), apuntar directamente al microservicio de profesores
  if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) {
    return "https://escuela-de-hechiceria-profesores-hk7klenoma-ew.a.run.app";
  }

  // Entorno local: si este servidor corre en 8080 (Docker), el servicio de profesores suele ser http://profesores:8080 o localhost:8081
  const port = process.env.PORT || "3000";
  if (port === "8080") {
    return "http://localhost:8081";
  }
  return "http://localhost:8080";
}

export async function proxyEvaluation(req: Request, res: Response): Promise<void> {
  if (req.headers["x-proxy-hop"]) {
    res.status(508).json({
      error: "Bucle de proxy detectado: la petición fue redirigida a este mismo servidor.",
    });
    return;
  }

  const workshopIdForCheck = req.body?.workshopId || (await dbService.getEffectiveWorkshopId());
  const requestedClassId = req.body?.classId;
  if (requestedClassId) {
    const unlockedClasses = await dbService.getUnlockedClasses(String(workshopIdForCheck));
    if (!unlockedClasses.includes(String(requestedClassId))) {
      res.status(403).json({
        error: "🔒 Este desafío aún está bloqueado por la Profesora. Espera a que se active para enviar tu solución.",
      });
      return;
    }
  }

  const remoteServiceUrl = getEvaluationServiceUrl();
  const targetUrl = `${remoteServiceUrl.replace(/\/$/, "")}/api/evaluate`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-hop": "escuela-web",
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstreamRes.json();
    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).json(data);
      return;
    }

    // Persistir de forma robusta en la base de datos de la escuela
    const workshopId = req.body.workshopId || (await dbService.getEffectiveWorkshopId());
    const studentId = req.body.studentId;
    const house = (req.body.house || "gryffindor").toLowerCase() as HouseId;
    const classId = req.body.classId;

    if (studentId && classId && data.grade) {
      const pointsToApply = data.pointsDelta !== undefined ? data.pointsDelta : (data.totalAwardedPoints ?? data.points);

      await dbService.saveSubmission(
        workshopId,
        studentId,
        {
          class_id: classId,
          answer: req.body.answer || "",
          grade: data.grade,
          grade_label: data.gradeLabel,
          points: data.points,
          bonus_points: data.bonusPoints,
          total_awarded_points: data.totalAwardedPoints,
          first_house_bonus: data.firstHouseBonus,
          feedback: data.feedback,
          advice: data.advice,
          audio_phrase: data.audioPhrase,
          audio: data.audio,
          test_results: data.testResults,
          attempt_count: data.attemptCount,
          retry_penalty: data.retryPenalty,
          base_points: data.basePoints,
          house,
        } as any,
        pointsToApply
      );
    }

    res.status(upstreamRes.status).json(data);
  } catch (err: any) {
    console.error("Error al contactar con el microservicio evaluador:", err);
    res.status(502).json({
      error: "No se pudo contactar con el claustro de profesores evaluadores.",
      details: err.message || String(err),
    });
  }
}

export async function proxyGuardianChat(req: Request, res: Response): Promise<void> {
  if (req.headers["x-proxy-hop"]) {
    res.status(508).json({
      error: "Bucle de proxy detectado: la petición fue redirigida a este mismo servidor.",
    });
    return;
  }

  const workshopIdForCheck =
    req.body?.workshopId ||
    req.headers["x-workshop-id"] ||
    (await dbService.getEffectiveWorkshopId());
  const unlockedClasses = await dbService.getUnlockedClasses(String(workshopIdForCheck));
  if (!unlockedClasses.includes("defense")) {
    res.status(403).json({
      error: "🔒 El desafío del Mapa del Merodeador aún está sellado por la Profesora.",
    });
    return;
  }

  const remoteServiceUrl = getEvaluationServiceUrl();
  const targetUrl = `${remoteServiceUrl.replace(/\/$/, "")}/api/defense/guardian-chat`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-hop": "escuela-web",
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstreamRes.json();
    if (data.secretUnlocked) {
      const studentId =
        req.body?.studentId ||
        req.headers["x-student-id"] ||
        (typeof req.query?.studentId === "string" ? req.query.studentId : undefined);
      if (studentId) {
        const workshopId =
          req.body?.workshopId ||
          req.headers["x-workshop-id"] ||
          (await dbService.getEffectiveWorkshopId());
        try {
          await dbService.setStudentDefenseUnlocked(String(workshopId), String(studentId));
        } catch (dbErr) {
          console.warn("No se pudo persistir el desbloqueo de defensa en DB:", dbErr);
        }
      }
    }
    res.status(upstreamRes.status).json(data);
  } catch (err: any) {
    console.error("Error al contactar con el guardián del castillo:", err);
    res.status(502).json({
      error: "No se pudo contactar con el guardián de Hogwarts.",
      details: err.message || String(err),
    });
  }
}

