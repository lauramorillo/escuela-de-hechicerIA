import { useState, useRef, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, KeyRound, Sparkles, Wand2, ShieldCheck, AlertCircle } from "lucide-react";

interface GatekeeperScreenProps {
  onUnlock: () => void;
  workshopId?: string;
}

export function GatekeeperScreen({ onUnlock, workshopId }: GatekeeperScreenProps) {
  const [passkeyInput, setPasskeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passkeyInput.trim() || loading) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/gatekeeper/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: passkeyInput.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          onUnlock();
        }, 800);
      } else {
        setErrorMsg(data.error || "Palabra clave incorrecta. Las puertas no se abren.");
        setShakeKey((prev) => prev + 1);
        setPasskeyInput("");
        inputRef.current?.focus();
      }
    } catch {
      setErrorMsg("Error al verificar la palabra clave. Inténtalo de nuevo.");
      setShakeKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black text-white font-serif flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none z-50">
      {/* Fondo cinematográfico con arte del castillo */}
      <img
        src="/escuela-hechiceria-bg-no-tittle.jpg"
        alt="Castillo de Hogwarts"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.35] blur-[2px] scale-105"
      />
      <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />

      {/* Partículas mágicas de fondo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <motion.div
        key={shakeKey}
        animate={
          errorMsg
            ? { x: [-10, 10, -8, 8, -4, 4, 0] }
            : isSuccess
            ? { scale: [1, 1.03, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] }
            : {}
        }
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-lg mx-auto bg-stone-950/85 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(0,0,0,0.8),0_0_30px_rgba(234,179,8,0.15)] flex flex-col items-center text-center"
      >
        {/* Crest superior */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-purple-950/40 to-black border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-900/30">
            {isSuccess ? (
              <ShieldCheck className="w-10 h-10 text-amber-300 animate-bounce" />
            ) : (
              <Lock className="w-10 h-10 text-amber-400/90" />
            )}
          </div>
          <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: "8s" }} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs tracking-widest uppercase font-sans mb-3">
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          Acceso al Taller
        </div>

        {/* Título */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-3 drop-shadow-md">
          {isSuccess ? "¡Acceso Concedido!" : "Puertas de Acceso"}
        </h1>

        {/* Descripción */}
        <p className="text-stone-300 text-sm sm:text-base font-sans leading-relaxed max-w-md mb-6">
          {isSuccess
            ? "¡Palabra clave correcta! Cruzando el umbral hacia la Ceremonia de Selección..."
            : "Introduce la palabra clave del taller para acceder a la Escuela de HechicerIA."}
        </p>

        {/* Formulario de palabra clave */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-4">
          <div className="w-full relative">
            <input
              ref={inputRef}
              type="text"
              value={passkeyInput}
              onChange={(e) => {
                setPasskeyInput(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              disabled={loading || isSuccess}
              placeholder="Introduce la palabra clave..."
              autoComplete="off"
              spellCheck="false"
              className="w-full px-5 py-4 rounded-2xl bg-black/60 border border-amber-500/40 focus:border-amber-400 text-amber-100 placeholder:text-stone-500 text-center text-lg sm:text-xl font-sans tracking-wide outline-none shadow-inner transition-all focus:shadow-[0_0_25px_rgba(234,179,8,0.3)] disabled:opacity-50"
            />
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-rose-400 text-xs sm:text-sm font-sans bg-rose-950/40 border border-rose-800/50 px-4 py-2 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={!passkeyInput.trim() || loading || isSuccess}
            className="w-full mt-2 py-4 px-8 rounded-2xl font-sans font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(234,179,8,0.5)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Comprobando acceso...</span>
              </>
            ) : isSuccess ? (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>¡Acceso Concedido!</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Entrar ✨</span>
              </>
            )}
          </button>
        </form>

        {/* Pie informativo del taller */}
        {workshopId && (
          <p className="mt-6 text-stone-500 text-xs font-sans tracking-wider">
            Taller activo: <span className="text-amber-400/70 font-mono">{workshopId}</span>
          </p>
        )}
      </motion.div>
    </div>
  );
}
