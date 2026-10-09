import React, { useRef, useState } from "react";
import { Code2, RefreshCw, Swords, AlertCircle, Upload, RotateCcw, ShieldCheck, Wrench, BookOpen, Eye, X, ExternalLink } from "lucide-react";

interface BattleFormProps {
  answerText: string;
  setAnswerText: (val: string) => void;
  submitting: boolean;
  errorMessage: string | null;
  hasPreviousSubmission: boolean;
  onCancelEdit: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const DEFAULT_ADK_AGENT_SKELETON = `from google.adk.agents import Agent


# =====================================================================
# 1. ACCIÓN DE EJEMPLO (YA CREADA Y CONFIGURADA):
# Invocada por el agente en la Oleada 1 (Dementores en el Puente Cubierto)
# =====================================================================
def espantar_dementores() -> dict:
    """Conjura el encantamiento Patronus para ahuyentar a los Dementores."""
    return {
        "hechizo": "Expecto Patronum",
    }


# =====================================================================
# TODO: CREA LAS 6 FUNCIONES DEFENSIVAS RESTANTES
# Consulta el pergamino "grimorio_hechizos.jpg" para descubrir qué
# encantamiento corresponde a cada acción y devuélvelo en {"hechizo": "..."}:
#
# 2. lanzar_escudo() -> dict          (Oleada 2: Lluvia de maleficios en el Patio)
# 3. activar_estatuas() -> dict       (Oleada 3: Gigantes en el Portón Principal)
# 4. desarmar_adversario() -> dict    (Oleada 4: Bellatrix Lestrange en el Viaducto)
# 5. extinguir_incendio() -> dict     (Oleada 5: Fuego descontrolado en el Gran Comedor)
# 6. petrificar_enemigo() -> dict     (Oleada 6: Mortífagos infiltrados en Astronomía)
# 7. iluminar_tinieblas() -> dict     (Oleada 7: Oscuridad total en las Mazmorras)
#
# Recuerda incluir el type hint (-> dict), un docstring descriptivo
# y devolver un diccionario {"hechizo": "<NOMBRE_DEL_HECHIZO>"}.
# =====================================================================


# =====================================================================
# TODO: COMPLETA EL AGENTE DEFENSOR (root_agent)
# 1. Añade en 'instruction' las directrices para las 7 oleadas.
# 2. Registra las 7 funciones dentro de la lista 'tools=[...]'.
# =====================================================================
root_agent = Agent(
    name="guardian_hogwarts",
    model="gemini-2.5-flash",
    description="Guardián mágico autónomo experto en encantamientos defensivos para proteger Hogwarts.",
    instruction="""
    Eres el Guardián Mágico Autónomo encargado de defender Hogwarts donde la Orden del Fénix no alcanza.
    Ante cada amenaza, invoca inmediatamente la herramienta defensiva correspondiente:
    - Si atacan los Dementores en el Puente Cubierto, invoca espantar_dementores.
    - TODO: Añade aquí las directrices para las 6 amenazas restantes.
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
      className="flex-1 flex flex-col justify-between p-6 sm:p-8 rounded-2xl border shadow-2xl relative bg-gradient-to-b from-[#080d1e] to-black border-indigo-900/60"
    >
      <div>
        {/* Resumen rápido de las 7 acciones defensivas Python requeridas + botón del Grimorio */}
        <div className="mb-5 p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60">
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
                • <strong>Oleada 1 (Dementores en puente):</strong> devuelve <code className="text-emerald-300">{`{"hechizo": "Expecto Patronum"}`}</code>.
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
                • <strong>Oleada 2 (Maleficios en el patio):</strong> consulta el Grimorio para elegir el encantamiento escudo.
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
                • <strong>Oleada 3 (Gigantes en portón):</strong> consulta el Grimorio para animar las estatuas y armaduras.
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
                • <strong>Oleada 4 (Bellatrix en viaducto):</strong> consulta el Grimorio para arrebatar la varita al enemigo.
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
                • <strong>Oleada 5 (Fuego en Gran Comedor):</strong> consulta el Grimorio para invocar agua desde la varita.
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
                • <strong>Oleada 6 (Infiltrados en Astronomía):</strong> consulta el Grimorio para inmovilizar el cuerpo del intruso.
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
                • <strong>Oleada 7 (Oscuridad en Mazmorras):</strong> consulta el Grimorio para encender luz mágica en la punta de la varita.
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
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
          className="w-full p-4 rounded-xl font-mono text-xs sm:text-sm leading-relaxed resize-y outline-none transition-all shadow-inner bg-[#050711] border-2 border-indigo-900/80 focus:border-indigo-400 text-indigo-100 placeholder:text-indigo-900/70"
        />

        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-stone-400 font-sans">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Al enviar, el profesor arrancará tu <code className="text-indigo-300">root_agent</code> y simulará las 7 oleadas mortífagas para comprobar qué funciones invoca y qué hechizo devuelve cada una.
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
              : "bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.5)] hover:scale-105 cursor-pointer font-black"
          }`}
        >
          {submitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-white" />
              <span>Arrancando tu root_agent y simulando las 7 oleadas...</span>
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

