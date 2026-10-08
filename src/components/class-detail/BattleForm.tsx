import React, { useRef, useState } from "react";
import { Code2, RefreshCw, Swords, AlertCircle, Upload, RotateCcw, ShieldCheck, Wrench } from "lucide-react";

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
# 1. ENCANTAMIENTO DE EJEMPLO (YA CREADO Y CONFIGURADO):
# Invocado por el agente en la Oleada 1 (Dementores en el puente):
#   invocar_patronus(sector="puente")
# =====================================================================
def invocar_patronus(sector: str) -> dict:
    """Conjura el encantamiento Expecto Patronum para ahuyentar Dementores en un sector del castillo.

    Args:
        sector: Sector del castillo donde atacan los Dementores (ej. "puente").
    """
    return {
        "status": "ok",
        "hechizo": "Expecto Patronum",
        "sector": sector,
    }


# =====================================================================
# TODO 2: CREA LA FUNCIÓN reforzar_barrera(sector: str, potencia: int) -> dict
# Debe ser invocada por tu agente en la Oleada 2 (Cúpula al 15% en patio central):
#   reforzar_barrera(sector="patio_central", potencia=85)  # potencia entre 50 y 100
# Recuerda incluir type hints (str, int), un docstring y devolver un dict.
# =====================================================================


# =====================================================================
# TODO 3: CREA LA FUNCIÓN activar_estatuas_piertotum(orden: str) -> dict
# Debe ser invocada por tu agente en la Oleada 3 (Gigantes en el portón exterior):
#   activar_estatuas_piertotum(orden="bloquear_puerta_principal")
# Recuerda incluir el type hint (str), un docstring y devolver un dict.
# =====================================================================


# =====================================================================
# TODO 4: CREA LA FUNCIÓN lanzar_expelliarmus(sector: str) -> dict
# Debe ser invocada por tu agente en la Oleada 4 (Bellatrix Lestrange en el viaducto):
#   lanzar_expelliarmus(sector="viaducto")
# Recuerda incluir el type hint (str), un docstring y devolver un dict.
# =====================================================================


# =====================================================================
# TODO 5: COMPLETA EL AGENTE DEFENSOR (root_agent)
# 1. Añade en 'instruction' las directrices para las Oleadas 2, 3 y 4.
# 2. Registra tus 3 nuevas funciones dentro de la lista 'tools=[...]'.
# =====================================================================
root_agent = Agent(
    name="guardian_hogwarts",
    model="gemini-2.5-flash",
    description="Guardián mágico autónomo experto en encantamientos defensivos para proteger Hogwarts.",
    instruction="""
    Eres el Guardián Mágico Autónomo encargado de defender Hogwarts donde la Orden del Fénix no alcanza.
    Ante cada amenaza, invoca inmediatamente el encantamiento correspondiente:
    - Si atacan los Dementores en el Puente Cubierto, invoca invocar_patronus con sector="puente".
    - TODO: Añade aquí las directrices para la cúpula del patio_central, los gigantes en la puerta principal y Bellatrix en el viaducto.
    """,
    tools=[
        invocar_patronus,
        # Añade aquí: reforzar_barrera, activar_estatuas_piertotum, lanzar_expelliarmus
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
        {/* Resumen rápido de los 4 encantamientos Python requeridos */}
        <div className="mb-5 p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-3">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Repertorio de 4 Encantamientos Python que debe tener tu Agente ADK (`tools=[...]`)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-black/60 border border-emerald-800/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-emerald-300">1. invocar_patronus</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  En esqueleto
                </span>
              </div>
              <p className="font-mono text-[11px] text-stone-300 mb-1.5">
                (sector: str) -&gt; dict
              </p>
              <p className="text-stone-400 leading-relaxed">
                • <strong>Oleada 1 (Dementores):</strong> invocar con <code className="text-amber-200">sector="puente"</code>.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-amber-700/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">2. reforzar_barrera</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="font-mono text-[11px] text-stone-300 mb-1.5">
                (sector: str, potencia: int) -&gt; dict
              </p>
              <p className="text-stone-400 leading-relaxed">
                • <strong>Oleada 2 (Cúpula al 15%):</strong> invocar con <code className="text-amber-200">sector="patio_central"</code> y <code className="text-amber-200">potencia</code> entre <code className="text-amber-200">50</code> y <code className="text-amber-200">100</code>.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-amber-700/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">3. activar_estatuas_piertotum</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="font-mono text-[11px] text-stone-300 mb-1.5">
                (orden: str) -&gt; dict
              </p>
              <p className="text-stone-400 leading-relaxed">
                • <strong>Oleada 3 (Gigantes en portón):</strong> invocar con <code className="text-amber-200">orden="bloquear_puerta_principal"</code>.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-amber-700/50">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-amber-300">4. lanzar_expelliarmus</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  Crear función
                </span>
              </div>
              <p className="font-mono text-[11px] text-stone-300 mb-1.5">
                (sector: str) -&gt; dict
              </p>
              <p className="text-stone-400 leading-relaxed">
                • <strong>Oleada 4 (Bellatrix en viaducto):</strong> invocar con <code className="text-amber-200">sector="viaducto"</code>.
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
          rows={22}
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
            Al enviar, el profesor arrancará tu <code className="text-indigo-300">root_agent</code> y simulará los 4 ataques mortífagos para comprobar qué herramientas Python invoca.
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
              <span>Arrancando tu root_agent y simulando las 4 oleadas...</span>
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
