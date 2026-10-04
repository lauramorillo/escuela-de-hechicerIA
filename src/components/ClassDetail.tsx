import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Award,
  RefreshCw,
  Feather,
  BookOpen,
  AlertCircle,
  Copy,
  Check,
  Code2,
  Database,
  Lightbulb,
  FileText,
  Shield,
  Wand2,
  Swords,
  Flame,
  Lock,
  Unlock,
  Eye,
  Upload,
  CheckCircle2,
  FileCode,
  Volume2,
  Trophy,
} from "lucide-react";
import type { ClassItem, SubmissionItem, SubExercise } from "./ClassesHub";
import { MaraudersMapBackground } from "./MaraudersMapBackground";

interface ClassDetailProps {
  classId: string;
  studentHouse: string;
  studentId: string;
  workshopId?: string;
  onBack: () => void;
}

interface EvaluationResponse {
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
}

const PROFESSOR_AVATARS: Record<string, { icon: string; titleColor: string; quote: string }> = {
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
    icon: "⚔️",
    titleColor: "text-rose-400",
    quote: "¡Hogwarts está amenazada! Convocad los contrahechizos, defended las almenas y proteged el castillo.",
  },
  divination: {
    icon: "⚔️",
    titleColor: "text-rose-400",
    quote: "¡Hogwarts está amenazada! Convocad los contrahechizos, defended las almenas y proteged el castillo.",
  },
};

