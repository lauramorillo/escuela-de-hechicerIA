import fs from "fs";
import path from "path";
import { Firestore, FieldValue, type DocumentReference, type DocumentSnapshot, type Transaction } from "@google-cloud/firestore";

const SHARED_LOCAL_DB_FILE = "/tmp/taller_escuela_hechiceria_db.json";
const SHARED_LOCAL_DB_LOCK = "/tmp/taller_escuela_hechiceria_db.lock";

/**
 * Adquiere un bloqueo de archivo exclusivo usando mkdir atómico (estándar POSIX).
 * Garantiza sincronización segura entre múltiples procesos y contenedores Docker que comparten /tmp.
 */
async function withFileLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const maxWaitMs = 10000;
  const start = Date.now();
  let acquired = false;

  while (!acquired) {
    try {
      fs.mkdirSync(SHARED_LOCAL_DB_LOCK);
      acquired = true;
    } catch (err: any) {
      if (err.code === "EEXIST") {
        try {
          const stats = fs.statSync(SHARED_LOCAL_DB_LOCK);
          if (Date.now() - stats.mtimeMs > 10000) {
            fs.rmdirSync(SHARED_LOCAL_DB_LOCK);
          }
        } catch {}

        if (Date.now() - start > maxWaitMs) {
          try {
            fs.rmdirSync(SHARED_LOCAL_DB_LOCK);
          } catch {}
          fs.mkdirSync(SHARED_LOCAL_DB_LOCK);
          acquired = true;
          break;
        }

        const jitter = Math.floor(Math.random() * 20) + 15;
        await new Promise((resolve) => setTimeout(resolve, jitter));
      } else {
        throw err;
      }
    }
  }

  try {
    return await fn();
  } finally {
    try {
      fs.rmdirSync(SHARED_LOCAL_DB_LOCK);
    } catch {}
  }
}

