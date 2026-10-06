import React from "react";
import { motion } from "motion/react";
import { Award, CheckCircle2, RefreshCw, Trophy, Volume2, ClipboardCheck, AlertCircle } from "lucide-react";
import type { SubmissionItem } from "../ClassesHub";
import { GRADE_METRICS, playProclamationAudio } from "./types";

interface EvaluationResultCardProps {
  submission: SubmissionItem;
  studentHouse: string;
  professorName?: string;
  isPassed: boolean;
  onRetry: () => void;
  theme?: "dark" | "parchment";
  isTransfiguration?: boolean;
  classId?: string;
}

const TestResultsBreakdown: React.FC<{
  testResults?: { total: number; passed: number; details: string[] };
  isParchment?: boolean;
}> = ({ testResults, isParchment = false }) => {
  if (!testResults || !Array.isArray(testResults.details) || testResults.details.length === 0) {
    return null;
  }

  const { total = testResults.details.length, passed = 0, details = [] } = testResults;

  if (isParchment) {
    return (
      <div className="mb-5 p-4 rounded-xl bg-[#f7efdc] border border-[#8a5223]/50">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[#8a5223]/25">
          <span className="text-xs uppercase tracking-widest text-[#703b15] font-bold flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-[#8a5223]" />
            Validación de Criterios Oficiales:
          </span>
          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#ead3a4] text-[#4d280e] border border-[#8a5223]/40">
            {passed} / {total} superados
          </span>
        </div>
        <ul className="space-y-2 text-xs sm:text-sm font-sans">
          {details.map((detail, idx) => {
            const isOk = detail.trim().startsWith("✓");
            const cleanText = detail.replace(/^[✓✗]\s*/, "");
            return (
              <li
                key={idx}
                className={`flex items-start gap-2.5 p-2 rounded-lg border ${
                  isOk
                    ? "bg-[#e8f3e8] border-emerald-600/30 text-emerald-900"
                    : "bg-[#faeae6] border-rose-600/30 text-rose-950 font-medium"
                }`}
              >
                {isOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{cleanText}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 rounded-xl bg-black/50 border border-stone-800">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-stone-800/80">
        <span className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-amber-400" />
          Comprobaciones Técnicas del Tribunal:
        </span>
        <span
          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
            passed === total
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
              : "bg-amber-950/60 text-amber-300 border-amber-500/40"
          }`}
        >
          {passed} / {total} superadas
        </span>
      </div>
      <ul className="space-y-2 text-xs sm:text-sm font-sans">
        {details.map((detail, idx) => {
          const isOk = detail.trim().startsWith("✓");
          const cleanText = detail.replace(/^[✓✗]\s*/, "");
          return (
            <li
              key={idx}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                isOk
                  ? "bg-emerald-950/20 border-emerald-600/30 text-emerald-200"
                  : "bg-rose-950/25 border-rose-600/40 text-rose-200 font-medium"
              }`}
            >
              {isOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{cleanText}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const EvaluationResultCard: React.FC<EvaluationResultCardProps> = ({
  submission,
  studentHouse,
  professorName,
  isPassed,
  onRetry,
  theme = "dark",
  isTransfiguration = false,
  classId,
}) => {
  const isParchment = theme === "parchment";
  const points = submission.total_awarded_points ?? submission.points;
  const gradeMetric = GRADE_METRICS[submission.grade];
  const effectiveClassId = submission.class_id || classId || (isParchment ? "defense" : "transfiguration");
  const isMaxGrade = submission.grade === "E";
  const currentAttempts = submission.attempt_count || 1;
  const nextAttempt = currentAttempts + 1;
  const nextPenalty = currentAttempts * 2;
  const nextMaxPoints = Math.max(0, 25 - nextPenalty);

  const handleAudioPlay = () => {
    const fallbackPhrase = `¡${points} puntos para ${studentHouse}!`;
    playProclamationAudio(submission.audio, submission.audio_phrase || fallbackPhrase, points, effectiveClassId);
  };

  if (isParchment) {
    return (
      <motion.div
        key="verdict-defense"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="mb-8 p-6 sm:p-8 rounded-2xl bg-[#fffaf0] border-3 border-[#703b15] shadow-[0_12px_45px_rgba(70,35,10,0.35)] relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b-2 border-[#8a5223]/30">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-3 flex items-center justify-center font-black text-2xl sm:text-3xl ${
                gradeMetric?.color || "from-amber-400 to-yellow-600 text-stone-950 border-amber-500"
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
              <p className="text-xs text-[#5c3517]">{gradeMetric?.desc}</p>
              {(submission.attempt_count || 1) > 1 && (
                <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded bg-[#ead3a4] text-[#4d280e] border border-[#8a5223]/30">
                  Intento #{submission.attempt_count} (penalización de -{submission.retry_penalty ?? ((submission.attempt_count! - 1) * 2)} pts aplicada)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ead3a4] border-2 border-[#7a441b] shadow-sm">
            <Award className="w-5 h-5 text-[#7a441b]" />
            <span className="text-base sm:text-lg font-black text-[#2f180a]">
              {submission.first_house_bonus
                ? `+75 pts (+25 E + 50 Primera Casa) para ${studentHouse}`
                : `${points >= 0 ? `+${points}` : points} pts para ${studentHouse}`}
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

        <div className="my-5 p-5 rounded-xl bg-[#f4e7cb] border border-[#8f5a2e]/60">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <p className="text-xs sm:text-sm uppercase tracking-widest text-[#703b15] font-bold">
              Dictamen del Profesor {professorName || "Remus Lupin"}:
            </p>
            <button
              type="button"
              onClick={handleAudioPlay}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ded0b1] hover:bg-[#d0be98] text-[#4d280e] text-xs sm:text-sm font-bold border border-[#7a441b]/50 shadow-sm transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#7a441b]" />
              Escuchar voz
            </button>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl italic text-[#2b1609] leading-relaxed">
            "{submission.feedback}"
          </p>
          {submission.advice && (
            <p className="text-sm sm:text-base text-[#4d2a10] mt-3.5 pt-3 border-t border-[#ceb387]">
              <strong className="text-[#753b13]">Consejo de Lunático:</strong> {submission.advice}
            </p>
          )}
        </div>

        <TestResultsBreakdown testResults={submission.test_results} isParchment={true} />

        <div className="mb-5">
          <span className="text-xs sm:text-sm uppercase tracking-widest text-[#703b15] font-bold block mb-1.5">
            Tu pergamino entregado:
          </span>
          <p className="text-xs sm:text-sm md:text-[14px] text-[#2c170a] bg-[#fbf5e7] p-3.5 rounded-lg border border-[#8a5223]/50 whitespace-pre-wrap font-mono">
            {submission.answer}
          </p>
        </div>

        {isMaxGrade ? (
          <div className="flex items-center justify-center gap-2.5 w-full py-4 px-4 rounded-xl bg-[#2e1708] border border-[#8a4218]/40 text-[#dfcaa0] text-xs sm:text-sm font-semibold text-center shadow-inner">
            <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Examen T.I.M.O. completado con la máxima nota (Extraordinario). Calificación sellada con honores.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#f5e9d0] border border-[#8a5223]/40 text-xs sm:text-sm text-[#3b1e0d]">
              <p className="font-bold flex items-center gap-1.5 text-[#703b15] mb-1">
                <span>🎯 Oportunidad de subir nota:</span>
              </p>
              <p className="leading-relaxed">
                Se respeta la nota máxima base que hayas alcanzado y se aplica una penalización acumulada de <strong>-{nextPenalty} puntos</strong> por reintentos (<strong>intento #{nextAttempt}</strong>). Si mantienes tu misma base, se restarán 2 puntos a tu casa; si logras mejorar tu base (pudiendo alcanzar hasta <strong>{nextMaxPoints} pts</strong> con un Extraordinario), se sumará la diferencia a tu casa.
              </p>
            </div>
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#391e0d] hover:bg-[#291407] text-[#fff8ee] text-sm font-bold transition-all cursor-pointer shadow-md hover:scale-[1.01]"
            >
              <RefreshCw className="w-4 h-4 text-amber-300" />
              <span>
                Reenviar solución para subir nota (-{nextPenalty} pts en intento #{nextAttempt})
              </span>
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  return (
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br border-2 flex items-center justify-center font-black text-2xl sm:text-3xl ${
              gradeMetric?.color || "from-amber-400 to-yellow-600 text-black border-amber-300"
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
            <p className="text-xs text-stone-400">{gradeMetric?.desc}</p>
            {(submission.attempt_count || 1) > 1 && (
              <span className="inline-block mt-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Intento #{submission.attempt_count} (penalización de -{submission.retry_penalty ?? ((submission.attempt_count! - 1) * 2)} pts aplicada)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-950/80 border border-amber-500/60 shadow-lg">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-base sm:text-lg font-extrabold text-amber-300">
            {submission.first_house_bonus
              ? `+75 pts (+25 E + 50 Primera Casa) para ${studentHouse}`
              : `${points >= 0 ? `+${points}` : points} pts para ${studentHouse}`}
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

      <div className="my-6">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-amber-500/90 font-bold">
            Dictamen de {professorName || "Profesor"}:
          </p>
          <button
            type="button"
            onClick={handleAudioPlay}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold border border-amber-500/40 shadow-sm transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            Escuchar proclamación del profesor
          </button>
        </div>
        <div className="p-5 rounded-xl bg-black/60 border border-stone-800">
          <p className="text-lg sm:text-xl md:text-2xl italic text-amber-100/95 leading-relaxed">
            "{submission.feedback}"
          </p>
          {submission.advice && (
            <p className="text-sm sm:text-base text-stone-300 mt-3.5 pt-3 border-t border-stone-800/80">
              <strong className="text-amber-400">Observación pedagógica:</strong> {submission.advice}
            </p>
          )}
        </div>
      </div>

      <TestResultsBreakdown testResults={submission.test_results} />

      <div className="mb-6">
        <span className="text-xs sm:text-sm uppercase tracking-widest text-stone-400 font-bold block mb-1.5">
          Tu entrega registrada:
        </span>
        <p className="text-xs sm:text-sm md:text-[14px] text-stone-300 bg-stone-950/80 p-3.5 rounded-lg border border-stone-800 whitespace-pre-wrap font-mono">
          {submission.answer}
        </p>
      </div>

      {isMaxGrade ? (
        <div className="flex items-center justify-center gap-2.5 w-full py-4 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold text-center shadow-inner">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Examen T.I.M.O. superado con la máxima calificación (Extraordinario). Calificación sellada con honores.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 text-xs sm:text-sm text-stone-200">
            <p className="font-bold flex items-center gap-2 text-amber-300 mb-1">
              <span>🎯 Oportunidad de subir nota:</span>
            </p>
            <p className="text-stone-300 leading-relaxed">
              Se respeta la nota máxima base que hayas alcanzado y se aplica una penalización acumulada de <strong>-{nextPenalty} puntos</strong> por reintentos (<strong>intento #{nextAttempt}</strong>). Si mantienes tu misma base, se restarán 2 puntos a tu casa; si logras mejorar tu base (pudiendo alcanzar hasta <strong>{nextMaxPoints} pts</strong> con un Extraordinario), se sumará la diferencia a tu casa.
            </p>
          </div>
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-black text-sm sm:text-base transition-all cursor-pointer shadow-lg hover:scale-[1.01]"
          >
            <RefreshCw className="w-4 h-4 text-stone-950" />
            <span>
              Reenviar solución para subir nota (-{nextPenalty} pts en intento #{nextAttempt})
            </span>
          </button>
        </div>
      )}
    </motion.div>
  );
};
