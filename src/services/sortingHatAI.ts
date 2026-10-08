import { GoogleGenAI, Type } from "@google/genai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { hasGcpCredentials } from "../../db.js";

export interface DeliberationResult {
  detected: boolean;
  confidence: number;
  house: string;
  phrase: string;
}

const DEFAULT_VERDICTS: Record<string, string> = {
  Gryffindor:
    "¡Mmm, sí! Veo un coraje indomable, una osadía vibrante y un corazón noble dispuesto a desafiar cualquier peligro. ¡Sin duda alguna pertenecerás a... GRYFFINDOR!",
  Slytherin:
    "¡Vaya, qué mente tan astuta y calculadora! Hay una gran ambición en ti y la determinación para alcanzar la grandeza a cualquier precio. ¡Tu lugar está en... SLYTHERIN!",
  Ravenclaw:
    "¡Fascinante! Percibo una curiosidad insaciable, un intelecto agudo y una creatividad deslumbrante que ansía conocimiento. ¡Orgullosamente pertenecerás a... RAVENCLAW!",
  Hufflepuff:
    "¡Ah, qué espíritu tan leal, honesto y trabajador! Tu nobleza, paciencia y valentía silenciosa hacen brillar a los más fieles compañeros. ¡Pertenecerás a... HUFFLEPUFF!",
};

const TTS_PROMPT =
  "Actúa como el Sombrero Seleccionador de Hogwarts de Harry Potter: habla con un tono sabio, misterioso, antiguo y solemne. Al final proclama con energía, orgullo y grandeza la casa asignada.";

const isVertex = Boolean(process.env.GOOGLE_CLOUD_PROJECT);
let ttsClient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient | null {
  if (!hasGcpCredentials()) {
    return null;
  }
  if (!ttsClient) {
    try {
      ttsClient = new TextToSpeechClient();
    } catch (err) {
      console.warn("⚠️ TextToSpeechClient no disponible en este entorno:", err);
      return null;
    }
  }
  return ttsClient;
}

function createAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    try {
      return new GoogleGenAI({ apiKey });
    } catch {
      return null;
    }
  }
  if (isVertex && process.env.GOOGLE_CLOUD_PROJECT && hasGcpCredentials()) {
    try {
      return new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.GOOGLE_CLOUD_LOCATION || "europe-west1",
      });
    } catch {
      return null;
    }
  }
  return null;
}

export function getDefaultVerdict(house: string): string {
  return DEFAULT_VERDICTS[house] || `¡Tu casa es ${house}!`;
}

function buildDetectionPrompt(targetHouse: string): string {
  return (
    `Analiza la imagen del estudiante que tiene colocado el Sombrero Seleccionador de Hogwarts sobre su cabeza. ` +
    `Evalúa la confianza de que hay una persona presente con un sombrero seleccionador en la cabeza de 0.0 a 1.0. ` +
    `Si hay una persona visible en la imagen, establece 'detected: true' y asigna OBLIGATORIAMENTE a la persona a la casa ${targetHouse}. ` +
    `Genera una o dos frases en Español actuando como el sabio y teatral Sombrero Seleccionador, deliberando brevemente sobre lo que ves en su mirada, ` +
    `semblante y espíritu que encaja con ${targetHouse}, y terminando proclamando con fuerza el nombre de esta casa elegida. ` +
    `Inspírate en: Gryffindor (Valor, osadía, temple), Slytherin (Ambición, astucia, liderazgo), Ravenclaw (Inteligencia, curiosidad, creatividad), Hufflepuff (Lealtad, honestidad, nobleza). ` +
    `Si no hay nadie en la imagen, devuelve { "detected": false, "confidence": 0.0 }. Devuelve un JSON.`
  );
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detected: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    house: { type: Type.STRING },
    phrase: { type: Type.STRING },
  },
  required: ["detected", "confidence"],
};

export async function deliberateHouse(base64Image: string, targetHouse: string): Promise<DeliberationResult> {
  const fallbackResult: DeliberationResult = {
    detected: true,
    confidence: 0.9,
    house: targetHouse,
    phrase: getDefaultVerdict(targetHouse),
  };

  const ai = createAIClient();
  if (!ai) {
    return fallbackResult;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: buildDetectionPrompt(targetHouse) },
            { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return {
      detected: parsed.detected ?? true,
      confidence: parsed.confidence ?? 0.95,
      house: targetHouse,
      phrase: parsed.phrase || getDefaultVerdict(targetHouse),
    };
  } catch {
    return fallbackResult;
  }
}

const MAX_HAT_TTS_CACHE = 100;
const hatTtsCache = new Map<string, string>();

export async function synthesizeHatVoice(text: string): Promise<string> {
  const client = getTTSClient();
  if (!client) {
    throw new Error("Text-to-Speech no está disponible en este entorno sin credenciales de Google Cloud.");
  }

  const voiceName = process.env.TTS_VOICE || "Charon";
  const cacheKey = `${voiceName}:${text.trim()}`;
  const cached = hatTtsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const geminiModels = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-tts"];

  // 1. Intentos con Gemini TTS (1º gemini-3.1-flash-tts-preview, 2º gemini-2.5-flash-tts)
  for (const modelName of geminiModels) {
    try {
      const [response] = await client.synthesizeSpeech({
        audioConfig: {
          audioEncoding: "LINEAR16",
          pitch: 0,
          speakingRate: 1,
        },
        input: {
          prompt: TTS_PROMPT,
          text,
        },
        voice: {
          languageCode: "es-es",
          modelName,
          name: voiceName,
        },
      });

      if (response.audioContent) {
        const audioBuffer = Buffer.isBuffer(response.audioContent)
          ? response.audioContent
          : Buffer.from(response.audioContent);
        const base64Audio = audioBuffer.toString("base64");
        if (hatTtsCache.size >= MAX_HAT_TTS_CACHE) {
          const oldestKey = hatTtsCache.keys().next().value;
          if (oldestKey) hatTtsCache.delete(oldestKey);
        }
        hatTtsCache.set(cacheKey, base64Audio);
        return base64Audio;
      }
    } catch (err) {
      console.warn(
        `⚠️ Error o límite de cuota en ${modelName} (${voiceName}) para el Sombrero Seleccionador, pasando al siguiente modelo de respaldo:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // 2. Último fallback a Chirp 3 HD si fallan ambos modelos de Gemini TTS
  const chirpVoiceName = voiceName.includes("Chirp3-HD")
    ? voiceName
    : `es-ES-Chirp3-HD-${voiceName}`;

  const [fallbackResponse] = await client.synthesizeSpeech({
    audioConfig: {
      audioEncoding: "LINEAR16",
      speakingRate: 0.95,
    },
    input: {
      text,
    },
    voice: {
      languageCode: "es-ES",
      name: chirpVoiceName,
    },
  });

  if (!fallbackResponse.audioContent) {
    throw new Error("No audio generated");
  }

  const audioBuffer = Buffer.isBuffer(fallbackResponse.audioContent)
    ? fallbackResponse.audioContent
    : Buffer.from(fallbackResponse.audioContent);

  return audioBuffer.toString("base64");
}


