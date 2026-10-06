import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Code2,
  Database,
  Lightbulb,
  FileText,
  Shield,
  Flame,
  Lock,
  Unlock,
  Eye,
} from "lucide-react";
import type { ClassItem, SubmissionItem } from "./ClassesHub";
import { PROFESSOR_AVATARS, playProclamationAudio, type EvaluationResponse } from "./class-detail/types";
import { AssignmentViewer } from "./class-detail/AssignmentViewer";
import { EvaluationResultCard } from "./class-detail/EvaluationResultCard";
import { TransfigurationForm } from "./class-detail/TransfigurationForm";
import { BattleForm } from "./class-detail/BattleForm";
import { DefenseView } from "./class-detail/DefenseView";

interface ClassDetailProps {
  classId: string;
  studentHouse: string;
  studentId: string;
  workshopId?: string;
  onBack: () => void;
}

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
  const [testsFileName, setTestsFileName] = useState("");
  const [testsFileContent, setTestsFileContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("mission");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSubExerciseId, setSelectedSubExerciseId] = useState<string>("defense_attack");
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

  const isPassed = Boolean(submission && ["E", "S", "A"].includes(submission.grade));
  const professorData = PROFESSOR_AVATARS[classId] || PROFESSOR_AVATARS.transfiguration;

  useEffect(() => {
    fetchClassData();
  }, [classId, studentId]);

  const parseTransfigurationSubmission = (answer: string) => {
    const jsonMatch = answer.match(/```json\s*([\s\S]*?)```/i);
    if (jsonMatch?.[1]) {
      setJsonAuditText(jsonMatch[1].trim());
    }
    const testsMatch = answer.match(/(?:### BATERÍA DE TESTS|### TESTS)[\s\S]*?```(?:python|py)\s*([\s\S]*?)```/i);
    if (testsMatch?.[1]) {
      setTestsFileContent(testsMatch[1].trim());
    }
    const pyBlocks = Array.from(answer.matchAll(/```(?:python|py)\s*([\s\S]*?)```/gi));
    if (pyBlocks.length >= 2) {
      setPythonFileContent(pyBlocks[0][1].trim());
      if (!testsMatch) {
        setTestsFileContent(pyBlocks[1][1].trim());
      }
    } else if (pyBlocks.length === 1 && !testsMatch) {
      setPythonFileContent(pyBlocks[0][1].trim());
    }
  };

  const fetchClassData = async () => {
    try {
      const res = await fetch("/api/classes");
      if (!res.ok) return;

      const data = await res.json();
      const found = (data.classes || []).find((c: ClassItem) => c.id === classId);
      setClassInfo(found || null);

      const prev = (data.submissions || {})[classId];
      if (prev) {
        setSubmission(prev);
        setAnswerText(prev.answer || "");
        if (classId === "transfiguration" && prev.answer) {
          parseTransfigurationSubmission(prev.answer);
        }
      } else {
        setIsEditing(true);
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

  const buildFinalAnswer = (): string | null => {
    if (isTransfiguration) {
      const scriptCode = (pythonFileContent || answerText).trim();
      const testsCode = testsFileContent.trim();
      if (!jsonAuditText.trim()) {
        setErrorMessage("Por favor, completa el informe de auditoría Rúnica en formato JSON antes de enviar.");
        return null;
      }
      if (!scriptCode) {
        setErrorMessage("Por favor, adjunta o escribe tu código Python 3 antes de enviar.");
        return null;
      }
      if (!testsCode) {
        setErrorMessage("Por favor, adjunta o escribe tus tests Python 3 antes de enviar.");
        return null;
      }
      return `### Informe de auditoría rúnica (JSON):\n\`\`\`json\n${jsonAuditText.trim()}\n\`\`\`\n\n### Código Python 3:\n\`\`\`python\n${scriptCode}\n\`\`\`\n\n### Tests Python 3:\n\`\`\`python\n${testsCode}\n\`\`\``;
    }

    const trimmed = answerText.trim();
    if (!trimmed) {
      setErrorMessage("Por favor, redacta tu respuesta antes de enviarla.");
      return null;
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalAnswer = buildFinalAnswer();
    if (!finalAnswer) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const effectiveStudentId =
        (studentId && studentId.trim()) ||
        localStorage.getItem("sorting_hat_student_id") ||
        "";

      if (!effectiveStudentId) {
        setErrorMessage("No se ha detectado tu identidad de alumno. Por favor, realiza la Ceremonia de Selección antes de enviar.");
        setSubmitting(false);
        return;
      }

      const effectiveHouse =
        (studentHouse && studentHouse.trim()) ||
        localStorage.getItem("sorting_hat_house") ||
        "gryffindor";

      const effectiveWorkshopId =
        (workshopId && workshopId.trim()) ||
        localStorage.getItem("sorting_hat_workshop_id") ||
        undefined;

      const remoteServiceUrl = (import.meta as any).env?.VITE_EVALUATION_SERVICE_URL;
      const targetUrl = remoteServiceUrl
        ? `${remoteServiceUrl.replace(/\/$/, "")}/api/evaluate`
        : "/api/evaluate";

      const requestPayload = {
        workshopId: effectiveWorkshopId,
        studentId: effectiveStudentId,
        house: effectiveHouse.toLowerCase(),
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

  if (isDefense) {
    return (
      <DefenseView
        classInfo={classInfo}
        studentHouse={studentHouse}
        submission={submission}
        isPassed={isPassed}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        selectedSubExerciseId={selectedSubExerciseId}
        setSelectedSubExerciseId={setSelectedSubExerciseId}
        answerText={answerText}
        setAnswerText={setAnswerText}
        submitting={submitting}
        errorMessage={errorMessage}
        onBack={onBack}
        onSubmit={handleSubmit}
      />
    );
  }

  const attachments = classInfo?.attachments || [];
  const hasAttachments = attachments.length > 0;
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

        {/* Panel de radar táctico (Solo Batalla) */}
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

        {/* Encabezado del Aula */}
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
            className={`mb-6 p-5 sm:p-6 rounded-xl border text-sm sm:text-base md:text-[17px] leading-relaxed italic flex items-start gap-3.5 ${
              isTransfiguration
                ? "bg-amber-950/20 border-amber-800/40 text-amber-200/95"
                : "bg-indigo-950/30 border-indigo-800/40 text-indigo-200/95"
            }`}
          >
            <BookOpen className="w-5 h-5 flex-shrink-0 mt-1 text-amber-400" />
            <div>
              <strong className="text-amber-300 not-italic block mb-1.5 text-base sm:text-lg font-bold">
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
              <div className="flex items-center gap-2.5 text-xs sm:text-sm uppercase tracking-wider text-amber-400 font-bold mb-4 pb-2 border-b border-amber-900/40">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Objetivos Oficiales del Claustro</span>
              </div>
              <AssignmentViewer assignment={classInfo?.assignment || ""} isTransfiguration={isTransfiguration} />
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
                        <td className="pl-4 whitespace-pre font-mono">{line}</td>
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
                        "Auditoría y detección de discrepancias",
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
            <EvaluationResultCard
              submission={submission}
              studentHouse={studentHouse}
              professorName={classInfo?.professor}
              isPassed={isPassed}
              onRetry={() => setIsEditing(true)}
              theme="dark"
              isTransfiguration={isTransfiguration}
            />
          )}
        </AnimatePresence>

        {/* Formulario de Entrega */}
        {(!submission || (isEditing && !isPassed)) && (
          isTransfiguration ? (
            <TransfigurationForm
              jsonAuditText={jsonAuditText}
              setJsonAuditText={setJsonAuditText}
              pythonFileName={pythonFileName}
              setPythonFileName={setPythonFileName}
              pythonFileContent={pythonFileContent}
              setPythonFileContent={setPythonFileContent}
              testsFileName={testsFileName}
              setTestsFileName={setTestsFileName}
              testsFileContent={testsFileContent}
              setTestsFileContent={setTestsFileContent}
              submitting={submitting}
              errorMessage={errorMessage}
              hasPreviousSubmission={Boolean(submission)}
              onCancelEdit={() => setIsEditing(false)}
              onSubmit={handleSubmit}
            />
          ) : (
            <BattleForm
              answerText={answerText}
              setAnswerText={setAnswerText}
              submitting={submitting}
              errorMessage={errorMessage}
              hasPreviousSubmission={Boolean(submission)}
              onCancelEdit={() => setIsEditing(false)}
              onSubmit={handleSubmit}
            />
          )
        )}
      </div>
    </div>
  );
};
