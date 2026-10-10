import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkles, ArrowLeft, Award, CheckCircle2, AlertCircle, Wand2, Shield, Eye, Flame, Map, Swords, Lock, Users } from "lucide-react";
import { StudentBadge } from "./StudentBadge";

export interface ClassAttachment {
  id: string;
  name: string;
  description: string;
  type: "code" | "data" | "text";
  language?: string;
  content: string;
}

export interface SubExercise {
  id: string;
  name: string;
  shortName: string;
  role: "attacker" | "defender";
  badge: string;
  assignment: string;
  hints: string[];
  placeholder: string;
  defaultTemplate?: string;
  submitButtonText: string;
}

export interface ClassItem {
  id: string;
  title: string;
  professor: string;
  subject: string;
  icon: string;
  description: string;
  lore?: string;
  assignment: string;
  hints?: string[];
  attachments?: ClassAttachment[];
  subExercises?: SubExercise[];
}


export interface SubmissionItem {
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
  test_results?: {
    total: number;
    passed: number;
    details: string[];
    items?: Array<{
      id?: string;
      name: string;
      passed: boolean;
      summary: string;
      modelReply?: string;
    }>;
  };
  attempt_count?: number;
  retry_penalty?: number;
}

interface ClassesHubProps {
  studentHouse: string;
  studentId: string;
  onSelectClass: (classId: string) => void;
  onBackToResult: () => void;
}

const HOUSE_THEMES: Record<string, { main: string; accent: string; text: string; name: string; emblem: string }> = {
  gryffindor: { main: "#740001", accent: "#d3a625", text: "#eeba30", name: "Gryffindor", emblem: "🦁" },
  slytherin: { main: "#1a472a", accent: "#aaaaaa", text: "#c0c0c0", name: "Slytherin", emblem: "🐍" },
  ravenclaw: { main: "#0e1a40", accent: "#946b2d", text: "#946b2d", name: "Ravenclaw", emblem: "🦅" },
  hufflepuff: { main: "#ecb939", accent: "#372e29", text: "#111111", name: "Hufflepuff", emblem: "🦡" },
};

