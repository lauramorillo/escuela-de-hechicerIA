import type { Request, Response } from "express";
import crypto from "crypto";
import { dbService, HOUSE_NAMES, type HouseId } from "../../db.ts";
import { deliberateHouse, synthesizeHatVoice, getDefaultVerdict } from "../services/sortingHatAI.ts";
import { readStudentSession, writeStudentSession } from "../services/session.ts";

const MAX_ASSIGNMENT_RETRIES = 4;

async function assignStudentWithRetry(workshopId: string, studentId: string, candidateHouseId: HouseId) {
  for (let attempt = 0; attempt < MAX_ASSIGNMENT_RETRIES; attempt++) {
    try {
      return await dbService.assignStudentToBalancedHouse(workshopId, studentId, candidateHouseId);
    } catch (err) {
      if (attempt === MAX_ASSIGNMENT_RETRIES - 1) throw err;
      await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));
    }
  }
}

export async function detectAndSort(req: Request, res: Response): Promise<void> {
  const { imageParams } = req.body;
  if (!imageParams) {
    res.status(400).json({ error: "No image provided" });
    return;
  }

  const workshopId = await dbService.getEffectiveWorkshopId();
  const existingSession = readStudentSession(req);

  if (existingSession && existingSession.workshopId === workshopId) {
    res.json({
      detected: true,
      confidence: 1.0,
      house: existingSession.house,
      phrase: existingSession.phrase || getDefaultVerdict(existingSession.house),
      studentId: existingSession.studentId,
      workshopId,
    });
    return;
  }

  const candidateId = await dbService.getCandidateHouse(workshopId);
  const targetHouse = HOUSE_NAMES[candidateId];
  const verdict = await deliberateHouse(imageParams, targetHouse);

  if (!verdict.detected) {
    res.json({ detected: false, confidence: verdict.confidence });
    return;
  }

  const studentId = `student_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const assignment = await assignStudentWithRetry(workshopId, studentId, candidateId);
  const house = assignment?.houseDisplayName || targetHouse;
  const phrase = verdict.phrase || getDefaultVerdict(house);

  dbService.updateStudentJustification(workshopId, studentId, phrase).catch(() => {});
  writeStudentSession(res, { studentId, house, phrase, workshopId });

  res.json({
    detected: true,
    confidence: verdict.confidence,
    house,
    phrase,
    studentId,
    workshopId,
  });
}

export async function synthesizeSpeech(req: Request, res: Response): Promise<void> {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: "No text provided" });
    return;
  }

  try {
    const audioBase64 = await synthesizeHatVoice(text);
    res.json({ audio: audioBase64 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
