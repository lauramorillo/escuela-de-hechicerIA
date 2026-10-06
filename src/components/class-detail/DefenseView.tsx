import React from "react";
import { AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  Feather,
  Lightbulb,
  AlertCircle,
  RefreshCw,
  Wand2,
  Shield,
} from "lucide-react";
import type { ClassItem, SubmissionItem, SubExercise } from "../ClassesHub";
import { MaraudersMapBackground } from "../MaraudersMapBackground";
import { EvaluationResultCard } from "./EvaluationResultCard";

interface DefenseViewProps {
  classInfo: ClassItem | null;
  studentHouse: string;
  submission: SubmissionItem | null;
  isPassed: boolean;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  selectedSubExerciseId: string;
  setSelectedSubExerciseId: (val: string) => void;
  answerText: string;
  setAnswerText: (val: string) => void;
  submitting: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const DefenseView: React.FC<DefenseViewProps> = ({
  classInfo,
  studentHouse,
  submission,
  isPassed,
  isEditing,
  setIsEditing,
  selectedSubExerciseId,
  setSelectedSubExerciseId,
  answerText,
  setAnswerText,
  submitting,
  errorMessage,
  onBack,
  onSubmit,
}) => {
  const canRetry = !submission || submission.grade !== "E";
  const currentSubExercise: SubExercise | undefined =
    classInfo?.subExercises?.find((s) => s.id === selectedSubExerciseId) ||
    classInfo?.subExercises?.[0];

  const handleSubExerciseChange = (sub: SubExercise) => {
    setSelectedSubExerciseId(sub.id);
    if (!answerText.trim() || answerText === currentSubExercise?.defaultTemplate) {
      setAnswerText(sub.defaultTemplate);
    }
  };

  const handleInsertTemplate = () => {
    if (currentSubExercise?.defaultTemplate) {
      setAnswerText(currentSubExercise.defaultTemplate);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#180e07] text-[#2c180d] font-serif overflow-y-auto select-none">
      {/* Fondo inmersivo del Mapa del Merodeador */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.78] contrast-115 saturate-110 transition-all duration-700"
        style={{ backgroundImage: "url('/mapa-merodeador-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-[#150a04]/90 via-[#1a0c05]/50 to-[#0e0602]/70 pointer-events-none" />
      <div className="fixed inset-0 bg-radial from-transparent via-[#150a04]/30 to-[#070301]/85 pointer-events-none" />

      {/* Huellas superpuestas y animaciones */}
      <MaraudersMapBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col min-h-screen">
        {/* Barra superior de navegación */}
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

        {/* Cartel Canónico de los Merodeadores */}
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

        {/* Rastro de Huellas */}
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
                onClick={() => handleSubExerciseChange(sub)}
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
          <div className="mb-6 p-6 sm:p-7 rounded-2xl bg-[#fbf5e7] border-2 border-[#7a481c] shadow-md">
            <div className="flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider text-[#7a431c] font-bold mb-3 pb-2 border-b border-[#cbb085]">
              <Feather className="w-4 h-4 text-[#7a431c]" />
              <span>Instrucciones del {currentSubExercise.name}</span>
            </div>
            <p className="text-base sm:text-lg text-[#2e1709] leading-relaxed font-serif whitespace-pre-line">
              {currentSubExercise.assignment}
            </p>

            {currentSubExercise.hints && currentSubExercise.hints.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#cbb085]">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#693714] flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-[#854519]" />
                  Pistas tácticas:
                </span>
                <ul className="space-y-2 text-sm sm:text-base text-[#44220b]">
                  {currentSubExercise.hints.map((hint, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
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
            <EvaluationResultCard
              submission={submission}
              studentHouse={studentHouse}
              professorName={classInfo?.professor}
              isPassed={isPassed}
              onRetry={() => setIsEditing(true)}
              theme="parchment"
              classId="defense"
            />
          )}
        </AnimatePresence>

        {/* Formulario de Entrega */}
        {(!submission || (isEditing && canRetry)) && (
          <form
            onSubmit={onSubmit}
            className="flex-1 flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#fffbf2] border-3 border-[#6b3813] shadow-[0_10px_35px_rgba(70,35,10,0.2)] relative"
          >
            <div>
              {submission && (
                <div className="mb-4 p-3.5 rounded-xl bg-[#ead4a8] border border-[#8a4218]/40 text-xs sm:text-sm text-[#351a0a]">
                  <strong className="block text-[#703b15] mb-1">
                    🎯 Reenvío para subir nota (Intento #{(submission.attempt_count || 1) + 1}):
                  </strong>
                  <span>
                    Este reintento aplicará una penalización de <strong>-{(submission.attempt_count || 1) * 2} puntos</strong> sobre la nota conseguida. Si la nueva entrega no supera tu nota actual de <strong>{submission.total_awarded_points ?? submission.points} pts</strong>, se conservará la previa.
                  </span>
                </div>
              )}
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
};
