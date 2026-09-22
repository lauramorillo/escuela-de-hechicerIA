import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer as createViteServer } from "vite";
import { dbService } from "./db.ts";
import { getStudentSession, resetSession } from "./src/controllers/studentController.ts";
import { getHouseStats } from "./src/controllers/houseController.ts";
import { detectAndSort, synthesizeSpeech } from "./src/controllers/sortingController.ts";

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

  app.get("/api/me", getStudentSession);
  app.all("/api/reset", resetSession);
  app.get("/api/houses", getHouseStats);
  app.post("/api/detect", detectAndSort);
  app.post("/api/tts", synthesizeSpeech);

  await setupClient(app);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🏰 Sombrero Seleccionador ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();
