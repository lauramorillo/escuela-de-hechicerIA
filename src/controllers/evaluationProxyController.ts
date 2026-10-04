import type { Request, Response } from "express";
import { dbService, type HouseId } from "../../db.ts";

export async function proxyEvaluation(req: Request, res: Response): Promise<void> {
  const remoteServiceUrl =
    process.env.EVALUATION_SERVICE_URL ||
    process.env.VITE_EVALUATION_SERVICE_URL ||
    "http://localhost:8080";
  const targetUrl = `${remoteServiceUrl.replace(/\/$/, "")}/evaluate`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      await dbService.saveSubmission(workshopId, studentId, {
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
      });

      const pointsToApply = data.totalAwardedPoints ?? data.points;
      if (pointsToApply) {
        await dbService.addHousePoints(workshopId, house, pointsToApply);
      }
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
