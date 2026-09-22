import { Firestore, FieldValue, type DocumentReference, type DocumentSnapshot, type Transaction } from "@google-cloud/firestore";

export const HOUSES = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"] as const;
export type HouseId = typeof HOUSES[number];
export type HouseCounts = Record<HouseId, number>;

export const HOUSE_NAMES: Record<HouseId, string> = {
  gryffindor: "Gryffindor",
  slytherin: "Slytherin",
  ravenclaw: "Ravenclaw",
  hufflepuff: "Hufflepuff",
};

export interface HouseDoc {
  members_count: number;
  score: number;
  updated_at?: FirebaseFirestore.FieldValue | Date | string;
}

export interface StudentDoc {
  house: HouseId;
  assigned_at: FirebaseFirestore.FieldValue | Date | string;
  justification: string;
}

export interface AssignmentResult {
  studentId: string;
  house: HouseId;
  houseDisplayName: string;
  isFallbackDb?: boolean;
}

const MAX_HOUSE_DIFF = 2;
const DEFAULT_WORKSHOP_ID = "morcillaconf-2026";
const MAX_TRANSACTION_RETRIES = 7;
const FIRESTORE_MAX_ATTEMPTS = 15;

export function createEmptyCounts(): HouseCounts {
  return { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
}

export function getEligibleHouses(counts: HouseCounts): HouseId[] {
  const eligible = HOUSES.filter((house) => {
    const simulated = { ...counts, [house]: counts[house] + 1 };
    const values = Object.values(simulated);
    return Math.max(...values) - Math.min(...values) <= MAX_HOUSE_DIFF;
  });
  return eligible.length > 0 ? eligible : [...HOUSES];
}

export function selectBalancedHouse(counts: HouseCounts, preferredHouse?: HouseId): HouseId {
  const eligible = getEligibleHouses(counts);
  if (preferredHouse && eligible.includes(preferredHouse)) {
    return preferredHouse;
  }
  const minCount = Math.min(...eligible.map((h) => counts[h]));
  const lowestHouses = eligible.filter((h) => counts[h] === minCount);
  return lowestHouses[Math.floor(Math.random() * lowestHouses.length)];
}

class InMemoryDb {
  private workshops = new Map<string, {
    houses: Map<HouseId, HouseDoc>;
    students: Map<string, StudentDoc>;
  }>();

  private getWorkshop(workshopId: string) {
    let ws = this.workshops.get(workshopId);
    if (!ws) {
      const houses = new Map<HouseId, HouseDoc>();
      for (const house of HOUSES) {
        houses.set(house, { members_count: 0, score: 0, updated_at: new Date() });
      }
      ws = { houses, students: new Map() };
      this.workshops.set(workshopId, ws);
    }
    return ws;
  }

  async getGlobalWorkshopId(): Promise<string | null> {
    return DEFAULT_WORKSHOP_ID;
  }

  async ensureHousesInitialized(workshopId: string): Promise<void> {
    this.getWorkshop(workshopId);
  }

  async getCandidateHouse(workshopId: string): Promise<HouseId> {
    const counts = await this.getHouseStats(workshopId);
    return selectBalancedHouse(counts);
  }

  async assignStudentToBalancedHouse(
    workshopId: string,
    studentId: string,
    preferredHouse?: HouseId
  ): Promise<AssignmentResult> {
    const ws = this.getWorkshop(workshopId);
    const counts = await this.getHouseStats(workshopId);
    const house = selectBalancedHouse(counts, preferredHouse);

    const houseDoc = ws.houses.get(house)!;
    houseDoc.members_count += 1;
    houseDoc.updated_at = new Date();

    ws.students.set(studentId, { house, assigned_at: new Date(), justification: "" });

    return {
      studentId,
      house,
      houseDisplayName: HOUSE_NAMES[house],
      isFallbackDb: true,
    };
  }

  async updateStudentJustification(workshopId: string, studentId: string, justification: string): Promise<void> {
    const student = this.getWorkshop(workshopId).students.get(studentId);
    if (student) {
      student.justification = justification;
    }
  }

  async getStudent(workshopId: string, studentId: string): Promise<StudentDoc | null> {
    return this.getWorkshop(workshopId).students.get(studentId) || null;
  }

  async getHouseStats(workshopId: string): Promise<HouseCounts> {
    const ws = this.getWorkshop(workshopId);
    const counts = createEmptyCounts();
    for (const h of HOUSES) {
      counts[h] = ws.houses.get(h)?.members_count ?? 0;
    }
    return counts;
  }
}

class DatabaseService {
  private firestore: Firestore | null = null;
  private inMemoryFallback = new InMemoryDb();
  private isUsingFallback = false;

  constructor() {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || "escuela-de-hechiceria";
      this.firestore = new Firestore({ projectId });
    } catch {
      this.isUsingFallback = true;
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.isUsingFallback || !this.firestore) return false;
    try {
      await this.firestore.collection("workshops").limit(1).get();
      this.isUsingFallback = false;
      return true;
    } catch {
      this.isUsingFallback = true;
      return false;
    }
  }

  async getEffectiveWorkshopId(): Promise<string> {
    const envWorkshop = process.env.ACTIVE_WORKSHOP_ID?.trim();
    if (envWorkshop) return envWorkshop;

    if (!this.isUsingFallback && this.firestore) {
      try {
        const configDoc = await this.firestore.doc("config/global").get();
        const activeId = configDoc.data()?.active_workshop_id;
        if (activeId) return activeId;
      } catch {
        // Fallback to default
      }
    }

    return DEFAULT_WORKSHOP_ID;
  }

  async ensureHousesInitialized(workshopId: string): Promise<void> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.ensureHousesInitialized(workshopId);
    }

    try {
      const batch = this.firestore.batch();
      let hasUpdates = false;

      for (const houseId of HOUSES) {
        const houseRef = this.firestore.doc(`workshops/${workshopId}/houses/${houseId}`);
        const snap = await houseRef.get();
        if (!snap.exists) {
          batch.set(houseRef, {
            members_count: 0,
            score: 0,
            updated_at: FieldValue.serverTimestamp(),
          });
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        await batch.commit();
      }
    } catch {
      this.isUsingFallback = true;
      return this.inMemoryFallback.ensureHousesInitialized(workshopId);
    }
  }

  async getCandidateHouse(workshopId: string): Promise<HouseId> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.getCandidateHouse(workshopId);
    }

    try {
      const counts = await this.getHouseStats(workshopId);
      return selectBalancedHouse(counts);
    } catch {
      return this.inMemoryFallback.getCandidateHouse(workshopId);
    }
  }

  private readCountsFromSnaps(
    snaps: DocumentSnapshot[],
    houseRefs: DocumentReference[],
    transaction: Transaction
  ): HouseCounts {
    const counts = createEmptyCounts();
    snaps.forEach((snap, idx) => {
      const houseId = HOUSES[idx];
      if (snap.exists) {
        counts[houseId] = snap.data()?.members_count ?? 0;
      } else {
        transaction.set(houseRefs[idx], {
          members_count: 0,
          score: 0,
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    });
    return counts;
  }

  private async executeAssignmentTransaction(
    workshopId: string,
    studentId: string,
    preferredHouse?: HouseId
  ): Promise<AssignmentResult> {
    const db = this.firestore!;
    return db.runTransaction(
      async (transaction) => {
        const houseRefs = HOUSES.map((id) => db.doc(`workshops/${workshopId}/houses/${id}`));
        const snaps = await transaction.getAll(...houseRefs);
        const counts = this.readCountsFromSnaps(snaps, houseRefs, transaction);

        const chosenHouse = selectBalancedHouse(counts, preferredHouse);
        const chosenRef = db.doc(`workshops/${workshopId}/houses/${chosenHouse}`);
        const studentRef = db.doc(`workshops/${workshopId}/students/${studentId}`);

        transaction.update(chosenRef, {
          members_count: FieldValue.increment(1),
          updated_at: FieldValue.serverTimestamp(),
        });
        transaction.set(studentRef, {
          house: chosenHouse,
          assigned_at: FieldValue.serverTimestamp(),
          justification: "",
        });

        return {
          studentId,
          house: chosenHouse,
          houseDisplayName: HOUSE_NAMES[chosenHouse],
          isFallbackDb: false,
        };
      },
      { maxAttempts: FIRESTORE_MAX_ATTEMPTS }
    );
  }

  async assignStudentToBalancedHouse(
    workshopId: string,
    studentId: string,
    preferredHouse?: HouseId
  ): Promise<AssignmentResult> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.assignStudentToBalancedHouse(workshopId, studentId, preferredHouse);
    }

    for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt++) {
      try {
        return await this.executeAssignmentTransaction(workshopId, studentId, preferredHouse);
      } catch (err: any) {
        const isContention = err.code === 10 || err.message?.includes("ABORTED");
        if (isContention && attempt < MAX_TRANSACTION_RETRIES - 1) {
          const jitter = Math.random() * 80 + 30;
          const delay = Math.min(1200, Math.pow(1.6, attempt) * 50 + jitter);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        const isFatal = err.code === 7 || err.code === 5 || err.code === 16;
        if (isFatal) this.isUsingFallback = true;
        return this.inMemoryFallback.assignStudentToBalancedHouse(workshopId, studentId, preferredHouse);
      }
    }

    return this.inMemoryFallback.assignStudentToBalancedHouse(workshopId, studentId, preferredHouse);
  }

  async updateStudentJustification(workshopId: string, studentId: string, justification: string): Promise<void> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.updateStudentJustification(workshopId, studentId, justification);
    }

    try {
      const studentRef = this.firestore.doc(`workshops/${workshopId}/students/${studentId}`);
      await studentRef.update({ justification });
    } catch {
      return this.inMemoryFallback.updateStudentJustification(workshopId, studentId, justification);
    }
  }

  async getStudent(workshopId: string, studentId: string): Promise<StudentDoc | null> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.getStudent(workshopId, studentId);
    }

    try {
      const studentRef = this.firestore.doc(`workshops/${workshopId}/students/${studentId}`);
      const snap = await studentRef.get();
      return snap.exists ? (snap.data() as StudentDoc) : null;
    } catch {
      return this.inMemoryFallback.getStudent(workshopId, studentId);
    }
  }

  async getHouseStats(workshopId: string): Promise<HouseCounts> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.getHouseStats(workshopId);
    }

    try {
      const houseRefs = HOUSES.map((id) => this.firestore!.doc(`workshops/${workshopId}/houses/${id}`));
      const snaps = await this.firestore.getAll(...houseRefs);
      const counts = createEmptyCounts();

      snaps.forEach((snap, idx) => {
        if (snap.exists) {
          counts[HOUSES[idx]] = snap.data()?.members_count ?? 0;
        }
      });
      return counts;
    } catch {
      return this.inMemoryFallback.getHouseStats(workshopId);
    }
  }
}

export const dbService = new DatabaseService();
