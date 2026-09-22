import { GoogleGenAI, Type } from "@google/genai";
import textToSpeech from "@google-cloud/text-to-speech";

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
const ttsClient = new textToSpeech.v1beta1.TextToSpeechClient();

function createAIClient(): GoogleGenAI {
  if (isVertex) {
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "europe-west1",
    });
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const ai = createAIClient();

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
    return {
      detected: true,
      confidence: 0.9,
      house: targetHouse,
      phrase: getDefaultVerdict(targetHouse),
    };
  }
}

export async function synthesizeHatVoice(text: string): Promise<string> {
  const voiceName = process.env.TTS_VOICE || "Charon";
  const [response] = await ttsClient.synthesizeSpeech({
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
      modelName: "gemini-3.1-flash-tts-preview",
      name: voiceName,
    },
  });

  if (!response.audioContent) {
    throw new Error("No audio generated");
  }

  const audioBuffer = Buffer.isBuffer(response.audioContent)
    ? response.audioContent
    : Buffer.from(response.audioContent);

  return audioBuffer.toString("base64");
}
