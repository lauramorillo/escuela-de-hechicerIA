import { describe, it, expect } from "vitest";
import { dbService } from "../db.ts";

describe("Multitenancy por Edición (Workshop Isolation)", () => {
  it("debe aislar completamente dos workshops diferentes", async () => {
    const ws1 = `ws-madrid-${Date.now()}`;
    const ws2 = `ws-barcelona-${Date.now()}`;

    await dbService.ensureHousesInitialized(ws1);
    await dbService.ensureHousesInitialized(ws2);

    // Asignar 4 alumnos a ws1
    for (let i = 0; i < 4; i++) {
      const cand = await dbService.getCandidateHouse(ws1);
      await dbService.assignStudentToBalancedHouse(ws1, `student_ws1_${i}`, cand);
    }

    const stats1 = await dbService.getHouseStats(ws1);
    const totalWs1 = Object.values(stats1).reduce((a, b) => a + b, 0);
    expect(totalWs1).toBe(4);

    // ws2 debe seguir teniendo 0 alumnos
    const stats2 = await dbService.getHouseStats(ws2);
    const totalWs2 = Object.values(stats2).reduce((a, b) => a + b, 0);
    expect(totalWs2).toBe(0);
  });

  it("debe resolver el workshopId desde ACTIVE_WORKSHOP_ID o usar fallback", async () => {
    const originalEnv = process.env.ACTIVE_WORKSHOP_ID;

    try {
      process.env.ACTIVE_WORKSHOP_ID = "edicion-especial-hogwarts";
      const resolved = await dbService.getEffectiveWorkshopId();
      expect(resolved).toBe("edicion-especial-hogwarts");

      delete process.env.ACTIVE_WORKSHOP_ID;
      const defaultResolved = await dbService.getEffectiveWorkshopId();
      expect(typeof defaultResolved).toBe("string");
      expect(defaultResolved.length).toBeGreaterThan(0);
    } finally {
      if (originalEnv !== undefined) {
        process.env.ACTIVE_WORKSHOP_ID = originalEnv;
      } else {
        delete process.env.ACTIVE_WORKSHOP_ID;
      }
    }
  });
});
