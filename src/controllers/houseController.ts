import type { Request, Response } from "express";
import { dbService } from "../../db.ts";

export async function getHouseStats(_req: Request, res: Response): Promise<void> {
  try {
    const workshopId = await dbService.getEffectiveWorkshopId();
    const stats = await dbService.getHouseStats(workshopId);
    res.json({ workshopId, houses: stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
