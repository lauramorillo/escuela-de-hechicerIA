import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
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

  // Helper to add WAV header to raw PCM
  function addWavHeader(pcmBuffer: Buffer, sampleRate: number, numChannels: number, bitDepth: number) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4); // File size
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size
    header.writeUInt16LE(1, 20); // AudioFormat = 1 (PCM)
    header.writeUInt16LE(numChannels, 22); // NumChannels
    header.writeUInt32LE(sampleRate, 24); // SampleRate
    header.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28); // ByteRate
    header.writeUInt16LE(numChannels * (bitDepth / 8), 32); // BlockAlign
    header.writeUInt16LE(bitDepth, 34); // BitsPerSample
    header.write('data', 36);
    header.writeUInt32LE(pcmBuffer.length, 40); // Subchunk2Size
    return Buffer.concat([header, pcmBuffer]);
  }

  // API route for TTS (Text-to-Speech)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' } // Let's use Charon for a deep wizardly voice
            }
          }
        }
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
         // Convert raw PCM to WAV so standard browsers can play it via Data URL natively
         const pcmBuffer = Buffer.from(base64Audio, 'base64');
         const wavBuffer = addWavHeader(pcmBuffer, 24000, 1, 16);
         const finalBase64 = wavBuffer.toString('base64');
         
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
