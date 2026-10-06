import React from "react";
import { Feather, RefreshCw, Swords, AlertCircle } from "lucide-react";

interface BattleFormProps {
  answerText: string;
  setAnswerText: (val: string) => void;
  submitting: boolean;
  errorMessage: string | null;
  hasPreviousSubmission: boolean;
  onCancelEdit: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const BATTLE_TOOL_CALLING_TEMPLATE = `### PLAN DE COMBATE AGÉNTICO (TOOL CALLING):

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

export const BattleForm: React.FC<BattleFormProps> = ({
  answerText,
  setAnswerText,
  submitting,
  errorMessage,
  hasPreviousSubmission,
  onCancelEdit,
  onSubmit,
}) => {
  const canSubmit = !submitting && answerText.trim().length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className="flex-1 flex flex-col justify-between p-6 sm:p-8 rounded-2xl border shadow-2xl relative bg-gradient-to-b from-[#080d1e] to-black border-indigo-900/60"
    >
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
              onClick={() => setAnswerText(BATTLE_TOOL_CALLING_TEMPLATE)}
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
              <span>El Comando está evaluando tus contrahechizos...</span>
            </>
          ) : (
            <>
              <Swords className="w-5 h-5 text-white" />
              <span>⚡ Desplegar Agente Defensor (Lanzar Hechizos)</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
