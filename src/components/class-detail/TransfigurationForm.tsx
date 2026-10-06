import React from "react";
import {
  Code2,
  FileCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wand2,
} from "lucide-react";

interface TransfigurationFormProps {
  jsonAuditText: string;
  setJsonAuditText: (val: string) => void;
  pythonFileName: string;
  setPythonFileName: (val: string) => void;
  pythonFileContent: string;
  setPythonFileContent: (val: string) => void;
  testsFileName: string;
  setTestsFileName: (val: string) => void;
  testsFileContent: string;
  setTestsFileContent: (val: string) => void;
  submitting: boolean;
  errorMessage: string | null;
  hasPreviousSubmission: boolean;
  attemptNumber?: number;
  retryPenalty?: number;
  currentBestScore?: number;
  onCancelEdit: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const DEFAULT_JSON_TEMPLATE = `{
  "variable_cobol_afectada": "WS-NOMBRE-VARIABLE",
  "camaras_afectadas": [
    {
      "numero_camara": 9999,
      "tarifa_total_knuts": 1250.50
    }
  ]
}`;

export const DEFAULT_PYTHON_SKELETON = `def calcular_tasa_camara(camara: dict) -> float:
    ### CÓDIGO TRANSFIGURADO DE COBOL / TU CÁLCULO DE TASA ###
    pass

def procesar_lote(lote: list) -> list:
    return [calcular_tasa_camara(c) for c in lote]`;

export const DEFAULT_TESTS_SKELETON = `def test_algo():
    # Las funciones de tu código están disponibles directamente en memoria
    camara = {"vaultId": 100, "tier": "B", "ownerType": "S", "cursesCount": 0, "galleons": 10, "sickles": 0, "knuts": 0}
    assert calcular_tasa_camara(camara) is not None`;

export const TransfigurationForm: React.FC<TransfigurationFormProps> = ({
  jsonAuditText,
  setJsonAuditText,
  pythonFileName,
  setPythonFileName,
  pythonFileContent,
  setPythonFileContent,
  testsFileName,
  setTestsFileName,
  testsFileContent,
  setTestsFileContent,
  submitting,
  errorMessage,
  hasPreviousSubmission,
  attemptNumber = 2,
  retryPenalty = 2,
  currentBestScore = 0,
  onCancelEdit,
  onSubmit,
}) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPythonFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPythonFileContent((event.target?.result as string) || "");
    };
    reader.readAsText(file);
  };

  const handleTestsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestsFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setTestsFileContent((event.target?.result as string) || "");
    };
    reader.readAsText(file);
  };

  const canSubmit =
    !submitting &&
    jsonAuditText.trim().length > 0 &&
    pythonFileContent.trim().length > 0 &&
    testsFileContent.trim().length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className="flex-1 flex flex-col justify-between p-6 sm:p-8 rounded-2xl border shadow-2xl relative bg-gradient-to-b from-[#18181b] to-black border-[#4a2e1b]"
    >
      <div className="space-y-6">
        {hasPreviousSubmission && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/40 text-xs sm:text-sm text-amber-200">
            <span className="font-bold block text-amber-300 mb-1">
              🎯 Reenvío para subir nota (Intento #{attemptNumber}):
            </span>
            <span className="leading-relaxed block">
              Este reintento aplicará una penalización acumulada de <strong>-{retryPenalty} puntos</strong> sobre tu nota máxima base (ej. un Extraordinario obtendrá {25 - retryPenalty} pts). Si mantienes tu misma nota base, se restarán 2 puntos a tu casa; si mejoras tu base, se sumará el incremento.
            </span>
          </div>
        )}

        {/* Bloque 1: Informe de Auditoría Rúnica JSON */}
        <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-amber-600/30">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-800/80">
            <label htmlFor="json-audit" className="text-sm sm:text-base font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>1. Informe de Auditoría Rúnica (JSON):</span>
            </label>
            <button
              type="button"
              onClick={() => setJsonAuditText(DEFAULT_JSON_TEMPLATE)}
              className="text-xs sm:text-sm text-amber-400 hover:text-amber-300 underline cursor-pointer font-medium"
            >
              Pegar plantilla JSON de ejemplo
            </button>
          </div>
          <p className="text-xs sm:text-sm text-stone-300 mb-2.5">
            Indica la variable COBOL afectada (<code className="text-amber-300 font-mono">variable_cobol_afectada</code>) y ÚNICAMENTE la lista de cámaras que sufrieron discrepancias contables en el manuscrito original con su <code className="text-amber-300 font-mono">numero_camara</code> y <code className="text-amber-300 font-mono">tarifa_total_knuts</code> corregida.
          </p>
          <textarea
            id="json-audit"
            rows={6}
            value={jsonAuditText}
            onChange={(e) => setJsonAuditText(e.target.value)}
            placeholder={`{\n  "variable_cobol_afectada": "WS-...",\n  "camaras_afectadas": [\n    {\n      "numero_camara": 9999,\n      "tarifa_total_knuts": 1250.50\n    }\n  ]\n}`}
            disabled={submitting}
            className="w-full p-3.5 rounded-lg font-mono text-sm sm:text-base leading-relaxed resize-y outline-none transition-all shadow-inner bg-[#101014] border border-[#452818] focus:border-amber-500 text-amber-100 placeholder:text-stone-700"
          />
        </div>

        {/* Bloque 2: Código Python 3 (.py) */}
        <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-amber-600/30">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-800/80">
            <label htmlFor="python-script" className="text-sm sm:text-base font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>2. Código Python 3 (.py):</span>
            </label>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs sm:text-sm font-mono font-bold cursor-pointer transition-colors border border-amber-500/40">
              <Upload className="w-3.5 h-3.5" />
              <span>{pythonFileName ? "Cambiar archivo de código" : "Adjuntar archivo de código (.py)"}</span>
              <input
                type="file"
                accept=".py"
                onChange={handleFileUpload}
                className="hidden"
                disabled={submitting}
              />
            </label>
          </div>
          <p className="text-xs sm:text-sm text-stone-300 mb-2">
            Respeta la estructura del esqueleto: define las funciones <code className="text-amber-300 font-mono">calcular_tasa_camara(camara)</code> y <code className="text-amber-300 font-mono">procesar_lote(lote)</code> con la lógica migrada de COBOL.
          </p>
          <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-200/90 flex items-center gap-2">
            <span>🔒 <strong>Solo biblioteca estándar:</strong> Puedes usar <code className="font-mono text-amber-300">decimal</code>, <code className="font-mono text-amber-300">math</code> o <code className="font-mono text-amber-300">json</code>. No se admiten dependencias externas.</span>
          </div>

          {pythonFileName && (
            <div className="mb-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs sm:text-sm text-emerald-300 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Archivo de código: <strong>{pythonFileName}</strong> ({pythonFileContent.split("\n").length} líneas)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPythonFileName("");
                  setPythonFileContent(DEFAULT_PYTHON_SKELETON);
                }}
                className="text-xs text-stone-400 hover:text-rose-400 underline cursor-pointer"
              >
                Quitar archivo (restaurar esqueleto)
              </button>
            </div>
          )}

          <textarea
            id="python-script"
            rows={8}
            value={pythonFileContent}
            onChange={(e) => setPythonFileContent(e.target.value)}
            placeholder={DEFAULT_PYTHON_SKELETON}
            disabled={submitting}
            className="w-full p-3.5 rounded-lg font-mono text-sm sm:text-base leading-relaxed resize-y outline-none transition-all shadow-inner bg-[#101014] border border-[#452818] focus:border-amber-500 text-stone-100 placeholder:text-stone-700"
          />
        </div>

        {/* Bloque 3: Tests Python 3 (.py) */}
        <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-amber-600/30">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-800/80">
            <label htmlFor="python-tests" className="text-sm sm:text-base font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>3. Tests Python 3 (.py):</span>
            </label>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs sm:text-sm font-mono font-bold cursor-pointer transition-colors border border-amber-500/40">
              <Upload className="w-3.5 h-3.5" />
              <span>{testsFileName ? "Cambiar archivo de tests" : "Adjuntar archivo de tests (.py)"}</span>
              <input
                type="file"
                accept=".py"
                onChange={handleTestsFileUpload}
                className="hidden"
                disabled={submitting}
              />
            </label>
          </div>
          <p className="text-xs sm:text-sm text-stone-300 mb-2">
            Respeta el formato del esqueleto con funciones <code className="text-amber-300 font-mono">test_*()</code> y aserciones nativas <code className="text-amber-300 font-mono">assert</code> que verifiquen el cálculo.
          </p>
          <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-[12px] text-indigo-200/90 flex items-center gap-2">
            <span>⚡ <strong>Aserciones en memoria:</strong> Las funciones de tu código están disponibles directamente en este espacio. No necesitas hacer imports ni usar pytest.</span>
          </div>

          {testsFileName && (
            <div className="mb-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs sm:text-sm text-emerald-300 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Archivo de tests: <strong>{testsFileName}</strong> ({testsFileContent.split("\n").length} líneas)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTestsFileName("");
                  setTestsFileContent(DEFAULT_TESTS_SKELETON);
                }}
                className="text-xs text-stone-400 hover:text-rose-400 underline cursor-pointer"
              >
                Quitar archivo (restaurar esqueleto)
              </button>
            </div>
          )}

          <textarea
            id="python-tests"
            rows={8}
            value={testsFileContent}
            onChange={(e) => setTestsFileContent(e.target.value)}
            placeholder={DEFAULT_TESTS_SKELETON}
            disabled={submitting}
            className="w-full p-3.5 rounded-lg font-mono text-sm sm:text-base leading-relaxed resize-y outline-none transition-all shadow-inner bg-[#101014] border border-[#452818] focus:border-amber-500 text-stone-100 placeholder:text-stone-700"
          />
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
              : "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 shadow-[0_0_30px_rgba(217,119,6,0.5)] hover:scale-105 cursor-pointer font-black"
          }`}
        >
          {submitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-white" />
              <span>McGonagall está examinando tus runas...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 text-stone-950" />
              <span>🪄 Transfigurar Runas (Enviar a McGonagall)</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