export const ClassesHub: React.FC<ClassesHubProps> = ({
  studentHouse,
  studentId,
  onSelectClass,
  onBackToResult,
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [unlockedClasses, setUnlockedClasses] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionItem>>({});
  const [houseScores, setHouseScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const normalizedHouse = studentHouse.toLowerCase();
  const theme = HOUSE_THEMES[normalizedHouse] || HOUSE_THEMES.gryffindor;

  useEffect(() => {
    fetchClasses(true);
    const interval = setInterval(() => {
      fetchClasses(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [studentId]);

  const fetchClasses = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        setUnlockedClasses(Array.isArray(data.unlockedClasses) ? data.unlockedClasses : []);
        setSubmissions(data.submissions || {});
        setHouseScores(data.houseScores || {});
      }
    } catch (err) {
      console.error("Error al cargar las clases:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getClassIcon = (id: string) => {
    switch (id) {
      case "transfiguration":
        return <Wand2 className="w-8 h-8 text-amber-400" />;
      case "defense":
        return <Map className="w-8 h-8 text-amber-500" />;
      case "battle":
      case "divination":
        return <Swords className="w-8 h-8 text-rose-400" />;
      default:
        return <Sparkles className="w-8 h-8 text-yellow-400" />;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "E":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50";
      case "S":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      case "A":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
      case "I":
        return "bg-orange-500/20 text-orange-300 border-orange-500/50";
      case "D":
        return "bg-rose-500/20 text-rose-300 border-rose-500/50";
      case "T":
        return "bg-stone-800/80 text-red-400 border-red-600/50";
      default:
        return "bg-stone-500/20 text-stone-300 border-stone-500/50";
    }
  };

  const totalPointsEarned: number = (Object.values(submissions) as SubmissionItem[]).reduce(
    (acc: number, sub: SubmissionItem) => acc + (sub.total_awarded_points ?? sub.points ?? 0),
    0
  );


  return (
    <div className="fixed inset-0 w-screen h-screen bg-stone-950 text-white font-serif overflow-y-auto select-none">
      {/* Imagen de fondo de la Escuela de Hechicería sin texto con luminosidad calibrada para cualquier monitor */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.55] contrast-110 saturate-110 transition-all duration-700"
        style={{ backgroundImage: "url('/escuela-hechiceria-bg-no-tittle.jpg')" }}
      />
      {/* Degradado y viñeteado ambiental para preservar contraste y legibilidad */}
      <div className="fixed inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-black/60 pointer-events-none" />
      <div className="fixed inset-0 bg-radial from-transparent via-black/30 to-stone-950/85 pointer-events-none" />
      <div className="fixed inset-0 opacity-15 bg-[radial-gradient(#c5a059_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Contenedor principal */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 sm:py-10 flex flex-col min-h-screen justify-between">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-amber-900/40">
          <button
            onClick={onBackToResult}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-amber-600/40 text-amber-200 text-xs sm:text-sm transition-all hover:scale-105 cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Ver mi Sombrero</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Globo identificador de Casa y Alumno */}
            <StudentBadge studentHouse={studentHouse} studentId={studentId} />
          </div>
        </div>

        {/* Título de la Gran Sala de Desafíos */}
        <div className="text-center my-6 sm:my-8">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs tracking-widest uppercase mb-3"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Torneo de las Casas • Mini-Hackathon de IA
          </motion.div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-md tracking-wide">
            Los Tres Grandes Desafíos
          </h1>
          <p className="max-w-2xl mx-auto mt-2 text-stone-300 text-xs sm:text-sm md:text-base leading-relaxed">
            Aprende a <strong className="text-amber-300 font-semibold">guiar</strong>, <strong className="text-amber-300 font-semibold">proteger</strong> y <strong className="text-amber-300 font-semibold">estructurar</strong> las respuestas de los modelos de Google (Gemini y Gemma). Cada respuesta es evaluada al instante por los profesores agénticos para sumar puntos a tu casa.
          </p>
        </div>

        {/* Tarjetas de Clases / Desafíos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 my-4">
          {classes.map((cls, idx) => {
            const submission = submissions[cls.id];
            const isCompleted = Boolean(submission);
            const isUnlocked = unlockedClasses.includes(cls.id);

            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={isUnlocked ? { y: -4, transition: { duration: 0.2 } } : undefined}
                className={`relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-stone-900/90 to-black/95 border shadow-[0_10px_35px_rgba(0,0,0,0.8)] transition-all group overflow-hidden ${
                  isUnlocked
                    ? "border-amber-900/50 hover:border-amber-500/60"
                    : "border-stone-800/80 opacity-85"
                }`}
              >
                {/* Iluminación de fondo al hover */}
                {isUnlocked && (
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}

                {/* Imagen de fondo temática para cada desafío con luminosidad calibrada */}
                {cls.id === "transfiguration" && (
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-all duration-500 pointer-events-none ${
                      isUnlocked
                        ? "opacity-40 group-hover:opacity-65 filter contrast-115 brightness-105 scale-100 group-hover:scale-105"
                        : "opacity-15 filter grayscale contrast-125"
                    }`}
                    style={{ backgroundImage: "url('/transfiguracion-bg.jpg')" }}
                  />
                )}

                {cls.id === "defense" && (
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-all duration-500 pointer-events-none ${
                      isUnlocked
                        ? "opacity-40 group-hover:opacity-65 filter contrast-115 brightness-105 scale-100 group-hover:scale-105"
                        : "opacity-15 filter grayscale contrast-125"
                    }`}
                    style={{ backgroundImage: "url('/mapa-merodeador-bg.jpg')" }}
                  />
                )}

                {(cls.id === "battle" || cls.id === "divination") && (
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-all duration-500 pointer-events-none ${
                      isUnlocked
                        ? "opacity-40 group-hover:opacity-65 filter contrast-115 brightness-105 scale-100 group-hover:scale-105"
                        : "opacity-15 filter grayscale contrast-125"
                    }`}
                    style={{ backgroundImage: "url('/mortifago-bg.jpg')" }}
                  />
                )}

                {/* Viñeteado protector para máxima legibilidad */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/75 to-stone-950/40 pointer-events-none" />

                <div className="relative z-10 flex-1 flex flex-col">
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-14 h-14 rounded-xl bg-black/60 border flex items-center justify-center shadow-inner transition-transform ${
                        isUnlocked
                          ? "border-amber-600/30 group-hover:scale-105"
                          : "border-stone-700/60 opacity-60"
                      }`}
                    >
                      {isUnlocked ? getClassIcon(cls.id) : <Lock className="w-7 h-7 text-stone-400" />}
                    </div>
                    {!isUnlocked ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-900/90 text-stone-400 border border-stone-700/80 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-500/70" />
                        Sellado
                      </span>
                    ) : isCompleted ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getGradeColor(submission.grade)}`}>
                        {submission.first_house_bonus ? (
                          <span>🏆</span>
                        ) : ["E", "S", "A"].includes(submission.grade) ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        {submission.grade} • {
                          (submission.total_awarded_points ?? submission.points) > 0
                            ? `+${submission.total_awarded_points ?? submission.points}`
                            : (submission.total_awarded_points ?? submission.points)
                        } pts
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-600/40">
                        Activo
                      </span>
                    )}
                  </div>

                  {/* Título y Profesor */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-lg sm:text-xl font-bold text-amber-100 group-hover:text-amber-300 transition-colors">
                      {cls.title}
                    </h3>
                  </div>

                  {cls.id === "transfiguration" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2.5 rounded-md bg-[#2d1b11] border border-[#854d27]/60 text-[#fed7aa] text-[11px] font-mono font-bold w-fit">
                      <span>🪄</span>
                      <span>Guiar a la IA</span>
                    </div>
                  )}

                  {cls.id === "defense" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2.5 rounded-md bg-[#382110] border border-[#a26838]/50 text-[#e9cca0] text-[11px] font-mono font-bold w-fit">
                      <span>🛡️</span>
                      <span>Proteger a la IA</span>
                    </div>
                  )}

                  {(cls.id === "battle" || cls.id === "divination") && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2.5 rounded-md bg-rose-950/80 border border-rose-600/40 text-rose-300 text-[11px] font-mono font-bold w-fit">
                      <span>⚔️</span>
                      <span>Estructurar a la IA</span>
                    </div>
                  )}

                  <p className="text-xs sm:text-sm font-semibold text-amber-500/90 mb-2.5 flex items-center gap-1">
                    <span>🧙‍♂️</span>{" "}
                    {cls.id === "battle" || cls.id === "divination"
                      ? "Comando de Defensa de Hogwarts"
                      : cls.professor}
                  </p>

                  <p className="text-xs sm:text-sm text-stone-300/90 mb-3 leading-relaxed">
                    {cls.id === "transfiguration"
                      ? "Transmuta un antiguo manuscrito rúnico y repara el cálculo de las cámaras de Gringotts."
                      : cls.id === "defense"
                      ? "Descubre la identidad del merodeador secreto burlando al guardián y blinda el mapa con defensas mágicas."
                      : "Coordina los contrahechizos del castillo para repeler las cuatro oleadas del asedio mortífago."}
                  </p>
                  {isUnlocked && isCompleted && ["E", "S", "A"].includes(submission.grade) && (
                    <div className="mt-auto pt-2 flex items-start gap-2 text-[11px] text-emerald-300/90 bg-emerald-950/30 border border-emerald-700/40 rounded-lg px-2.5 py-2 font-sans">
                      <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>¡Desafío superado! Ayuda a tus compañeros de <strong>{theme.name}</strong> a resolverlo para sumar más puntos.</span>
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta: botón para entrar o bloqueado */}
                <div className="relative z-10 mt-4 pt-4 border-t border-stone-800/80">
                  {isUnlocked ? (
                    <button
                      onClick={() => onSelectClass(cls.id)}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-black shadow-lg hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all duration-300 cursor-pointer"
                    >
                      <Wand2 className="w-4 h-4 text-stone-900" />
                      <span>{isCompleted ? "Revisar / Mejorar Nota" : "Entrar a Clase"}</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 bg-stone-900/90 border border-stone-700/70 text-stone-400 cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4 text-stone-500" />
                      <span>Espera a la Profesora</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Marcador general de las Casas (Copa de las Casas) */}
        <div className="mt-6 pt-5 pb-2 border-t border-amber-900/30">
          <div className="flex items-center justify-between text-xs text-stone-400 uppercase tracking-widest mb-3">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Copa de las Casas
            </span>
            <span className="text-stone-500">Puntos en tiempo real</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["gryffindor", "slytherin", "ravenclaw", "hufflepuff"] as const).map((h) => {
              const hTheme = HOUSE_THEMES[h];
              const score = houseScores[h] ?? 0;
              const isUserHouse = h === normalizedHouse;

              return (
                <div
                  key={h}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isUserHouse
                      ? "bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                      : "bg-black/50 border-stone-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{hTheme.emblem}</span>
                    <span className={`text-xs font-bold ${isUserHouse ? "text-amber-200" : "text-stone-300"}`}>
                      {hTheme.name}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-400">
                    {score} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
