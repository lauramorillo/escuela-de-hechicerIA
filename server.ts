import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer as createViteServer } from "vite";
import { dbService } from "./db.ts";
import { getStudentSession, resetSession } from "./src/controllers/studentController.ts";
import { getHouseStats } from "./src/controllers/houseController.ts";
import { detectAndSort, synthesizeSpeech } from "./src/controllers/sortingController.ts";
import { getAvailableClasses, unlockDefensePhase1 } from "./src/controllers/classesController.ts";
import { getGatekeeperStatus, verifyGatekeeperPasskey } from "./src/controllers/gatekeeperController.ts";
import { proxyEvaluation, proxyGuardianChat } from "./src/controllers/evaluationProxyController.ts";
import {
  getProfessorStatus,
  verifyProfessorPasskey,
  logoutProfessor,
  getProfessorDashboard,
  toggleClassLock,
} from "./src/controllers/professorController.ts";

process.on("unhandledRejection", (reason) => {
  console.warn("⚠️ Unhandled Rejection detectada:", reason);
});

const PORT = Number(process.env.PORT) || 3000;

async function setupClient(app: express.Express): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    return;
  }

  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(cookieParser());

  await dbService.testConnection();
  const workshopId = await dbService.getEffectiveWorkshopId();
  await dbService.ensureHousesInitialized(workshopId);

  // Middleware CORS para llamadas locales y externas
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-student-id, x-student-house, x-workshop-id, x-professor-password");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.get("/api/gatekeeper/status", getGatekeeperStatus);
  app.post("/api/gatekeeper/verify", verifyGatekeeperPasskey);
  app.get("/api/professor/status", getProfessorStatus);
  app.post("/api/professor/verify", verifyProfessorPasskey);
  app.post("/api/professor/logout", logoutProfessor);
  app.get("/api/professor/dashboard", getProfessorDashboard);
  app.post("/api/professor/classes/toggle", toggleClassLock);
  app.get("/api/me", getStudentSession);
  app.all("/api/reset", resetSession);
  app.get("/api/houses", getHouseStats);
  app.get("/api/classes", getAvailableClasses);
  app.post("/api/evaluate", proxyEvaluation);
  app.post("/api/defense/guardian-chat", proxyGuardianChat);
  app.post("/api/defense/unlock-phase1", unlockDefensePhase1);
  app.post("/api/detect", detectAndSort);
  app.post("/api/tts", synthesizeSpeech);

  await setupClient(app);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🏰 Sombrero Seleccionador ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();
