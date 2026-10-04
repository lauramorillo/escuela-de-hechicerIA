import fs from "fs";
import { Firestore, FieldValue, type DocumentReference, type DocumentSnapshot, type Transaction } from "@google-cloud/firestore";

const SHARED_LOCAL_DB_FILE = "/tmp/taller_escuela_hechiceria_db.json";

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
  score?: number;
  last_activity?: FirebaseFirestore.FieldValue | Date | string;
}

export interface SubmissionDoc {
  class_id: string;
  answer?: string;
  grade: string;
  grade_label: string;
  points: number;
  bonus_points?: number;
  total_awarded_points?: number;
  first_house_bonus?: boolean;
  feedback: string;
  advice: string;
  audio_phrase?: string;
  audio?: string | null;
  test_results?: any;
  evaluated_at?: FirebaseFirestore.FieldValue | Date | string;
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
    submissions: Map<string, Map<string, SubmissionDoc>>;
  }>();

  private getWorkshop(workshopId: string) {
    let ws = this.workshops.get(workshopId);
    if (!ws) {
      const houses = new Map<HouseId, HouseDoc>();
      for (const house of HOUSES) {
        houses.set(house, { members_count: 0, score: 0, updated_at: new Date() });
      }
      ws = { houses, students: new Map(), submissions: new Map() };
      this.workshops.set(workshopId, ws);
    }
    return ws;
  }

  private globalPasskey: string | null = "alohomora";

  async getGlobalWorkshopId(): Promise<string | null> {
    return DEFAULT_WORKSHOP_ID;
  }

  async getWorkshopPasskey(): Promise<string | null> {
    return this.globalPasskey;
  }

  async setWorkshopPasskey(passkey: string | null): Promise<void> {
    this.globalPasskey = passkey ? passkey.trim() : null;
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

  async removeStudent(workshopId: string, studentId: string): Promise<boolean> {
    const ws = this.getWorkshop(workshopId);
    const student = ws.students.get(studentId);
    if (!student) return false;

    const houseDoc = ws.houses.get(student.house);
    if (houseDoc && houseDoc.members_count > 0) {
      houseDoc.members_count -= 1;
      houseDoc.updated_at = new Date();
    }
    ws.students.delete(studentId);
    return true;
  }

  async getHouseStats(workshopId: string): Promise<HouseCounts> {
    const ws = this.getWorkshop(workshopId);
    const counts = createEmptyCounts();
    for (const h of HOUSES) {
      counts[h] = ws.houses.get(h)?.members_count ?? 0;
    }
    return counts;
  }

  async getHouseScores(workshopId: string): Promise<Record<HouseId, number>> {
    const ws = this.getWorkshop(workshopId);
    const scores: Record<HouseId, number> = { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
    for (const h of HOUSES) {
      scores[h] = ws.houses.get(h)?.score ?? 0;
    }

    try {
      if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        const fileScores = parsed.scores?.[workshopId];
        if (fileScores) {
          for (const h of HOUSES) {
            scores[h] = Math.max(scores[h], fileScores[h] || 0);
          }
        }
      }
    } catch {}

    return scores;
  }

  async saveSubmission(workshopId: string, studentId: string, submission: SubmissionDoc): Promise<void> {
    const ws = this.getWorkshop(workshopId);
    if (!ws.submissions.has(studentId)) {
      ws.submissions.set(studentId, new Map());
    }
    ws.submissions.get(studentId)!.set(submission.class_id, {
      ...submission,
      evaluated_at: submission.evaluated_at || new Date(),
    });

    try {
      let currentData: any = {};
      if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
        currentData = JSON.parse(fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8"));
      }
      if (!currentData.submissions) currentData.submissions = {};
      if (!currentData.submissions[workshopId]) currentData.submissions[workshopId] = {};
      if (!currentData.submissions[workshopId][studentId]) currentData.submissions[workshopId][studentId] = {};
      currentData.submissions[workshopId][studentId][submission.class_id] = submission;
      fs.writeFileSync(SHARED_LOCAL_DB_FILE, JSON.stringify(currentData, null, 2), "utf-8");
    } catch {}
  }

  async getSubmissions(workshopId: string, studentId: string): Promise<Record<string, SubmissionDoc>> {
    const ws = this.getWorkshop(workshopId);
    let studentSubs = ws.submissions.get(studentId);

    if (!studentSubs || studentSubs.size === 0) {
      try {
        if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
          const raw = fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          const fromFile = parsed.submissions?.[workshopId]?.[studentId];
          if (fromFile) {
            if (!ws.submissions.has(studentId)) {
              ws.submissions.set(studentId, new Map());
            }
            studentSubs = ws.submissions.get(studentId)!;
            for (const [cId, subData] of Object.entries(fromFile)) {
              studentSubs.set(cId, subData as SubmissionDoc);
            }
          }
        }
      } catch {}
    }

    const result: Record<string, SubmissionDoc> = {};
    if (studentSubs) {
      studentSubs.forEach((sub, classId) => {
        result[classId] = sub;
      });
    }
    return result;
  }

  async addHousePoints(workshopId: string, houseId: HouseId, points: number): Promise<number> {
    const ws = this.getWorkshop(workshopId);
    const houseDoc = ws.houses.get(houseId);
    let newScore = points;
    if (houseDoc) {
      houseDoc.score = (houseDoc.score || 0) + points;
      houseDoc.updated_at = new Date();
      newScore = houseDoc.score;
    }

    try {
      let currentData: any = {};
      if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
        currentData = JSON.parse(fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8"));
      }
      if (!currentData.scores) currentData.scores = {};
      if (!currentData.scores[workshopId]) {
        currentData.scores[workshopId] = { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
      }
      currentData.scores[workshopId][houseId] = (currentData.scores[workshopId][houseId] || 0) + points;
      fs.writeFileSync(SHARED_LOCAL_DB_FILE, JSON.stringify(currentData, null, 2), "utf-8");
    } catch {}

    return newScore;
  }

  async deleteWorkshop(workshopId: string): Promise<void> {
    this.workshops.delete(workshopId);
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
    if (!this.isUsingFallback && this.firestore) {
      try {
        const configRef = this.firestore.doc("config/global");
        const configDoc = await configRef.get();
        if (configDoc.exists) {
          const activeId = configDoc.data()?.active_workshop_id?.trim();
          if (activeId) return activeId;
        } else {
          await configRef.set({
            active_workshop_id: DEFAULT_WORKSHOP_ID,
            updated_at: FieldValue.serverTimestamp(),
          });
          return DEFAULT_WORKSHOP_ID;
        }
      } catch (err) {
        console.warn("Error consultando config/global en Firestore, usando fallback:", err);
      }
    }

    const envWorkshop = process.env.ACTIVE_WORKSHOP_ID?.trim();
    if (envWorkshop) return envWorkshop;

    return DEFAULT_WORKSHOP_ID;
  }

  async setActiveWorkshopId(workshopId: string): Promise<void> {
    if (!this.isUsingFallback && this.firestore) {
      await this.firestore.doc("config/global").set(
        {
          active_workshop_id: workshopId.trim(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  async getWorkshopPasskey(): Promise<string | null> {
    if (!this.isUsingFallback && this.firestore) {
      try {
        const configDoc = await this.firestore.doc("config/global").get();
        if (configDoc.exists) {
          const data = configDoc.data();
          if (data && "passkey" in data) {
            const pk = typeof data.passkey === "string" ? data.passkey.trim() : "";
            return pk.length > 0 ? pk : null;
          }
          // Si el documento existe pero aún no tiene passkey, inicializarlo con 'alohomora'
          await this.firestore.doc("config/global").set(
            { passkey: "alohomora", updated_at: FieldValue.serverTimestamp() },
            { merge: true }
          );
          return "alohomora";
        }
      } catch (err) {
        console.warn("Error leyendo passkey de Firestore, usando fallback:", err);
      }
    }
    return this.inMemoryFallback.getWorkshopPasskey();
  }

  async setWorkshopPasskey(passkey: string): Promise<void> {
    const trimmed = passkey.trim();
    if (!this.isUsingFallback && this.firestore) {
      await this.firestore.doc("config/global").set(
        {
          passkey: trimmed,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await this.inMemoryFallback.setWorkshopPasskey(trimmed);
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
    transaction: Transaction,
    skipHouseId?: HouseId
  ): HouseCounts {
    const counts = createEmptyCounts();
    snaps.forEach((snap, idx) => {
      const houseId = HOUSES[idx];
      if (snap.exists) {
        counts[houseId] = snap.data()?.members_count ?? 0;
      } else if (houseId !== skipHouseId) {
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

        const chosenSnap = snaps[HOUSES.indexOf(chosenHouse)];
        if (chosenSnap && chosenSnap.exists) {
          transaction.update(chosenRef, {
            members_count: FieldValue.increment(1),
            updated_at: FieldValue.serverTimestamp(),
          });
        } else {
          transaction.set(chosenRef, {
            members_count: 1,
            score: 0,
            updated_at: FieldValue.serverTimestamp(),
          });
        }

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

  async removeStudent(workshopId: string, studentId: string): Promise<boolean> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.removeStudent(workshopId, studentId);
    }

    try {
      const db = this.firestore;
      return await db.runTransaction(
        async (transaction) => {
          const studentRef = db.doc(`workshops/${workshopId}/students/${studentId}`);
          const studentSnap = await transaction.get(studentRef);

          if (!studentSnap.exists) {
            return false;
          }

          const studentData = studentSnap.data() as StudentDoc;
          const houseId = studentData.house;
          const houseRef = db.doc(`workshops/${workshopId}/houses/${houseId}`);
          const houseSnap = await transaction.get(houseRef);

          if (houseSnap.exists) {
            const currentCount = houseSnap.data()?.members_count ?? 0;
            transaction.update(houseRef, {
              members_count: Math.max(0, currentCount - 1),
              updated_at: FieldValue.serverTimestamp(),
            });
          }

          transaction.delete(studentRef);
          return true;
        },
        { maxAttempts: FIRESTORE_MAX_ATTEMPTS }
      );
    } catch {
      return this.inMemoryFallback.removeStudent(workshopId, studentId);
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
      let anyMissing = false;

      snaps.forEach((snap, idx) => {
        if (snap.exists) {
          counts[HOUSES[idx]] = snap.data()?.members_count ?? 0;
        } else {
          anyMissing = true;
        }
      });

      if (anyMissing) {
        this.ensureHousesInitialized(workshopId).catch(() => {});
      }

      return counts;
    } catch {
      return this.inMemoryFallback.getHouseStats(workshopId);
    }
  }

  async deleteWorkshop(workshopId: string): Promise<void> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.deleteWorkshop(workshopId);
    }

    try {
      const docRef = this.firestore.doc(`workshops/${workshopId}`);
      await this.firestore.recursiveDelete(docRef);
    } catch (err) {
      console.error(`Error al eliminar workshop ${workshopId}:`, err);
      return this.inMemoryFallback.deleteWorkshop(workshopId);
    }
  }

  async cleanAllTestWorkshops(): Promise<string[]> {
    if (this.isUsingFallback || !this.firestore) return [];
    try {
      const docRefs = await this.firestore.collection("workshops").listDocuments();
      const deleted: string[] = [];
      for (const docRef of docRefs) {
        if (docRef.id.startsWith("test-") || docRef.id.startsWith("ws-")) {
          await this.firestore.recursiveDelete(docRef);
          deleted.push(docRef.id);
        }
      }
      return deleted;
    } catch (err) {
      console.error("Error al limpiar workshops de test:", err);
      return [];
    }
  }

  async getHouseScores(workshopId: string): Promise<Record<HouseId, number>> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.getHouseScores(workshopId);
    }
    try {
      const houseRefs = HOUSES.map((id) => this.firestore!.doc(`workshops/${workshopId}/houses/${id}`));
      const snaps = await this.firestore.getAll(...houseRefs);
      const scores: Record<HouseId, number> = { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
      snaps.forEach((snap, idx) => {
        if (snap.exists) {
          scores[HOUSES[idx]] = snap.data()?.score ?? 0;
        }
      });
      return scores;
    } catch {
      return this.inMemoryFallback.getHouseScores(workshopId);
    }
  }

  async saveSubmission(workshopId: string, studentId: string, submission: SubmissionDoc): Promise<void> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.saveSubmission(workshopId, studentId, submission);
    }
    try {
      const subRef = this.firestore.doc(`workshops/${workshopId}/students/${studentId}/submissions/${submission.class_id}`);
      await subRef.set({
        ...submission,
        evaluated_at: FieldValue.serverTimestamp(),
      });

      // Actualizar el expediente del alumno con su puntuación acumulada
      const studentRef = this.firestore.doc(`workshops/${workshopId}/students/${studentId}`);
      const pointsToAdd = submission.total_awarded_points ?? submission.points ?? 0;
      await studentRef.set(
        {
          score: FieldValue.increment(pointsToAdd),
          last_activity: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      return this.inMemoryFallback.saveSubmission(workshopId, studentId, submission);
    }
  }

  async getSubmissions(workshopId: string, studentId: string): Promise<Record<string, SubmissionDoc>> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.getSubmissions(workshopId, studentId);
    }
    try {
      const colRef = this.firestore.collection(`workshops/${workshopId}/students/${studentId}/submissions`);
      const snap = await colRef.get();
      const result: Record<string, SubmissionDoc> = {};
      snap.forEach((doc) => {
        result[doc.id] = doc.data() as SubmissionDoc;
      });
      return result;
    } catch {
      return this.inMemoryFallback.getSubmissions(workshopId, studentId);
    }
  }

  async addHousePoints(workshopId: string, houseId: HouseId, points: number): Promise<number> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.addHousePoints(workshopId, houseId, points);
    }
    try {
      const houseRef = this.firestore.doc(`workshops/${workshopId}/houses/${houseId}`);
      return await this.firestore.runTransaction(
        async (transaction) => {
          const snap = await transaction.get(houseRef);
          let currentScore = 0;
          let currentMembers = 0;
          if (snap.exists) {
            currentScore = snap.data()?.score ?? 0;
            currentMembers = snap.data()?.members_count ?? 0;
          }
          const newScore = currentScore + points;
          transaction.set(
            houseRef,
            {
              score: newScore,
              members_count: currentMembers,
              updated_at: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          return newScore;
        },
        { maxAttempts: FIRESTORE_MAX_ATTEMPTS }
      );
    } catch {
      return this.inMemoryFallback.addHousePoints(workshopId, houseId, points);
    }
  }
}

export const dbService = new DatabaseService();

