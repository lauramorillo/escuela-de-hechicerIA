import React, { useRef, useState } from "react";
import { Code2, RefreshCw, Swords, AlertCircle, Upload, RotateCcw, ShieldCheck, Wrench, BookOpen, Eye, X, ExternalLink } from "lucide-react";

interface BattleFormProps {
  answerText: string;
  setAnswerText: (val: string) => void;
  submitting: boolean;
  errorMessage: string | null;
  hasPreviousSubmission: boolean;
  attemptNumber?: number;
  retryPenalty?: number;
  onCancelEdit: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const DEFAULT_ADK_AGENT_SKELETON = `from google.adk.agents import Agent


# =====================================================================
# 1. ACCIÓN DE EJEMPLO (YA CREADA Y CONFIGURADA):
# =====================================================================
def espantar_dementores() -> dict:
    """Conjura el encantamiento Patronus para ahuyentar a los Dementores."""
    return {
        "hechizo": "Expecto Patronum",
    }


# =====================================================================
# TODO: CREA LAS 6 FUNCIONES DEFENSIVAS RESTANTES
# Abre el Grimorio de Hechizos para descubrir qué encantamiento
# corresponde a cada acción y devuélvelo en {"hechizo": "..."}:
#
# 2. lanzar_escudo() -> dict          (Conjurar un escudo mágico frente a maleficios)
# 3. activar_estatuas() -> dict       (Animar las estatuas y armaduras del castillo)
# 4. desarmar_adversario() -> dict    (Desarmar a un oponente en duelo)
# 5. extinguir_incendio() -> dict     (Invocar agua para sofocar fuego e incendios)
# 6. petrificar_enemigo() -> dict     (Inmovilizar y petrificar el cuerpo de un enemigo)
# 7. iluminar_tinieblas() -> dict     (Encender luz mágica en la varita ante la oscuridad)
#
# Recuerda incluir el type hint (-> dict), un docstring descriptivo
# y devolver un diccionario {"hechizo": "<NOMBRE_DEL_HECHIZO>"}.
# =====================================================================


# =====================================================================
# TODO: COMPLETA EL AGENTE DEFENSOR (root_agent)
# 1. Define en 'instruction' el comportamiento defensivo del agente.
# 2. Registra las 7 funciones dentro de la lista 'tools=[...]'.
# =====================================================================
root_agent = Agent(
    name="guardian_hogwarts",
    model="gemini-2.5-flash",
    description="Guardián mágico autónomo experto en encantamientos defensivos para proteger Hogwarts.",
    instruction="""
    Eres el Guardián Mágico Autónomo encargado de defender Hogwarts donde la Orden del Fénix no alcanza.
    Ante cada amenaza, invoca inmediatamente la herramienta defensiva correspondiente:
    - Si atacan los Dementores, invoca espantar_dementores.
    - TODO: Añade aquí las directrices para el resto de acciones defensivas.
    """,
    tools=[
        espantar_dementores,
        # Añade aquí: lanzar_escudo, activar_estatuas, desarmar_adversario,
        #             extinguir_incendio, petrificar_enemigo, iluminar_tinieblas
    ],
)
`;

export const BattleForm: React.FC<BattleFormProps> = ({
  answerText,
  setAnswerText,
  submitting,
  errorMessage,
  hasPreviousSubmission,
  attemptNumber = 2,
  retryPenalty = 2,
  onCancelEdit,
  onSubmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [showGrimoire, setShowGrimoire] = useState<boolean>(false);
  const canSubmit = !submitting && answerText.trim().length > 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === "string") {
        setAnswerText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex-1 flex flex-col justify-between p-6 sm:p-8 rounded-2xl border-2 shadow-2xl relative bg-gradient-to-b from-[#120b10] to-black border-rose-900/60"
    >
      <div>
        {hasPreviousSubmission && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-transparent border border-amber-500/40 text-xs sm:text-sm text-amber-200">
            <span className="font-bold block text-amber-300 mb-1">
              🎯 Reenvío para subir nota (Intento #{attemptNumber}):
            </span>
            <span className="leading-relaxed block">
              Este reintento aplicará una penalización acumulada de <strong>-{retryPenalty} puntos</strong> sobre tu nota máxima base (ej. un Extraordinario obtendrá {Math.max(0, 25 - retryPenalty)} pts). Si mantienes tu misma nota base, se restarán 2 puntos a tu casa; si mejoras tu base, se sumará el incremento.
            </span>
          </div>
        )}

        {/* Resumen rápido de las 7 acciones defensivas Python requeridas + botón del Grimorio */}
        <div className="mb-5 p-4 rounded-xl bg-rose-950/25 border border-rose-800/50">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>7 Acciones Defensivas Python (`tools=[...]`)</span>
            </div>

            <button
              type="button"
              onClick={() => setShowGrimoire((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              {showGrimoire ? <X className="w-3.5 h-3.5 text-amber-300" /> : <BookOpen className="w-3.5 h-3.5 text-amber-300" />}
              <span>{showGrimoire ? "Ocultar Grimorio de Hechizos" : "📜 Abrir Grimorio de Hechizos (Chuleta)"}</span>
            </button>
          </div>

          {showGrimoire && (
            <div className="mb-4 p-3 rounded-xl bg-black/80 border-2 border-amber-600/50 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-900/40">
                <div className="flex items-center gap-2 text-xs text-amber-200 font-bold">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Grimorio de Encantamientos de Hogwarts — Busca el hechizo adecuado para cada función</span>
                </div>
                <a
                  href="/grimorio-hechizos.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-100 underline font-mono"
                >
                  <span>Abrir imagen a tamaño completo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-center bg-[#120e0a] rounded-lg p-2 overflow-hidden">
                <img
                  src="/grimorio-hechizos.jpg"
                  alt="Grimorio de Encantamientos de Hogwarts"
                  className="max-h-[540px] w-auto rounded-lg object-contain border border-amber-900/40 shadow-lg"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-black/60 border border-emerald-800/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-emerald-300">1. espantar_dementores() -&gt; dict</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  En esqueleto
                </span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                • Ahuyentar Dementores: devuelve <code className="text-emerald-300">{`{"hechizo": "Expecto Patronum"}`}</code>.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-amber-700/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">2. lanzar_escudo() -&gt; dict</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                • Conjurar un escudo mágico protector para desviar maleficios y hechizos enemigos.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-amber-700/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">3. activar_estatuas() -&gt; dict</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                • Animar las estatuas y armaduras de piedra para que cobren vida y defiendan el castillo.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-amber-700/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">4. desarmar_adversario() -&gt; dict</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                • Desarmar a un oponente en duelo haciendo volar su varita.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-amber-700/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">5. extinguir_incendio() -&gt; dict</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                • Invocar un chorro de agua desde la punta de la varita para sofocar fuegos e incendios.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-amber-700/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">6. petrificar_enemigo() -&gt; dict</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                • Inmovilizar y petrificar por completo el cuerpo de un enemigo o intruso.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-amber-700/50 md:col-span-2">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">7. iluminar_tinieblas() -&gt; dict</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                • Encender luz mágica en la punta de la varita para iluminar lugares sumidos en la oscuridad.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <label
            htmlFor="magic-answer"
            className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2"
          >
            <Code2 className="w-4 h-4 text-amber-400" />
            <span>Código Python del Agente ADK (`agent.py`):</span>
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".py,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900/80 border border-rose-700/60 text-rose-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-rose-400" />
              <span>{uploadedFileName ? `Archivo: ${uploadedFileName}` : "Subir archivo .py"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAnswerText(DEFAULT_ADK_AGENT_SKELETON);
                setUploadedFileName("");
              }}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Restaurar esqueleto ADK</span>
            </button>

            <span className="text-xs text-stone-400 font-mono">
              {answerText.length} caracteres
            </span>
          </div>
        </div>

        <textarea
          id="magic-answer"
          rows={24}
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder={DEFAULT_ADK_AGENT_SKELETON}
          disabled={submitting}
          spellCheck={false}
          className="w-full p-4 rounded-xl font-mono text-xs sm:text-sm leading-relaxed resize-y outline-none transition-all shadow-inner bg-[#0b0709] border-2 border-rose-900/70 focus:border-amber-500 text-stone-100 placeholder:text-stone-700"
        />

        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-stone-400 font-sans">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Al enviar, el profesor arrancará tu <code className="text-amber-300">root_agent</code> y simulará distintos ataques mortífagos para comprobar qué funciones invoca y qué hechizo devuelve cada una.
          </span>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 text-rose-300 bg-rose-950/60 border border-rose-800/80 p-3 rounded-xl text-xs sm:text-sm mt-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 justify-end">
        {hasPreviousSubmission && (
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-stone-400 hover:text-white border border-stone-800 hover:border-stone-600 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            Cancelar y ver nota previa
          </button>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
            !canSubmit
              ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
              : "bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 hover:from-rose-600 hover:to-amber-500 text-white shadow-[0_0_30px_rgba(225,29,72,0.5)] hover:scale-105 cursor-pointer font-black"
          }`}
        >
          {submitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-white" />
              <span>Arrancando tu root_agent y simulando el asedio...</span>
            </>
          ) : (
            <>
              <Swords className="w-5 h-5 text-white" />
              <span>⚡ Arrancar Agente ADK y Simular Ataque Mortífago</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

