import type { SubmissionItem } from "../ClassesHub";

export interface EvaluationResponse {
  grade: "E" | "S" | "A" | "I" | "D" | "T";
  gradeLabel: string;
  points: number;
  bonusPoints?: number;
  totalAwardedPoints?: number;
  firstHouseBonus?: boolean;
  feedback: string;
  advice: string;
  audioPhrase?: string;
  audio?: string | null;
  testResults?: {
    total: number;
    passed: number;
    details: string[];
  };
  attemptCount?: number;
  retryPenalty?: number;
  pointsDelta?: number;
  basePoints?: number;
  isNewBest?: boolean;
}

export const PROFESSOR_AVATARS: Record<string, { icon: string; titleColor: string; quote: string }> = {
  transfiguration: {
    icon: "🪄",
    titleColor: "text-amber-200",
    quote: "La transfiguración requiere una mente disciplinada, precisión matemática y absoluto rigor rúnico.",
  },
  defense: {
    icon: "🗺️",
    titleColor: "text-amber-900",
    quote: "Los señores Lunático, Colagusano, Canuto y Cornamenta te enseñarán a contener la magia.",
  },
  battle: {
    icon: "🧙‍♂️",
    titleColor: "text-purple-300",
    quote: "La felicidad se puede hallar hasta en los más oscuros momentos, si somos capaces de usar bien la luz.",
  },
  divination: {
    icon: "🧙‍♂️",
    titleColor: "text-purple-300",
    quote: "La felicidad se puede hallar hasta en los más oscuros momentos, si somos capaces de usar bien la luz.",
  },
};

export const GRADE_METRICS: Record<string, { label: string; badge: string; color: string; desc: string }> = {
  E: {
    label: "Extraordinario",
    badge: "E",
    color: "from-amber-400 to-yellow-600 text-stone-950 border-amber-300 shadow-[0_0_30px_rgba(234,179,8,0.6)]",
    desc: "¡Máxima calificación del claustro!",
  },
  S: {
    label: "Supera las expectativas",
    badge: "S",
    color: "from-blue-400 to-indigo-600 text-white border-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.5)]",
    desc: "Notable dominio y destreza mágica.",
  },
  A: {
    label: "Aceptable",
    badge: "A",
    color: "from-emerald-500 to-teal-700 text-white border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    desc: "Aprobado suficiente para continuar.",
  },
  I: {
    label: "Insatisfactorio",
    badge: "I",
    color: "from-orange-500 to-amber-700 text-white border-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.4)]",
    desc: "Necesitas practicar antes del examen.",
  },
  D: {
    label: "Desastroso",
    badge: "D",
    color: "from-rose-600 to-red-800 text-white border-rose-400 shadow-[0_0_25px_rgba(225,29,72,0.5)]",
    desc: "¡Cuidado con la varita!",
  },
  T: {
    label: "Trol",
    badge: "T",
    color: "from-stone-700 to-stone-900 text-red-400 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)]",
    desc: "¡Peligro! Entrega inaceptable o perjudicial.",
  },
};

export function playProclamationAudio(
  audioBase64?: string | null,
  phrase?: string,
  points = 0,
  classId = "transfiguration"
): void {
  if (audioBase64) {
    try {
      const snd = new Audio(`data:audio/wav;base64,${audioBase64}`);
      snd.play().catch((err) => console.log("Audio autoplay prevenido por navegador:", err));
      return;
    } catch (err) {
      console.warn("Fallo en reproducción de audio base64:", err);
    }
  }

  if (phrase && typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = "es-ES";

      const voices = window.speechSynthesis.getVoices();
      const spanishVoices = voices.filter((v) => v.lang.startsWith("es"));

      if (classId === "transfiguration") {
        // Profesora McGonagall: mujer solemne y rigurosa
        const femaleVoice = spanishVoices.find((v) =>
          /female|mujer|monica|helena|lucia|paulina|laura/i.test(v.name)
        );
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.pitch = points > 0 ? 1.25 : points < 0 ? 0.95 : 1.1;
        utterance.rate = 0.96;
      } else if (classId === "defense") {
        // Profesor Remus Lupin: hombre más nervioso y apresurado ante el peligro
        const maleVoice = spanishVoices.find((v) =>
          /male|hombre|jorge|pablo|enrique|diego|carlos/i.test(v.name)
        );
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = points > 0 ? 1.15 : points < 0 ? 0.9 : 1.05;
        utterance.rate = 1.18;
      } else {
        // Profesor Albus Dumbledore: hombre anciano solemne, majestuoso, grave y pausado
        const maleVoice = spanishVoices.find((v) =>
          /male|hombre|jorge|enrique|diego|carlos/i.test(v.name)
        );
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = points > 0 ? 0.85 : 0.72;
        utterance.rate = 0.88;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Error en SpeechSynthesis:", e);
    }
  }
}