const GRADE_METRICS: Record<string, { label: string; badge: string; color: string; desc: string }> = {
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

export const ClassDetail: React.FC<ClassDetailProps> = ({
  classId,
  studentHouse,
  studentId,
  workshopId,
  onBack,
}) => {
  const isDefense = classId === "defense";
  const isTransfiguration = classId === "transfiguration";
  const isBattle = classId === "battle" || classId === "divination";
  const [classInfo, setClassInfo] = useState<ClassItem | null>(null);
  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [jsonAuditText, setJsonAuditText] = useState("");
  const [pythonFileName, setPythonFileName] = useState("");
  const [pythonFileContent, setPythonFileContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("mission");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSubExerciseId, setSelectedSubExerciseId] = useState<string>("defense_attack");
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

  const isPassed = Boolean(submission && ["E", "S", "A"].includes(submission.grade));

  const professorData = PROFESSOR_AVATARS[classId] || PROFESSOR_AVATARS.transfiguration;
  const currentSubExercise: SubExercise | undefined = isDefense
    ? classInfo?.subExercises?.find((s) => s.id === selectedSubExerciseId) || classInfo?.subExercises?.[0]
    : undefined;

  useEffect(() => {
    fetchClassData();
  }, [classId, studentId]);

  const fetchClassData = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        const found = (data.classes || []).find((c: ClassItem) => c.id === classId);
        setClassInfo(found || null);
        const prev = (data.submissions || {})[classId];
        if (prev) {
          setSubmission(prev);
          setAnswerText(prev.answer || "");
          if (classId === "transfiguration" && prev.answer) {
            const jsonMatch = prev.answer.match(/```json\s*([\s\S]*?)```/i);
            if (jsonMatch && jsonMatch[1]) {
              setJsonAuditText(jsonMatch[1].trim());
            }
            const pyMatch = prev.answer.match(/```python\s*([\s\S]*?)```/i);
            if (pyMatch && pyMatch[1]) {
              setPythonFileContent(pyMatch[1].trim());
            }
          }
        } else {
          setIsEditing(true);
        }
      }
    } catch (err) {
      console.error("Error al cargar detalle de clase:", err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleInsertJsonTemplate = () => {
    setJsonAuditText(`{
  "variable_cobol_afectada": "WS-NOMBRE-VARIABLE",
  "camaras_afectadas": [
    {
      "numero_camara": 9999,
      "tarifa_total_knuts": 1250.50
    }
  ]
}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPythonFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPythonFileContent(content || "");
    };
    reader.readAsText(file);
  };

  const handleInsertTemplate = () => {
    if (isTransfiguration) {
      handleInsertJsonTemplate();
      if (!pythonFileContent) {
        setAnswerText(`# Escribe aquí tu función en Python 3 o adjunta tu archivo .py abajo
import json

def calcular_tasa_camara(camara):
    # Calcula la tarifa total en Knuts sin el límite rúnico
    pass

def procesar_lote(lote):
    return [calcular_tasa_camara(c) for c in lote]
`);
      }
    } else if (isDefense && currentSubExercise) {
      setAnswerText(currentSubExercise.defaultTemplate);
    } else if (isBattle) {
      const template = `### PLAN DE COMBATE AGÉNTICO (TOOL CALLING):

\`\`\`json
[
  {
    "oleada": 1,
    "sector": "puente",
    "threat": "Dementores avanzando en niebla glacial",
    "thought": "Los seres de oscuridad solo son repelidos por un patronus corpóreo de luz.",
    "tool_call": {
      "name": "lanzar_contrahechizo",
      "arguments": {
        "hechizo": "Expecto Patronum",
        "sector": "puente"
      }
    }
  },
  {
    "oleada": 2,
    "sector": "patio_central",
    "threat": "Impactos sobre la cúpula, escudo al 15%",
    "thought": "Debemos canalizar energía de urgencia para restaurar la integridad del escudo.",
    "tool_call": {
      "name": "reforzar_barrera",
      "arguments": {
        "sector": "patio_central",
        "potencia": 85
      }
    }
  },
  {
    "oleada": 3,
    "sector": "puerta_principal",
    "threat": "Gigantes derribando el portón exterior",
    "thought": "Piertotum Locomotor activará las armaduras de piedra para bloquear el acceso.",
    "tool_call": {
      "name": "activar_estatuas_piertotum",
      "arguments": {
        "orden": "bloquear_puerta_principal"
      }
    }
  },
  {
    "oleada": 4,
    "sector": "viaducto",
    "threat": "Bellatrix Lestrange en duelo con maldiciones",
    "thought": "Desarmarla de inmediato con Expelliarmus evitará bajas en los defensores.",
    "tool_call": {
      "name": "lanzar_contrahechizo",
      "arguments": {
        "hechizo": "Expelliarmus",
        "sector": "viaducto"
      }
    }
  }
]
\`\`\``;
      setAnswerText(template);
    } else {
      setAnswerText(`### Mi respuesta mágica:\n\n[Escribe aquí tu solución detallada...]`);
    }
  };

  const playProclamationAudio = (audioBase64?: string | null, phrase?: string, points = 0) => {
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
        if (points > 0) {
          utterance.pitch = 1.3;
          utterance.rate = 1.05;
        } else if (points < 0) {
          utterance.pitch = 0.8;
          utterance.rate = 0.95;
        } else {
          utterance.pitch = 1.0;
          utterance.rate = 1.0;
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Error en SpeechSynthesis:", e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalAnswer = answerText.trim();
    if (isTransfiguration) {
      const scriptCode = (pythonFileContent || answerText).trim();
      if (!jsonAuditText.trim()) {
        setErrorMessage("Por favor, completa el informe de auditoría Rúnica en formato JSON antes de enviar.");
        return;
      }
      if (!scriptCode) {
        setErrorMessage("Por favor, adjunta o escribe tu script Python 3 (.py) antes de enviar.");
        return;
      }
      finalAnswer = `### INFORME DE AUDITORÍA RÚNICA (JSON):\n\`\`\`json\n${jsonAuditText.trim()}\n\`\`\`\n\n### SCRIPT PYTHON 3 (.py):\n\`\`\`python\n${scriptCode}\n\`\`\``;
    } else {
      if (!finalAnswer) {
        setErrorMessage("Por favor, redacta tu respuesta antes de enviarla.");
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const remoteServiceUrl = (import.meta as any).env?.VITE_EVALUATION_SERVICE_URL;
      const targetUrl = remoteServiceUrl
        ? `${remoteServiceUrl.replace(/\/$/, "")}/evaluate`
        : "/api/evaluate";

      const requestPayload = {
        workshopId: workshopId || "dev-workshop",
        studentId,
        house: studentHouse.toLowerCase(),
        classId,
        subExerciseId: isDefense ? selectedSubExerciseId : undefined,
        answer: finalAnswer,
      };

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo obtener la corrección del profesor.");
      }

      const evaluation: EvaluationResponse = data.evaluation || {
        grade: data.grade,
        gradeLabel: data.gradeLabel,
        points: data.points,
        bonusPoints: data.bonusPoints,
        totalAwardedPoints: data.totalAwardedPoints,
        firstHouseBonus: data.firstHouseBonus,
        feedback: data.feedback,
        advice: data.advice,
        audioPhrase: data.audioPhrase,
        audio: data.audio,
      };

      const effectiveTotalPoints =
        evaluation.totalAwardedPoints ?? (evaluation.points + (evaluation.firstHouseBonus ? 50 : 0));

      setSubmission({
        class_id: classId,
        answer: finalAnswer,
        grade: evaluation.grade,
        grade_label: evaluation.gradeLabel,
        points: evaluation.points,
        bonus_points: evaluation.bonusPoints,
        total_awarded_points: effectiveTotalPoints,
        first_house_bonus: evaluation.firstHouseBonus,
        feedback: evaluation.feedback,
        advice: evaluation.advice,
        audio_phrase: evaluation.audioPhrase,
        audio: evaluation.audio,
      });
      setIsEditing(false);

      // Reproducción inmediata del audio proclamando los puntos con entonación
      playProclamationAudio(
        evaluation.audio,
        evaluation.audioPhrase || `¡${effectiveTotalPoints} puntos para ${studentHouse}!`,
        effectiveTotalPoints
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Ocurrió un error inesperado al contactar con el profesor.");
    } finally {
      setSubmitting(false);
    }
  };

  const attachments = classInfo?.attachments || [];
  const hasAttachments = attachments.length > 0;

  // =========================================================================
  // VISTA ESPECIAL: EL MAPA DEL MERODEADOR (AULA DE DEFENSA EN PERGAMINO REAL)
  // =========================================================================
  if (isDefense) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#180e07] text-[#2c180d] font-serif overflow-y-auto select-none">
        {/* Fondo inmersivo del Mapa del Merodeador en la mesa rústica con vela y pluma */}
        <div
          className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.78] contrast-115 saturate-110 transition-all duration-700"
          style={{ backgroundImage: "url('/mapa-merodeador-bg.jpg')" }}
        />
        <div className="fixed inset-0 bg-gradient-to-t from-[#150a04]/90 via-[#1a0c05]/50 to-[#0e0602]/70 pointer-events-none" />
        <div className="fixed inset-0 bg-radial from-transparent via-[#150a04]/30 to-[#070301]/85 pointer-events-none" />

        {/* Huellas superpuestas, nombres de merodeadores y planos de pasadizos */}
        <MaraudersMapBackground />

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col min-h-screen">
          {/* Barra superior de navegación en estilo pergamino */}
          <div className="flex items-center justify-between pb-5 border-b-2 border-[#7a481c]/40">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#dfcaa0] hover:bg-[#d0b889] border-2 border-[#703f19]/70 text-[#301a0c] text-xs sm:text-sm font-bold transition-all hover:scale-105 cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4 text-[#703f19]" />
              <span>Volver a los Desafíos</span>
            </button>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#dfcaa0] border-2 border-[#703f19]/60 text-xs font-bold text-[#301a0c] shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#854518]" />
              <span>Casa: {studentHouse}</span>
            </div>
          </div>

          {/* Gran Cartel Canónico de los Merodeadores */}
          <div className="my-6 p-6 sm:p-8 rounded-2xl bg-[#f8f0dd] border-3 border-[#663613] shadow-[0_12px_40px_rgba(70,35,10,0.25)] text-center relative overflow-hidden">
            <div
              className="absolute top-2 left-3 text-xs tracking-widest text-[#8a5223] opacity-60"
              style={{ fontFamily: "'MedievalSharp', serif" }}
            >
              § HOGWARTS CASTLE §
            </div>
            <div
              className="absolute top-2 right-3 text-xs tracking-widest text-[#8a5223] opacity-60"
              style={{ fontFamily: "'MedievalSharp', serif" }}
            >
              § CONFIDENTIAL §
            </div>

            <div
              className="inline-block px-4 py-1 rounded-full bg-[#eddcb2] border border-[#7a441b]/40 text-[#69340e] text-[11px] sm:text-xs uppercase tracking-[0.25em] font-extrabold mb-2"
              style={{ fontFamily: "'Fondamento', cursive, serif" }}
            >
              Los señores Lunático, Colagusano, Canuto y Cornamenta
            </div>

            <h1
              className="text-2xl sm:text-4xl md:text-5xl font-black text-[#2e1507] tracking-wider uppercase drop-shadow-sm my-1"
              style={{ fontFamily: "'Cinzel Decorative', 'MedievalSharp', serif" }}
            >
              El Mapa del Merodeador
            </h1>

            <p
              className="text-xs sm:text-base italic text-[#593012] max-w-xl mx-auto mt-1"
              style={{ fontFamily: "'Fondamento', Georgia, serif" }}
            >
              "Tienen el orgullo de presentar su mayor creación... pero antes debéis aprender a atacar y proteger sus secretos."
            </p>

            <p
              className="text-xs font-bold text-[#7a431c] mt-2 tracking-wide"
              style={{ fontFamily: "'MedievalSharp', serif" }}
            >
              Docente: {classInfo?.professor}
            </p>
          </div>

          {/* Rastro de Huellas Animadas */}
          <div className="mb-6 px-4 py-3 rounded-xl bg-[#ead6a8] border-2 border-[#7b461d]/60 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">👣</span>
              <div className="text-xs font-serif text-[#391d09]">
                <strong className="block text-[#6a3511]">Pasadizo secreto hacia Honeydukes bajo la estatua de la bruja tuerta:</strong>
                <span className="italic">"Los Merodeadores deambulan por los pasillos... Pasos aproximándose sigilosamente..."</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] font-bold text-[#75370e] uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-[#75370e] animate-ping" />
              <span>MAPA ACTIVO</span>
            </div>
          </div>

          {/* Selector de los 2 Desafíos de DCAO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {classInfo?.subExercises?.map((sub) => {
              const isSelected = selectedSubExerciseId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubExerciseId(sub.id);
                    if (!answerText.trim() || answerText === currentSubExercise?.defaultTemplate) {
                      setAnswerText(sub.defaultTemplate);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#331b0c] text-[#fbf5e8] border-[#331b0c] shadow-[0_6px_20px_rgba(51,27,12,0.4)] scale-[1.02]"
                      : "bg-[#f5ebd2] text-[#3d200d] border-[#8a5223]/50 hover:bg-[#eee1c1]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold tracking-wider uppercase">
                      {sub.badge}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-[#8a4218] text-[#fef9f0]"
                          : "bg-[#dec79c] text-[#331b0c]"
                      }`}
                    >
                      {sub.role === "attacker" ? "Rol Atacante" : "Rol Defensor"}
                    </span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg font-serif">
                    {sub.shortName}
                  </h3>
                </button>
              );
            })}
          </div>

          {/* Instrucciones del Desafío Seleccionado */}
          {currentSubExercise && (
            <div className="mb-6 p-6 rounded-2xl bg-[#fbf5e7] border-2 border-[#7a481c] shadow-md">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#7a431c] font-bold mb-2">
                <Feather className="w-4 h-4 text-[#7a431c]" />
                <span>Instrucciones del {currentSubExercise.name}</span>
              </div>
              <p className="text-sm sm:text-base text-[#2e1709] leading-relaxed font-serif whitespace-pre-line">
                {currentSubExercise.assignment}
              </p>

              {currentSubExercise.hints && currentSubExercise.hints.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#cbb085]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#693714] flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-[#854519]" />
                    Pistas tácticas:
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#44220b]">
                    {currentSubExercise.hints.map((hint, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono font-bold text-[#804217]">→</span>
                        <span>{hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Veredicto de Lupin si ya entregó */}
          <AnimatePresence mode="wait">
            {submission && !isEditing && (
              <motion.div
                key="verdict-defense"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="mb-8 p-6 sm:p-8 rounded-2xl bg-[#fffaf0] border-3 border-[#703b15] shadow-[0_12px_45px_rgba(70,35,10,0.35)] relative overflow-hidden"
              >
                {/* Sello de Travesura Realizada */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b-2 border-[#8a5223]/30">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-3 flex items-center justify-center font-black text-2xl sm:text-3xl ${
                        GRADE_METRICS[submission.grade]?.color || "from-amber-400 to-yellow-600 text-stone-950 border-amber-500"
                      }`}
                    >
                      {submission.grade}
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-widest text-[#7a461e] font-bold block">
                        Nota Oficial T.I.M.O.
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[#2e1608]">
                        {submission.grade_label}
                      </h3>
                      <p className="text-xs text-[#5c3517]">
                        {GRADE_METRICS[submission.grade]?.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ead3a4] border-2 border-[#7a441b] shadow-sm">
                    <Award className="w-5 h-5 text-[#7a441b]" />
                    <span className="text-base sm:text-lg font-black text-[#2f180a]">
                      {submission.first_house_bonus
                        ? `+75 pts (+25 E + 50 Primera Casa) para ${studentHouse}`
                        : `${(submission.total_awarded_points ?? submission.points) >= 0 ? `+${submission.total_awarded_points ?? submission.points}` : (submission.total_awarded_points ?? submission.points)} pts para ${studentHouse}`}
                    </span>
                  </div>
                </div>

                {submission.first_house_bonus && (
                  <div className="my-4 p-3.5 rounded-xl bg-[#ead4a8] border-2 border-[#7a441b] flex items-center gap-3 text-[#2f180a] shadow-md">
                    <Trophy className="w-6 h-6 text-[#9a4e12] shrink-0 animate-bounce" />
                    <div>
                      <span className="font-black uppercase tracking-wider block text-xs text-[#703b15]">
                        🏆 ¡PRIMERA CASA DEL TORNEO! (+75 PUNTOS)
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-[#3b1e0d]">
                        ¡Tu casa se adjudica 75 puntos en total (+25 por Extraordinario y +50 por ser la primera en lograrlo)!
                      </span>
                    </div>
                  </div>
                )}

                {/* Dictamen de Remus Lupin */}
                <div className="my-5 p-4 rounded-xl bg-[#f4e7cb] border border-[#8f5a2e]/60">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs uppercase tracking-widest text-[#703b15] font-bold">
                      Dictamen del Profesor Remus Lupin:
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        playProclamationAudio(
                          submission.audio,
                          submission.audio_phrase || `¡${submission.total_awarded_points ?? submission.points} puntos para ${studentHouse}!`,
                          submission.total_awarded_points ?? submission.points
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ded0b1] hover:bg-[#d0be98] text-[#4d280e] text-xs font-bold border border-[#7a441b]/50 shadow-sm transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#7a441b]" />
                      Escuchar voz
                    </button>
                  </div>
                  <p className="text-base sm:text-lg italic text-[#2b1609] leading-relaxed">
                    "{submission.feedback}"
                  </p>
                  {submission.advice && (
                    <p className="text-xs sm:text-sm text-[#4d2a10] mt-3 pt-3 border-t border-[#ceb387]">
                      <strong className="text-[#753b13]">Consejo de Lunático:</strong> {submission.advice}
                    </p>
                  )}
                </div>

                {/* Pergamino Entregado */}
                <div className="mb-5">
                  <span className="text-xs uppercase tracking-widest text-[#703b15] font-bold block mb-1">
                    Tu pergamino entregado:
                  </span>
                  <p className="text-xs sm:text-sm text-[#2c170a] bg-[#fbf5e7] p-3 rounded-lg border border-[#8a5223]/50 whitespace-pre-wrap font-mono">
                    {submission.answer}
                  </p>
                </div>

                {isPassed ? (
                  <div className="flex items-center justify-center gap-2.5 w-full py-4 px-4 rounded-xl bg-[#2e1708] border border-[#8a4218]/40 text-[#dfcaa0] text-xs sm:text-sm font-semibold text-center shadow-inner">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                    <span>Examen T.I.M.O. superado ({submission.grade_label}). Calificación oficial sellada en el expediente.</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#391e0d] hover:bg-[#291407] text-[#fff8ee] text-sm font-bold transition-all cursor-pointer shadow-md hover:scale-[1.01]"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-300" />
                    <span>Volver a intentar para superar el examen</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulario de Entrega del Desafío Activo */}
          {(!submission || (isEditing && !isPassed)) && (
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#fffbf2] border-3 border-[#6b3813] shadow-[0_10px_35px_rgba(70,35,10,0.2)] relative"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <label
                    htmlFor="magic-answer"
                    className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#351a0a] flex items-center gap-2"
                  >
                    <Feather className="w-4 h-4 text-[#8a4218]" />
                    {selectedSubExerciseId === "defense_attack"
                      ? "Redacta tu Ataque de Prompt Injection:"
                      : "Redacta el System Prompt de Contención:"}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleInsertTemplate}
                      className="text-xs text-[#8a4218] hover:text-[#5c2a0d] underline font-bold cursor-pointer"
                    >
                      Insertar plantilla sugerida
                    </button>
                    <span className="text-xs text-[#704220] font-mono">
                      {answerText.length} caracteres
                    </span>
                  </div>
                </div>

                <textarea
                  id="magic-answer"
                  rows={9}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder={currentSubExercise?.placeholder}
                  disabled={submitting}
                  className="w-full p-4 rounded-xl bg-[#fffefb] border-2 border-[#7a481c] focus:border-[#4d280b] focus:ring-2 focus:ring-[#7a481c] text-[#221207] placeholder:text-[#9c7857] font-mono text-xs sm:text-sm leading-relaxed resize-y outline-none transition-all shadow-inner"
                />

                {errorMessage && (
                  <div className="flex items-center gap-2 text-rose-900 bg-rose-100 border border-rose-400 p-3 rounded-xl text-xs sm:text-sm mt-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 justify-end">
                {submission && isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={submitting}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl text-[#5a3318] hover:text-[#261307] border-2 border-[#a37248] hover:border-[#693916] text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    Cancelar y ver nota previa
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting || !answerText.trim()}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${
                    submitting || !answerText.trim()
                      ? "bg-[#cbb58c] text-[#735234] border border-[#a68c62] cursor-not-allowed"
                      : selectedSubExerciseId === "defense_attack"
                      ? "bg-gradient-to-r from-[#993d15] via-[#bd5622] to-[#993d15] hover:from-[#80310e] hover:to-[#993d15] text-[#fff8ee] shadow-[0_5px_25px_rgba(153,61,21,0.5)] hover:scale-105 cursor-pointer"
                      : "bg-gradient-to-r from-[#5c3012] via-[#7a421a] to-[#5c3012] hover:from-[#47220a] hover:to-[#5c3012] text-[#fff8ee] shadow-[0_5px_25px_rgba(92,48,18,0.5)] hover:scale-105 cursor-pointer"
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-[#fff8ee]" />
                      <span>Los Merodeadores están interrogando tu pergamino...</span>
                    </>
                  ) : (
                    <>
                      {selectedSubExerciseId === "defense_attack" ? (
                        <Wand2 className="w-5 h-5 text-[#fff8ee]" />
                      ) : (
                        <Shield className="w-5 h-5 text-[#fff8ee]" />
                      )}
                      <span>{currentSubExercise?.submitButtonText || "Enviar Encantamiento"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTAS ESPECIALES: PIZARRA DE MCGONAGALL (TRANSFIGURACIÓN) Y BATALLA DE HOGWARTS
  // =========================================================================
  const currentAttachment = attachments.find((a) => a.id === activeTab);

  return (
    <div
      className={`fixed inset-0 w-screen h-screen font-serif overflow-y-auto select-none ${
        isTransfiguration
          ? "bg-[#121215] text-[#f4efe6]"
          : isBattle
          ? "bg-[#06070e] text-[#f1f2fa]"
          : "bg-[#080b18] text-[#edeef9]"
      }`}
    >
      {/* Fondo inmersivo contextual */}
      {isTransfiguration ? (
        <>
          <div
            className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.72] contrast-115 saturate-110 transition-all duration-700"
            style={{ backgroundImage: "url('/transfiguracion-bg.jpg')" }}
          />
          <div className="fixed inset-0 bg-gradient-to-t from-[#121215]/90 via-[#121215]/55 to-black/35 pointer-events-none" />
          <div className="fixed inset-0 bg-radial from-transparent via-[#121215]/30 to-[#09090b]/80 pointer-events-none" />
          <div className="fixed inset-0 opacity-15 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        </>
      ) : isBattle ? (
        <>
          {/* Fondo de Mortífago con Hogwarts bajo asedio */}
          <div
            className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.75] contrast-115 saturate-115 transition-all duration-700"
            style={{ backgroundImage: "url('/mortifago-bg.jpg')" }}
          />
          <div className="fixed inset-0 bg-gradient-to-t from-[#06070e]/90 via-[#06070e]/50 to-black/30 pointer-events-none" />
          <div className="fixed inset-0 bg-radial from-transparent via-[#06070e]/25 to-[#020306]/75 pointer-events-none" />
          <div className="fixed inset-0 opacity-15 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="fixed inset-0 bg-radial from-purple-950/35 via-indigo-950/20 to-black pointer-events-none" />
          <div className="fixed inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        </>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col min-h-screen">
        {/* Barra superior de navegación */}
        <div
          className={`flex items-center justify-between pb-6 border-b ${
            isTransfiguration
              ? "border-amber-900/50"
              : isBattle
              ? "border-rose-900/60"
              : "border-indigo-900/50"
          }`}
        >
          <button
            onClick={onBack}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-sm font-semibold transition-all hover:scale-105 cursor-pointer shadow-lg ${
              isTransfiguration
                ? "bg-black/60 hover:bg-black/80 border-amber-600/40 text-amber-200"
                : isBattle
                ? "bg-black/70 hover:bg-black/90 border-rose-600/40 text-rose-200 hover:border-rose-400"
                : "bg-black/60 hover:bg-black/80 border-indigo-600/40 text-indigo-200"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a los Desafíos</span>
          </button>

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm ${
              isTransfiguration
                ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
                : isBattle
                ? "bg-rose-950/80 border-rose-500/50 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                : "bg-indigo-950/80 border-indigo-500/40 text-indigo-300"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} />
            <span>Casa: {studentHouse}</span>
          </div>
        </div>

        {/* Panel de radar táctico (Solo para la Batalla de Hogwarts) */}
        {isBattle && (
          <div className="my-5 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-rose-950/85 via-black/85 to-indigo-950/85 border-2 border-rose-600/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_0_35px_rgba(225,29,72,0.25)] backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-rose-200 font-bold">
              <Shield className="w-5 h-5 text-rose-400 animate-pulse" />
              <span>BARRERA MÁGICA: PROTEGO HORRIBILIS</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                Cúpula: 78%
              </span>
              <span className="px-3 py-1 rounded-full bg-rose-500/25 text-rose-200 border border-rose-500/50 font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                4 Oleadas de Mortífagos
              </span>
            </div>
          </div>
        )}

        {/* Encabezado del Aula o Cuartel de Defensa */}
        <div
          className={`my-6 sm:my-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-5 sm:gap-6 p-6 rounded-2xl backdrop-blur-md ${
            isTransfiguration
              ? "bg-[#18181b]/95 border-4 border-[#3e2415] shadow-[0_15px_45px_rgba(0,0,0,0.85)]"
              : isBattle
              ? "bg-[#0b0c16]/90 border-2 border-rose-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
              : "bg-[#0f1429]/90 border-2 border-indigo-500/50 shadow-[0_15px_45px_rgba(0,0,0,0.85)]"
          }`}
        >
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-2xl flex-shrink-0 ${
              isTransfiguration
                ? "bg-[#27170e] border-2 border-amber-600/60"
                : isBattle
                ? "bg-[#190b14] border-2 border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                : "bg-[#060814] border-2 border-rose-500/60"
            }`}
          >
            {professorData.icon}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`text-[11px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded ${
                  isTransfiguration
                    ? "bg-[#331c11] border border-amber-600/50 text-amber-200"
                    : "bg-rose-950 border border-rose-500/40 text-rose-300"
                }`}
              >
                {classInfo?.subject || "Desafío de Hogwarts"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-amber-100">
              {classInfo?.title}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-amber-300 mt-1">
              Docente: {classInfo?.professor}
            </p>
            <p className="text-xs sm:text-sm italic text-stone-400 mt-1">
              "{professorData.quote}"
            </p>
          </div>
        </div>

        {/* Lore / Narrativa mágica */}
        {classInfo?.lore && (
          <div
            className={`mb-6 p-4 sm:p-5 rounded-xl border text-xs sm:text-sm leading-relaxed italic flex items-start gap-3 ${
              isTransfiguration
                ? "bg-amber-950/20 border-amber-800/40 text-amber-200/90"
                : "bg-indigo-950/30 border-indigo-800/40 text-indigo-200/90"
            }`}
          >
            <BookOpen className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <strong className="text-amber-300 not-italic block mb-1">
                {isTransfiguration ? "Crónicas de la Biblioteca:" : "Informe de los Defensores:"}
              </strong>
              {classInfo.lore}
            </div>
          </div>
        )}

        {/* Pestañas de Material del Desafío */}
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveTab("mission")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "mission"
                  ? isTransfiguration
                    ? "bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 shadow-[0_0_15px_rgba(217,119,6,0.4)] font-black"
                    : "bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                  : "bg-black/60 text-stone-400 hover:text-white border border-stone-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{isTransfiguration ? "Instrucciones de McGonagall" : "Misión de Defensa Agéntica"}</span>
            </button>

            {attachments.map((att) => (
              <button
                key={att.id}
                onClick={() => setActiveTab(att.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === att.id
                    ? isTransfiguration
                      ? "bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 shadow-[0_0_15px_rgba(217,119,6,0.4)] font-black"
                      : "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                    : "bg-black/60 text-stone-400 hover:text-white border border-stone-800"
                }`}
              >
                {att.type === "code" ? <Code2 className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                <span>{att.name}</span>
              </button>
            ))}

            {classInfo?.hints && classInfo.hints.length > 0 && (
              <button
                onClick={() => setActiveTab("hints")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "hints"
                    ? "bg-amber-400 text-stone-950 shadow-[0_0_15px_rgba(234,179,8,0.4)] font-black"
                    : "bg-black/60 text-stone-400 hover:text-white border border-stone-800"
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                <span>Pistas de IA</span>
              </button>
            )}
          </div>
        )}

        {/* Contenido según pestaña activa */}
        <div className="mb-6">
          {(!hasAttachments || activeTab === "mission") && (
            <div
              className={`p-6 rounded-2xl border-2 shadow-[0_10px_40px_rgba(0,0,0,0.85)] relative overflow-hidden ${
                isTransfiguration
                  ? "bg-[#18181b] border-[#4a2e1b]"
                  : "bg-[#0b0f1e] border-indigo-800/60"
              }`}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400 font-bold mb-3">
                <Feather className="w-4 h-4 text-amber-400" />
                <span>Objetivos Oficiales</span>
              </div>
              <p className="text-sm sm:text-base text-stone-100 leading-relaxed font-serif whitespace-pre-line">
                {classInfo?.assignment}
              </p>
            </div>
          )}

          {currentAttachment && (
            <div
              className={`rounded-2xl bg-black border-2 overflow-hidden shadow-2xl ${
                isTransfiguration ? "border-[#4a2e1b]" : "border-indigo-800/60"
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  {currentAttachment.type === "code" ? (
                    <Code2 className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Database className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="font-mono text-xs text-amber-200 font-bold">{currentAttachment.name}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-black/60 text-stone-300 border border-stone-700">
                    {currentAttachment.description}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(currentAttachment.id, currentAttachment.content)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  {copiedId === currentAttachment.id ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === currentAttachment.id ? "¡Copiado!" : "Copiar"}</span>
                </button>
              </div>
              <div className="p-4 sm:p-5 overflow-x-auto text-xs font-mono text-amber-100/90 bg-[#101014] leading-relaxed max-h-[520px]">
                <table className="w-full border-collapse">
                  <tbody>
                    {currentAttachment.content.split("\n").map((line, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="select-none text-stone-600 pr-4 text-right align-top w-12 border-r border-stone-800/80 mr-3 text-[11px] font-mono">
                          {idx + 1}
                        </td>
                        <td className="pl-4 whitespace-pre font-mono">
                          {line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "hints" && classInfo?.hints && (
            <div
              className={`p-6 rounded-2xl border shadow-xl ${
                isTransfiguration
                  ? "bg-[#18181b] border-[#4a2e1b]"
                  : "bg-[#0b0f1e] border-indigo-800/60"
              }`}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400 font-bold">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Pistas del Claustro Mágico</span>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  {Object.values(revealedHints).filter(Boolean).length} de {classInfo.hints.length} desveladas
                </span>
              </div>

              <div className="p-3.5 mb-5 rounded-xl bg-amber-950/20 border border-amber-800/30 flex items-start gap-3">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80 leading-relaxed font-sans">
                  Las pistas están veladas por encantamiento. El claustro aconseja reflexionar y experimentar primero con vuestro asistente de IA. Revelad una pista únicamente si os encontráis en un callejón sin salida.
                </p>
              </div>

              <div className="space-y-3">
                {classInfo.hints.map((hint, idx) => {
                  const isRevealed = Boolean(revealedHints[idx]);
                  const hintTitles = isTransfiguration
                    ? [
                        "Enfoque y traducción rúnica con IA",
                        "Tipos de datos y límites en sistemas antiguos",
                        "Detección de anomalías en grandes fortunas",
                      ]
                    : [];
                  const title = hintTitles[idx] || `Pista de orientación mágica 0${idx + 1}`;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        isRevealed
                          ? "bg-black/70 border-amber-500/40 shadow-lg"
                          : "bg-black/30 border-stone-800 hover:border-stone-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {isRevealed ? (
                            <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <Lock className="w-4 h-4 text-stone-500 shrink-0" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-bold font-sans ${
                              isRevealed ? "text-amber-200" : "text-stone-400"
                            }`}
                          >
                            Pista 0{idx + 1}: {title}
                          </span>
                        </div>

                        {!isRevealed ? (
                          <button
                            type="button"
                            onClick={() => setRevealedHints((prev) => ({ ...prev, [idx]: true }))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-amber-600/30 text-amber-300 text-xs font-bold font-sans transition-all cursor-pointer hover:scale-105 active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Desvelar pista</span>
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Desvelada
                          </span>
                        )}
                      </div>

                      {isRevealed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 pt-3 border-t border-stone-800/80 text-xs sm:text-sm text-stone-200 font-sans leading-relaxed"
                        >
                          {hint}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Resultado de la Evaluación */}
        <AnimatePresence mode="wait">
          {submission && !isEditing && (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`mb-8 p-6 sm:p-8 rounded-2xl border-2 relative overflow-hidden ${
                isTransfiguration
                  ? "bg-gradient-to-b from-[#22150e] to-black border-amber-600/70 shadow-[0_15px_60px_rgba(217,119,6,0.3)]"
                  : "bg-gradient-to-b from-[#0c1228] to-black border-indigo-500/70 shadow-[0_15px_60px_rgba(99,102,241,0.3)]"
              }`}
            >
              {/* Insignia de Calificación T.I.M.O. */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br border-2 flex items-center justify-center font-black text-2xl sm:text-3xl ${
                      GRADE_METRICS[submission.grade]?.color || "from-amber-400 to-yellow-600 text-black border-amber-300"
                    }`}
                  >
                    {submission.grade}
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest text-stone-400 block">
                      Nota Oficial T.I.M.O.
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-amber-200">
                      {submission.grade_label}
                    </h3>
                    <p className="text-xs text-stone-400">
                      {GRADE_METRICS[submission.grade]?.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-950/80 border border-amber-500/60 shadow-lg">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="text-base sm:text-lg font-extrabold text-amber-300">
                    {submission.first_house_bonus
                      ? `+75 pts (+25 E + 50 Primera Casa) para ${studentHouse}`
                      : `${(submission.total_awarded_points ?? submission.points) >= 0 ? `+${submission.total_awarded_points ?? submission.points}` : (submission.total_awarded_points ?? submission.points)} pts para ${studentHouse}`}
                  </span>
                </div>
              </div>

              {submission.first_house_bonus && (
                <div className="my-5 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-400/60 flex items-center gap-3.5 text-amber-200 shadow-md">
                  <Trophy className="w-7 h-7 text-amber-300 shrink-0 animate-bounce" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wider block text-xs text-amber-300">
                      🏆 ¡PRIMERA CASA DEL TORNEO! (+75 PUNTOS)
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-amber-100/90">
                      ¡Tu casa se adjudica 75 puntos en total (+25 por Extraordinario y +50 por ser la primera en conseguirlo)!
                    </span>
                  </div>
                </div>
              )}

              {/* Dictamen del Profesor */}
              <div className="my-6">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs uppercase tracking-widest text-amber-500/80 font-bold">
                    Dictamen de {classInfo?.professor}:
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      playProclamationAudio(
                        submission.audio,
                        submission.audio_phrase || `¡${submission.total_awarded_points ?? submission.points} puntos para ${studentHouse}!`,
                        submission.total_awarded_points ?? submission.points
                      )
                    }
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 shadow-sm transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    Escuchar proclamación del profesor
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-black/60 border border-stone-800">
                  <p className="text-base sm:text-lg italic text-amber-100/90 leading-relaxed">
                    "{submission.feedback}"
                  </p>
                  {submission.advice && (
                    <p className="text-xs sm:text-sm text-stone-400 mt-3 pt-3 border-t border-stone-800/80">
                      <strong className="text-amber-400/90">Observación pedagógica:</strong> {submission.advice}
                    </p>
                  )}
                </div>
              </div>

              {/* Tu respuesta previa */}
              <div className="mb-6">
                <span className="text-xs uppercase tracking-widest text-stone-400 block mb-1">
                  Tu entrega registrada:
                </span>
                <p className="text-xs sm:text-sm text-stone-300 bg-stone-950/80 p-3 rounded-lg border border-stone-800 whitespace-pre-wrap font-mono">
                  {submission.answer}
                </p>
              </div>

              {/* Botón para reintentar o banner de examen sellado */}
              {isPassed ? (
                <div className="flex items-center justify-center gap-2.5 w-full py-4 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold text-center shadow-inner">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Examen T.I.M.O. superado con éxito ({submission.grade_label}). Calificación oficial sellada por el Claustro.</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-600/40 text-amber-200 text-sm font-bold transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>Volver a intentar para superar el examen</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulario de Entrega */}
        {(!submission || (isEditing && !isPassed)) && (
          <form
            onSubmit={handleSubmit}
            className={`flex-1 flex flex-col justify-between p-6 sm:p-8 rounded-2xl border shadow-2xl relative ${
              isTransfiguration
                ? "bg-gradient-to-b from-[#18181b] to-black border-[#4a2e1b]"
                : "bg-gradient-to-b from-[#080d1e] to-black border-indigo-900/60"
            }`}
          >
            <div>
              {isTransfiguration ? (
                <div className="space-y-6">
                  {/* Bloque 1: Informe de Auditoría Rúnica JSON */}
                  <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-amber-600/30">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-800/80">
                      <label htmlFor="json-audit" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-amber-400" />
                        <span>1. Informe de Auditoría Rúnica (JSON):</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleInsertJsonTemplate}
                        className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        Pegar plantilla JSON de ejemplo
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-400 mb-2">
                      Indica la variable COBOL afectada (<code className="text-amber-300">variable_cobol_afectada</code>) y la lista de arcas con su <code className="text-amber-300">numero_camara</code> y <code className="text-amber-300">tarifa_total_knuts</code>.
                    </p>
                    <textarea
                      id="json-audit"
                      rows={6}
                      value={jsonAuditText}
                      onChange={(e) => setJsonAuditText(e.target.value)}
                      placeholder={`{\n  "variable_cobol_afectada": "WS-...",\n  "camaras_afectadas": [\n    {\n      "numero_camara": 9999,\n      "tarifa_total_knuts": 1250.50\n    }\n  ]\n}`}
                      disabled={submitting}
                      className="w-full p-3 rounded-lg font-mono text-xs sm:text-sm leading-relaxed resize-y outline-none transition-all shadow-inner bg-[#101014] border border-[#452818] focus:border-amber-500 text-amber-100 placeholder:text-stone-700"
                    />
                  </div>

                  {/* Bloque 2: Script Python 3 (.py) */}
                  <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-amber-600/30">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-800/80">
                      <label htmlFor="python-script" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-amber-400" />
                        <span>2. Script Python 3 corregido (.py):</span>
                      </label>
                      <label className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono font-bold cursor-pointer transition-colors border border-amber-500/40">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{pythonFileName ? "Cambiar archivo .py" : "Adjuntar archivo .py"}</span>
                        <input
                          type="file"
                          accept=".py"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={submitting}
                        />
                      </label>
                    </div>

                    {pythonFileName && (
                      <div className="mb-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300 font-mono">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Archivo adjunto: <strong>{pythonFileName}</strong> ({pythonFileContent.split("\n").length} líneas)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPythonFileName("");
                            setPythonFileContent("");
                          }}
                          className="text-[11px] text-stone-400 hover:text-rose-400 underline cursor-pointer"
                        >
                          Quitar archivo
                        </button>
                      </div>
                    )}

                    <textarea
                      id="python-script"
                      rows={8}
                      value={pythonFileContent || answerText}
                      onChange={(e) => {
                        if (pythonFileName) {
                          setPythonFileContent(e.target.value);
                        } else {
                          setAnswerText(e.target.value);
                        }
                      }}
                      placeholder={`# Pega aquí tu código Python 3 si no adjuntas el archivo directamente:\nimport json\n\ndef calcular_tasa_camara(camara):\n    pass\n\ndef procesar_lote(lote):\n    return [calcular_tasa_camara(c) for c in lote]`}
                      disabled={submitting}
                      className="w-full p-3 rounded-lg font-mono text-xs sm:text-sm leading-relaxed resize-y outline-none transition-all shadow-inner bg-[#101014] border border-[#452818] focus:border-amber-500 text-stone-100 placeholder:text-stone-700"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <label
                      htmlFor="magic-answer"
                      className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2"
                    >
                      <Feather className="w-4 h-4 text-amber-400" />
                      <span>Consola de Combate Agéntico • Escribe el Tool Calling (JSON):</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleInsertTemplate}
                        className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        Insertar plantilla de entrega
                      </button>
                      <span className="text-xs text-stone-400 font-mono">
                        {answerText.length} caracteres
                      </span>
                    </div>
                  </div>

                  <textarea
                    id="magic-answer"
                    rows={10}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder={'[\n  {\n    "oleada": 1,\n    "tool_call": { "name": "lanzar_contrahechizo", "arguments": { "hechizo": "Expecto Patronum", "sector": "puente" } }\n  }\n]'}
                    disabled={submitting}
                    className="w-full p-4 rounded-xl font-mono text-xs sm:text-sm leading-relaxed resize-y outline-none transition-all shadow-inner bg-[#050711] border-2 border-indigo-900/80 focus:border-indigo-400 text-indigo-100 placeholder:text-indigo-900/70"
                  />
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 text-rose-300 bg-rose-950/60 border border-rose-800/80 p-3 rounded-xl text-xs sm:text-sm mt-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 justify-end">
              {submission && isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl text-stone-400 hover:text-white border border-stone-800 hover:border-stone-600 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancelar y ver nota previa
                </button>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  (isTransfiguration
                    ? !jsonAuditText.trim() || !(pythonFileContent || answerText).trim()
                    : !answerText.trim())
                }
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                  submitting ||
                  (isTransfiguration
                    ? !jsonAuditText.trim() || !(pythonFileContent || answerText).trim()
                    : !answerText.trim())
                    ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
                    : isTransfiguration
                    ? "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 shadow-[0_0_30px_rgba(217,119,6,0.5)] hover:scale-105 cursor-pointer font-black"
                    : "bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.5)] hover:scale-105 cursor-pointer font-black"
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>
                      {isTransfiguration
                        ? "McGonagall está examinando tus runas..."
                        : "El Comando está evaluando tus contrahechizos..."}
                    </span>
                  </>
                ) : (
                  <>
                    {isTransfiguration ? (
                      <Wand2 className="w-5 h-5 text-stone-950" />
                    ) : (
                      <Swords className="w-5 h-5 text-white" />
                    )}
                    <span>
                      {isTransfiguration
                        ? "🪄 Transfigurar Runas (Enviar a McGonagall)"
                        : "⚡ Desplegar Agente Defensor (Lanzar Hechizos)"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


