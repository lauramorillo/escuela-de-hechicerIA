import { describe, it, expect, afterAll } from "vitest";
import { dbService } from "../db.ts";

describe("Multitenancy por Edición (Workshop Isolation)", () => {
  const createdWorkshops: string[] = [];
  function trackWorkshop(id: string): string {
    createdWorkshops.push(id);
    return id;
  }

  afterAll(async () => {
    for (const ws of createdWorkshops) {
      await dbService.deleteWorkshop(ws);
    }
  });

  it("debe aislar completamente dos workshops diferentes", async () => {
    const ws1 = trackWorkshop(`ws-madrid-${Date.now()}`);
    const ws2 = trackWorkshop(`ws-barcelona-${Date.now()}`);

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

  it("debe resolver el workshopId dinámicamente desde config/global en Firestore", async () => {
    const originalId = await dbService.getEffectiveWorkshopId();
    expect(typeof originalId).toBe("string");
    expect(originalId.length).toBeGreaterThan(0);

    const testCustomWorkshop = `ws-dynamic-${Date.now()}`;
    await dbService.setActiveWorkshopId(testCustomWorkshop);

    const resolved = await dbService.getEffectiveWorkshopId();
    expect(resolved).toBe(testCustomWorkshop);

    // Restaurar workshop original
    await dbService.setActiveWorkshopId(originalId);
    const restored = await dbService.getEffectiveWorkshopId();
    expect(restored).toBe(originalId);
  });
});