function writeSharedDbAtomic(data: any) {
  const tmpPath = `${SHARED_LOCAL_DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpPath, SHARED_LOCAL_DB_FILE);
}

export function computeHouseScoresFromData(
  students: Record<string, { house: string; score?: number }>,
  submissions: Record<string, Record<string, { total_awarded_points?: number; points?: number; house?: string }>>
): Record<HouseId, number> {
  const scores: Record<HouseId, number> = { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
  const studentHouses: Record<string, HouseId> = {};

  for (const [sId, sDoc] of Object.entries(students || {})) {
    if (sDoc?.house) {
      studentHouses[sId] = sDoc.house.toLowerCase() as HouseId;
    }
  }

  for (const [sId, classMap] of Object.entries(submissions || {})) {
    let studentHouse = studentHouses[sId];
    for (const [_, sub] of Object.entries(classMap || {})) {
      if (!studentHouse && sub?.house) {
        studentHouse = sub.house.toLowerCase() as HouseId;
        studentHouses[sId] = studentHouse;
      }
      const pts = sub?.total_awarded_points ?? sub?.points ?? 0;
      if (studentHouse && scores[studentHouse] !== undefined) {
        scores[studentHouse] += pts;
      }
    }
  }

  return scores;
}

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
  defense_unlocked?: boolean;
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
  attempt_count?: number;
  retry_penalty?: number;
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

    ws.students.set(studentId, { house, assigned_at: new Date(), justification: "", score: 0 });

    try {
      await withFileLock(() => {
        let currentData: any = {};
        if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
          try {
            currentData = JSON.parse(fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8"));
          } catch {}
        }
        if (!currentData.students) currentData.students = {};
        if (!currentData.students[workshopId]) currentData.students[workshopId] = {};
        currentData.students[workshopId][studentId] = { house, score: 0 };
        writeSharedDbAtomic(currentData);
      });
    } catch {}

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

  async setStudentDefenseUnlocked(workshopId: string, studentId: string): Promise<void> {
    const ws = this.getWorkshop(workshopId);
    let student = ws.students.get(studentId);
    if (!student) {
      student = { house: "gryffindor", assigned_at: new Date(), justification: "", score: 0 };
      ws.students.set(studentId, student);
    }
    student.defense_unlocked = true;

    try {
      await withFileLock(() => {
        let currentData: any = {};
        if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
          try {
            currentData = JSON.parse(fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8"));
          } catch {}
        }
        if (!currentData.students) currentData.students = {};
        if (!currentData.students[workshopId]) currentData.students[workshopId] = {};
        if (!currentData.students[workshopId][studentId]) {
          currentData.students[workshopId][studentId] = { house: student!.house, score: 0 };
        }
        currentData.students[workshopId][studentId].defense_unlocked = true;
        writeSharedDbAtomic(currentData);
      });
    } catch {}
  }

  async getStudent(workshopId: string, studentId: string): Promise<StudentDoc | null> {
    const ws = this.getWorkshop(workshopId);
    const student = ws.students.get(studentId) || null;
    if (student && student.defense_unlocked === undefined) {
      try {
        if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
          const raw = fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          const fromFile = parsed.students?.[workshopId]?.[studentId];
          if (fromFile && fromFile.defense_unlocked !== undefined) {
            student.defense_unlocked = Boolean(fromFile.defense_unlocked);
          }
        }
      } catch {}
    }
    return student;
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

    try {
      await withFileLock(() => {
        if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
          const raw = fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed.students?.[workshopId]?.[studentId]) {
            delete parsed.students[workshopId][studentId];
            writeSharedDbAtomic(parsed);
          }
        }
      });
    } catch {}

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
        await withFileLock(() => {
          const raw = fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          const hasSubmissions = parsed.submissions?.[workshopId] && Object.keys(parsed.submissions[workshopId]).length > 0;

          if (hasSubmissions) {
            const computedScores = computeHouseScoresFromData(
              parsed.students?.[workshopId] || {},
              parsed.submissions[workshopId]
            );
            for (const h of HOUSES) {
              scores[h] = computedScores[h] ?? 0;
              const houseDoc = ws.houses.get(h);
              if (houseDoc) {
                houseDoc.score = scores[h];
              }
            }
          } else if (parsed.scores?.[workshopId]) {
            for (const h of HOUSES) {
              scores[h] = parsed.scores[workshopId][h] ?? 0;
              const houseDoc = ws.houses.get(h);
              if (houseDoc) {
                houseDoc.score = scores[h];
              }
            }
          }
        });
      }
    } catch {}

    return scores;
  }

  async saveSubmission(workshopId: string, studentId: string, submission: SubmissionDoc, _pointsDelta = 0): Promise<void> {
    const ws = this.getWorkshop(workshopId);
    if (!ws.submissions.has(studentId)) {
      ws.submissions.set(studentId, new Map());
    }
    ws.submissions.get(studentId)!.set(submission.class_id, {
      ...submission,
      evaluated_at: submission.evaluated_at || new Date(),
    });

    try {
      await withFileLock(() => {
        let currentData: any = {};
        if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
          try {
            currentData = JSON.parse(fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8"));
          } catch {}
        }
        if (!currentData.submissions) currentData.submissions = {};
        if (!currentData.submissions[workshopId]) currentData.submissions[workshopId] = {};
        if (!currentData.submissions[workshopId][studentId]) currentData.submissions[workshopId][studentId] = {};

        const existingHouse = ws.students.get(studentId)?.house || currentData.students?.[workshopId]?.[studentId]?.house;
        const subHouse = (submission as any).house || existingHouse || "gryffindor";

        currentData.submissions[workshopId][studentId][submission.class_id] = {
          ...submission,
          house: subHouse,
        };

        if (!currentData.students) currentData.students = {};
        if (!currentData.students[workshopId]) currentData.students[workshopId] = {};
        currentData.students[workshopId][studentId] = {
          house: subHouse,
        };

        // Recalcular puntuación total de las casas como la suma de los puntos de sus alumnos
        if (!currentData.scores) currentData.scores = {};
        currentData.scores[workshopId] = computeHouseScoresFromData(
          currentData.students[workshopId],
          currentData.submissions[workshopId]
        );

        writeSharedDbAtomic(currentData);

        // Sincronizar en memoria
        for (const h of HOUSES) {
          const houseDoc = ws.houses.get(h);
          if (houseDoc) {
            houseDoc.score = currentData.scores[workshopId][h] ?? 0;
          }
        }
      });
    } catch {}
  }

  async getSubmissions(workshopId: string, studentId: string): Promise<Record<string, SubmissionDoc>> {
    const ws = this.getWorkshop(workshopId);
    let studentSubs = ws.submissions.get(studentId);

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
      await withFileLock(() => {
        let currentData: any = {};
        if (fs.existsSync(SHARED_LOCAL_DB_FILE)) {
          try {
            currentData = JSON.parse(fs.readFileSync(SHARED_LOCAL_DB_FILE, "utf-8"));
          } catch {}
        }
        if (!currentData.scores) currentData.scores = {};
        if (!currentData.scores[workshopId]) {
          currentData.scores[workshopId] = { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
        }
        currentData.scores[workshopId][houseId] = (currentData.scores[workshopId][houseId] || 0) + points;
        writeSharedDbAtomic(currentData);
      });
    } catch {}

    return newScore;
  }

  async deleteWorkshop(workshopId: string): Promise<void> {
    this.workshops.delete(workshopId);
  }
}

export function hasGcpCredentials(): boolean {
  if (process.env.USE_FIRESTORE === "false" || process.env.USE_LOCAL_FALLBACK === "true") {
    return false;
  }
  if ((process.env.NODE_ENV === "test" || process.env.VITEST) && process.env.USE_REAL_FIRESTORE !== "true") {
    return false;
  }
  if (process.env.K_SERVICE || process.env.CLOUD_RUN_JOB || process.env.GAE_SERVICE) {
    return true;
  }
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    return true;
  }
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (home) {
    const macAdc = path.join(home, "Library/Application Support/gcloud/application_default_credentials.json");
    const linuxAdc = path.join(home, ".config/gcloud/application_default_credentials.json");
    if (fs.existsSync(macAdc) || fs.existsSync(linuxAdc)) {
      return true;
    }
  }
  if (process.env.USE_REAL_FIRESTORE === "true") {
    return true;
  }
  return false;
}

class DatabaseService {
  private firestore: Firestore | null = null;
  private inMemoryFallback = new InMemoryDb();
  private isUsingFallback = false;
  private memoryActiveWorkshopId: string | null = null;

  constructor() {
    if (!hasGcpCredentials()) {
      this.isUsingFallback = true;
      return;
    }

    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || "escuela-de-hechiceria";
      this.firestore = new Firestore({ projectId, ignoreUndefinedProperties: true });
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
    } catch (err) {
      console.warn("⚠️ No se pudo conectar a Firestore, cambiando a almacenamiento local:", err);
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

    if (this.memoryActiveWorkshopId) return this.memoryActiveWorkshopId;

    const envWorkshop = process.env.ACTIVE_WORKSHOP_ID?.trim();
    if (envWorkshop) return envWorkshop;

    return this.isUsingFallback ? "dev-test" : DEFAULT_WORKSHOP_ID;
  }

  async setActiveWorkshopId(workshopId: string): Promise<void> {
    this.memoryActiveWorkshopId = workshopId.trim();
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

  async setStudentDefenseUnlocked(workshopId: string, studentId: string): Promise<void> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.setStudentDefenseUnlocked(workshopId, studentId);
    }

    try {
      const studentRef = this.firestore.doc(`workshops/${workshopId}/students/${studentId}`);
      await studentRef.set({ defense_unlocked: true }, { merge: true });
    } catch {
      return this.inMemoryFallback.setStudentDefenseUnlocked(workshopId, studentId);
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
    await this.inMemoryFallback.deleteWorkshop(workshopId);

    if (this.firestore) {
      try {
        const docRef = this.firestore.doc(`workshops/${workshopId}`);
        await this.firestore.recursiveDelete(docRef);
      } catch (err) {
        console.error(`Error al eliminar workshop ${workshopId} de Firestore:`, err);
      }
    }
  }

  async cleanAllTestWorkshops(): Promise<string[]> {
    if (this.isUsingFallback || !this.firestore) return [];
    try {
      const docRefs = await this.firestore.collection("workshops").listDocuments();
      const deleted: string[] = [];
      for (const docRef of docRefs) {
        if (docRef.id.startsWith("test-") || docRef.id.startsWith("test_")) {
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

  async saveSubmission(workshopId: string, studentId: string, submission: SubmissionDoc, pointsDelta = 0): Promise<void> {
    if (this.isUsingFallback || !this.firestore) {
      return this.inMemoryFallback.saveSubmission(workshopId, studentId, submission, pointsDelta);
    }
    try {
      const studentHouse = ((submission as any).house || "gryffindor").toLowerCase() as HouseId;
      const subRef = this.firestore.doc(`workshops/${workshopId}/students/${studentId}/submissions/${submission.class_id}`);
      await subRef.set({
        ...submission,
        house: studentHouse,
        evaluated_at: FieldValue.serverTimestamp(),
      });

      // Recalcular la puntuación total del alumno sumando todas sus materias
      const subsSnap = await this.firestore.collection(`workshops/${workshopId}/students/${studentId}/submissions`).get();
      let studentTotalScore = 0;
      subsSnap.forEach((doc) => {
        const d = doc.data() as SubmissionDoc;
        studentTotalScore += (d.total_awarded_points ?? d.points ?? 0);
      });

      const studentRef = this.firestore.doc(`workshops/${workshopId}/students/${studentId}`);
      const prevStudentSnap = await studentRef.get();
      const prevScore = prevStudentSnap.exists ? (prevStudentSnap.data()?.score ?? 0) : 0;
      const effectiveHouse = (prevStudentSnap.exists && prevStudentSnap.data()?.house) || studentHouse;
      const deltaToApply = studentTotalScore - prevScore;

      await studentRef.set(
        {
          house: effectiveHouse,
          score: studentTotalScore,
          last_activity: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      if (deltaToApply !== 0) {
        const houseRef = this.firestore.doc(`workshops/${workshopId}/houses/${effectiveHouse}`);
        await houseRef.set(
          {
            score: FieldValue.increment(deltaToApply),
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch {
      return this.inMemoryFallback.saveSubmission(workshopId, studentId, submission, pointsDelta);
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

