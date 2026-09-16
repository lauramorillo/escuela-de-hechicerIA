import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import textToSpeech from "@google-cloud/text-to-speech";

const ttsClient = new textToSpeech.v1beta1.TextToSpeechClient();

const isVertex = Boolean(process.env.GOOGLE_CLOUD_PROJECT);
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI;

if (isVertex) {
  console.log(`🏰 Conectando con Vertex AI (Agent Platform) - Proyecto: ${process.env.GOOGLE_CLOUD_PROJECT}, Región: ${process.env.GOOGLE_CLOUD_LOCATION || 'europe-west1'}`);
  ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || "europe-west1",
  });
} else {
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ [GEMINI] Advertencia: GEMINI_API_KEY no está configurada o contiene el valor por defecto en .env");
  }
  ai = new GoogleGenAI({ apiKey });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add a built-in middleware to parse bodies 
  app.use(express.json({ limit: '50mb' }));

  // API route for Sorting Hat detection
  app.post("/api/detect", async (req, res) => {
    try {
      const { imageParams } = req.body;
      
      if (!imageParams) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Extract base64 part string
      const base64Data = imageParams.replace(/^data:image\/\w+;base64,/, "");

      const houses = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"];
      const targetHouse = houses[Math.floor(Math.random() * houses.length)];

      const modelName = process.env.GEMINI_MODEL || (isVertex ? "gemini-2.5-flash" : "gemini-2.5-flash");

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Analiza la imagen. Tu objetivo principal es detectar si hay una persona que tiene puesto en la cabeza ALGO que parezca un sombrero (particularmente el Sombrero Seleccionador de Harry Potter, que puede ser un cono marrón/negro, un peluche o similar). Evalúa la confianza de 0.0 a 1.0. Sé MUY GENEROSO: si ves a la persona con cualquier tipo de sombrero o bulto en la cabeza, asigna una confianza alta. Si la confianza es mayor a 0.3, establece 'detected: true'. Si 'detected' es true, asigna OBLIGATORIAMENTE a la persona a la casa ${targetHouse}. Genera una o dos frases en Español actuando como el Sombrero Seleccionador, describiendo las cualidades que ves en la persona que encajan con ${targetHouse} y terminando con el nombre de esta casa elegida recordando gritarlo. Inspírate en: Gryffindor (Valor, osadía), Slytherin (Ambición, astucia), Ravenclaw (Inteligencia, curiosidad), Hufflepuff (Lealtad, honestidad). Si nadie está en la imagen o si definitivamente no hay nada sobre su cabeza, devuelve { "detected": false, "confidence": <score> }. Devuelve un JSON.`
              },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: "image/jpeg",
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detected: {
                type: Type.BOOLEAN,
                description: "True if a person is wearing the Sorting Hat or a wizard hat on their head."
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence score between 0.0 and 1.0 that a person is wearing the hat."
              },
              house: {
                type: Type.STRING,
                description: "The Hogwarts house chosen (Gryffindor, Slytherin, Ravenclaw, Hufflepuff)"
              },
              phrase: {
                type: Type.STRING,
                description: "The phrase the Sorting Hat says in Spanish."
              }
            },
            required: ["detected", "confidence"]
          }
        }
      });
      
      const text = response.text || "{}";
      console.log("Gemini detection raw text:", text);
      const result = JSON.parse(text);

      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to detect: " + error.message });
    }
  });

  // API route for TTS (Google Cloud Text-to-Speech v1beta1 con Gemini TTS & prompt de interpretación)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      // Prompt de dirección teatral para el modelo generativo de voz Gemini:
      const prompt =
        "Actúa como el Sombrero Seleccionador de Hogwarts de Harry Potter: habla con un tono sabio, misterioso, antiguo y solemne. Al final proclama con energía, orgullo y grandeza la casa asignada.";

      const voiceName = process.env.TTS_VOICE || "Charon"; // Charon, Fenrir o Achernar

      const [response] = await ttsClient.synthesizeSpeech({
        audioConfig: {
          audioEncoding: "LINEAR16",
          pitch: 0,
          speakingRate: 1,
        },
        input: {
          prompt,
          text,
        },
        voice: {
          languageCode: "es-es",
          modelName: "gemini-3.1-flash-tts-preview",
          name: voiceName,
        },
      });

      if (response.audioContent) {
        const audioBuffer = Buffer.isBuffer(response.audioContent)
          ? response.audioContent
          : Buffer.from(response.audioContent);
        const finalBase64 = audioBuffer.toString("base64");
        res.json({ audio: finalBase64 });
      } else {
        res.status(500).json({ error: "No audio generated" });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
