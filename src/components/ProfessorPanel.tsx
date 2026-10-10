import React, { useEffect, useState, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Unlock,
  KeyRound,
  Sparkles,
  Wand2,
  ShieldCheck,
  AlertCircle,
  Trophy,
  Crown,
  Users,
  RefreshCw,
  ArrowLeft,
  LogOut,
  Map,
  Swords,
  Award,
  Star,
  CheckCircle2,
} from "lucide-react";

interface StudentContribution {
  studentId: string;
  house: "gryffindor" | "slytherin" | "ravenclaw" | "hufflepuff";
  totalPoints: number;
  completedCount: number;
  firstHouseBonuses: number;
  submissions: Record<
    string,
    {
      classId: string;
      grade: string;
      points: number;
      firstHouseBonus?: boolean;
    }
  >;
}

interface HouseRankingItem {
  house: "gryffindor" | "slytherin" | "ravenclaw" | "hufflepuff";
  houseName: string;
  score: number;
  membersCount: number;
  topStudent: StudentContribution | null;
  students: StudentContribution[];
}

interface TournamentSummary {
  workshopId: string;
  houseScores: Record<string, number>;
  houseCounts: Record<string, number>;
  unlockedClasses: string[];
  winningHouse: "gryffindor" | "slytherin" | "ravenclaw" | "hufflepuff" | null;
  mvpStudent: StudentContribution | null;
  houseRankings: HouseRankingItem[];
}

interface ProfessorPanelProps {
  mode: "dashboard" | "winners";
  onNavigateMode: (mode: "dashboard" | "winners") => void;
  onExitToApp: () => void;
}

const HOUSE_STYLES: Record<
  string,
  {
    name: string;
    emblem: string;
    gradient: string;
    border: string;
    glow: string;
    textAccent: string;
    badgeBg: string;
  }
> = {
  gryffindor: {
    name: "Gryffindor",
    emblem: "🦁",
    gradient: "from-[#740001]/90 via-[#4a0001]/95 to-stone-950",
    border: "border-[#d3a625]/60",
    glow: "shadow-[0_0_50px_rgba(174,0,1,0.45)]",
    textAccent: "text-[#eeba30]",
    badgeBg: "bg-[#740001] text-[#eeba30] border-[#d3a625]",
  },
  slytherin: {
    name: "Slytherin",
    emblem: "🐍",
    gradient: "from-[#1a472a]/90 via-[#0f2b19]/95 to-stone-950",
    border: "border-emerald-400/50",
    glow: "shadow-[0_0_50px_rgba(42,98,61,0.45)]",
    textAccent: "text-emerald-300",
    badgeBg: "bg-[#1a472a] text-emerald-200 border-emerald-400/60",
  },
  ravenclaw: {
    name: "Ravenclaw",
    emblem: "🦅",
    gradient: "from-[#0e1a40]/90 via-[#081029]/95 to-stone-950",
    border: "border-sky-400/50",
    glow: "shadow-[0_0_50px_rgba(34,47,91,0.5)]",
    textAccent: "text-sky-300",
    badgeBg: "bg-[#0e1a40] text-sky-200 border-sky-400/60",
  },
  hufflepuff: {
    name: "Hufflepuff",
    emblem: "🦡",
    gradient: "from-[#b8860b]/85 via-[#5c4306]/95 to-stone-950",
    border: "border-[#ecb939]/70",
    glow: "shadow-[0_0_50px_rgba(236,185,57,0.4)]",
    textAccent: "text-[#ecb939]",
    badgeBg: "bg-[#ecb939] text-stone-950 border-yellow-200",
  },
};

const CHALLENGE_DEFINITIONS = [
  {
    id: "transfiguration",
    order: 1,
    title: "1. Clase de Transfiguración",
    subtitle: "Guiar a la IA • Profesora McGonagall",
    description: "Auditoría de pergamino rúnico, transmutación a Python 3 y batería de tests sobre el motor de Gringotts.",
    bgImage: "/transfiguracion-bg.jpg",
    icon: Wand2,
  },
  {
    id: "defense",
    order: 2,
    title: "2. El Mapa del Merodeador",
    subtitle: "Proteger a la IA • Profesor Lupin",
    description: "Extracción del secreto del guardián (Prompt Injection) y blindaje defensivo del mapa.",
    bgImage: "/mapa-merodeador-bg.jpg",
    icon: Map,
  },
  {
    id: "battle",
    order: 3,
    title: "3. La Batalla de Hogwarts",
    subtitle: "Estructurar a la IA • Profesor Dumbledore",
    description: "Construcción de un agente defensor con Google ADK y 7 herramientas de hechizos para repeler el asedio.",
    bgImage: "/mortifago-bg.jpg",
    icon: Swords,
  },
];

export const ProfessorPanel: React.FC<ProfessorPanelProps> = ({
  mode,
  onNavigateMode,
  onExitToApp,
}) => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const [summary, setSummary] = useState<TournamentSummary | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [togglingClassId, setTogglingClassId] = useState<string | null>(null);

  // Estados de revelación progresiva en la ceremonia de ganadores
  const [houseRevealed, setHouseRevealed] = useState(false);
  const [mvpRevealed, setMvpRevealed] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchDashboard(true);
    const interval = setInterval(() => {
      fetchDashboard(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [authenticated]);

  const checkAuthStatus = async () => {
    try {
      setCheckingAuth(true);
      const res = await fetch("/api/professor/status");
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(Boolean(data.authenticated));
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim() || submittingAuth) return;

    setSubmittingAuth(true);
    setAuthError("");

    try {
      const res = await fetch("/api/professor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAuthenticated(true);
        setPasswordInput("");
      } else {
        setAuthError(data.error || "Contraseña incorrecta.");
        setPasswordInput("");
        passwordInputRef.current?.focus();
      }
    } catch {
      setAuthError("No se pudo verificar la contraseña. Inténtalo de nuevo.");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/professor/logout", { method: "POST" });
    } catch {}
    setAuthenticated(false);
    setSummary(null);
  };

  const fetchDashboard = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoadingDashboard(true);
      const res = await fetch("/api/professor/dashboard");
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (res.ok) {
        const data: TournamentSummary = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error cargando dashboard de profesora:", err);
    } finally {
      if (showSpinner) setLoadingDashboard(false);
    }
  };

  const handleToggleClass = async (classId: string, currentlyUnlocked: boolean) => {
    try {
      setTogglingClassId(classId);
      const res = await fetch("/api/professor/classes/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          unlocked: !currentlyUnlocked,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                unlockedClasses: data.unlockedClasses || [],
              }
            : prev
        );
      }
    } catch (err) {
      console.error("Error cambiando estado del desafío:", err);
    } finally {
      setTogglingClassId(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-stone-950 flex items-center justify-center text-amber-300 font-serif">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-sm tracking-widest uppercase font-sans text-stone-400">
            Abriendo el Despacho de Dirección...
          </span>
        </div>
      </div>
    );
  }

  // Pantalla de Contraseña de Profesora
  if (!authenticated) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-black text-white font-serif flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none z-50">
        <div
          className="absolute inset-0 bg-cover bg-center filter brightness-[0.3] contrast-110 scale-105 pointer-events-none"
          style={{ backgroundImage: "url('/escuela-hechiceria-bg-no-tittle.jpg')" }}
        />
        <div className="absolute inset-0 bg-radial from-transparent via-black/50 to-black/95 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md mx-auto bg-stone-950/90 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(234,179,8,0.15)] flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-950/40 to-black border border-amber-400/50 flex items-center justify-center shadow-lg mb-5">
            <Lock className="w-10 h-10 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs tracking-widest uppercase font-sans mb-3">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            Acceso Exclusivo Docente
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-2">
            Panel de la Profesora
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm font-sans leading-relaxed mb-6">
            Introduce la contraseña secreta del Claustro para gestionar la activación de los desafíos y proclamar la Casa Ganadora.
          </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
            <input
              ref={passwordInputRef}
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (authError) setAuthError("");
              }}
              placeholder="Contraseña de Profesora..."
              autoFocus
              className="w-full px-5 py-3.5 rounded-2xl bg-black/70 border border-amber-500/40 focus:border-amber-400 text-amber-100 placeholder:text-stone-500 text-center text-base sm:text-lg font-sans tracking-widest outline-none transition-all focus:shadow-[0_0_25px_rgba(234,179,8,0.25)]"
            />

            {authError && (
              <div className="flex items-center gap-2 text-rose-300 text-xs sm:text-sm font-sans bg-rose-950/50 border border-rose-800/60 px-4 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!passwordInput.trim() || submittingAuth}
              className="w-full py-3.5 px-6 rounded-2xl font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 hover:brightness-110 transition-all shadow-[0_0_25px_rgba(234,179,8,0.4)] cursor-pointer disabled:opacity-40"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{submittingAuth ? "Verificando..." : "Desbloquear Claustro"}</span>
            </button>
          </form>

          <button
            onClick={onExitToApp}
            className="mt-5 text-xs text-stone-400 hover:text-amber-300 font-sans flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la vista de alumnos</span>
          </button>
        </motion.div>
      </div>
    );
  }

  const unlockedClasses = summary?.unlockedClasses || [];
  const houseRankings = summary?.houseRankings || [];
  const winningHouseItem = houseRankings[0] || null;
  const mvpStudent = summary?.mvpStudent || winningHouseItem?.topStudent || null;

  // ============================================================================
  // PANTALLA 2: CEREMONIA DE PROCLAMACIÓN DE GANADORES (/profesor/ganadores)
  // ============================================================================
  if (mode === "winners") {
    const winStyle = HOUSE_STYLES[winningHouseItem?.house || "gryffindor"] || HOUSE_STYLES.gryffindor;

    return (
      <div className="fixed inset-0 w-screen h-screen bg-stone-950 text-white font-serif overflow-y-auto select-none">
        <div
          className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.35] contrast-115"
          style={{ backgroundImage: "url('/escuela-hechiceria-bg-no-tittle.jpg')" }}
        />
        <div className="fixed inset-0 bg-gradient-to-t from-stone-950 via-stone-950/75 to-black/70 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 sm:py-10 flex flex-col min-h-screen justify-between">
          {/* Barra superior */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-amber-800/40">
            <button
              onClick={() => onNavigateMode("dashboard")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 hover:bg-black/90 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-sans transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver al Panel de Control</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setHouseRevealed(true);
                  setMvpRevealed(true);
                }}
                className="px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-sans font-semibold transition-all cursor-pointer"
              >
                ✨ Mostrar Todo
              </button>
              <button
                onClick={() => fetchDashboard(true)}
                className="p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 cursor-pointer"
                title="Actualizar puntuaciones"
              >
                <RefreshCw className={`w-4 h-4 ${loadingDashboard ? "animate-spin text-amber-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Encabezado de la Ceremonia */}
          <div className="text-center my-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/70 border border-amber-400/40 text-amber-300 text-xs tracking-widest uppercase mb-3 font-sans">
              <Trophy className="w-4 h-4 text-amber-400" />
              Gran Ceremonia de Clausura • {summary?.workshopId}
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-lg">
              Proclamación de Campeones
            </h1>
          </div>

          {/* Bloque Principal: Casa Ganadora + Alumno/a MVP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 my-4">
            {/* 1. Tarjeta de la Casa Ganadora */}
            <div
              className={`relative rounded-3xl p-6 sm:p-8 border bg-gradient-to-b ${
                houseRevealed
                  ? `${winStyle.gradient} ${winStyle.border} ${winStyle.glow}`
                  : "from-stone-900/95 to-black border-amber-600/40 shadow-2xl"
              } flex flex-col items-center justify-center text-center min-h-[340px] transition-all duration-700 overflow-hidden`}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/50 border border-amber-400/40 text-amber-300 text-xs uppercase tracking-widest font-sans mb-4">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Copa de las Casas
              </div>

              {!houseRevealed ? (
                <div className="flex flex-col items-center gap-4 my-auto">
                  <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                    <Trophy className="w-12 h-12 text-amber-400 animate-pulse" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-amber-100">
                    ¿Qué Casa se alzará con la Copa?
                  </h2>
                  <p className="text-stone-400 text-sm font-sans max-w-sm">
                    Los puntos de todos los desafíos han sido contabilizados por el Claustro.
                  </p>
                  <button
                    onClick={() => setHouseRevealed(true)}
                    className="mt-2 px-8 py-4 rounded-2xl font-sans font-bold text-base bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 hover:scale-105 transition-all shadow-[0_0_30px_rgba(234,179,8,0.5)] cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Proclamar Casa Ganadora</span>
                  </button>
                </div>
              ) : winningHouseItem ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <div className="text-7xl sm:text-8xl mb-3 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                    {winStyle.emblem}
                  </div>
                  <div className="text-xs uppercase tracking-[0.25em] text-amber-300 font-sans font-bold mb-1">
                    ¡Campeones de la Escuela de HechicerIA!
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-black text-white tracking-wide mb-3 drop-shadow-md">
                    {winningHouseItem.houseName}
                  </h2>
                  <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-black/60 border border-amber-400/50 shadow-inner mb-4">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400">
                      {winningHouseItem.score} pts
                    </span>
                    <span className="text-stone-500">•</span>
                    <span className="text-xs sm:text-sm font-sans text-stone-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-400" />
                      {winningHouseItem.membersCount} integrantes
                    </span>
                  </div>
                </motion.div>
              ) : (
                <p className="text-stone-400 font-sans">Aún no hay puntuaciones registradas.</p>
              )}
            </div>

            {/* 2. Tarjeta del Alumno/a MVP de la Casa Ganadora */}
            <div
              className={`relative rounded-3xl p-6 sm:p-8 border bg-gradient-to-b ${
                mvpRevealed
                  ? "from-amber-950/80 via-stone-900/95 to-black border-amber-400/80 shadow-[0_0_60px_rgba(234,179,8,0.35)]"
                  : "from-stone-900/95 to-black border-amber-600/40 shadow-2xl"
              } flex flex-col items-center justify-center text-center min-h-[340px] transition-all duration-700 overflow-hidden`}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/50 border border-amber-400/40 text-amber-300 text-xs uppercase tracking-widest font-sans mb-4">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Premio Especial Individual
              </div>

              {!mvpRevealed ? (
                <div className="flex flex-col items-center gap-4 my-auto">
                  <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                    <Crown className="w-12 h-12 text-amber-400 animate-pulse" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-amber-100">
                    Mago o Bruja Más Valioso/a (MVP)
                  </h2>
                  <p className="text-stone-400 text-sm font-sans max-w-sm">
                    Descubre quién ha aportado más puntos dentro de la casa campeona para entregarle el gran premio.
                  </p>
                  <button
                    onClick={() => {
                      setHouseRevealed(true);
                      setMvpRevealed(true);
                    }}
                    className="mt-2 px-8 py-4 rounded-2xl font-sans font-bold text-base bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 hover:scale-105 transition-all shadow-[0_0_30px_rgba(234,179,8,0.5)] cursor-pointer flex items-center gap-2"
                  >
                    <Crown className="w-5 h-5" />
                    <span>Desvelar Alumno/a Campeón</span>
                  </button>
                </div>
              ) : mvpStudent ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-full flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(234,179,8,0.4)]">
                    <Crown className="w-9 h-9 text-amber-300" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-300 font-sans font-bold mb-1">
                    Mayor Contribución en {winStyle.name}
                  </div>

                  {/* Identificador del alumno ganador bien grande para que lo reconozca en su insignia */}
                  <div className="my-2 px-6 py-3 rounded-2xl bg-black/80 border-2 border-amber-400 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                    <span className="text-2xl sm:text-4xl font-mono font-black text-amber-300 tracking-tight break-all">
                      {mvpStudent.studentId}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-sm sm:text-base font-sans">
                    <span className="font-extrabold text-amber-400 text-xl">
                      +{mvpStudent.totalPoints} pts aportados
                    </span>
                    <span className="text-stone-500">•</span>
                    <span className="text-stone-300">
                      {mvpStudent.completedCount}/3 desafíos superados
                    </span>
                  </div>

                  {/* Desglose por desafío del MVP */}
                  <div className="mt-4 w-full grid grid-cols-3 gap-2 text-xs font-sans">
                    {CHALLENGE_DEFINITIONS.map((ch) => {
                      const sub = mvpStudent.submissions[ch.id];
                      return (
                        <div
                          key={ch.id}
                          className="p-2 rounded-xl bg-black/60 border border-stone-800 flex flex-col items-center"
                        >
                          <span className="text-stone-400 text-[10px] uppercase truncate max-w-full">
                            Desafío {ch.order}
                          </span>
                          <span className="font-bold text-amber-200 mt-0.5">
                            {sub ? `${sub.grade} (${sub.points > 0 ? `+${sub.points}` : sub.points}p)` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Top 3 de la casa ganadora por si hay empate o mención de honor */}
                  {winningHouseItem && winningHouseItem.students.length > 1 && (
                    <div className="mt-4 w-full pt-3 border-t border-amber-500/20 text-left">
                      <div className="text-[11px] uppercase tracking-wider text-amber-300/80 font-sans font-semibold mb-1.5 text-center">
                        Podio de honor dentro de {winningHouseItem.houseName}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {winningHouseItem.students.slice(0, 3).map((st, i) => (
                          <span
                            key={st.studentId}
                            className="px-2.5 py-1 rounded-lg bg-black/60 border border-stone-700/80 text-xs font-mono text-stone-300"
                          >
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {st.studentId} ({st.totalPoints}p)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <p className="text-stone-400 font-sans">
                  Aún no hay entregas registradas en la casa ganadora.
                </p>
              )}
            </div>
          </div>

          {/* Clasificación General de las 4 Casas */}
          <div className="mt-6 pt-5 border-t border-amber-900/40">
            <h3 className="text-xs sm:text-sm uppercase tracking-widest text-amber-300/90 font-sans font-bold mb-4 text-center">
              Clasificación Final de las Cuatro Casas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {houseRankings.map((item, idx) => {
                const st = HOUSE_STYLES[item.house] || HOUSE_STYLES.gryffindor;
                return (
                  <div
                    key={item.house}
                    className={`p-4 rounded-2xl border bg-gradient-to-b ${st.gradient} ${st.border} flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-white/15 text-xs font-sans font-bold text-amber-300">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-sans text-stone-300">
                        {item.membersCount} alumnos
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 my-1">
                      <span className="text-3xl">{st.emblem}</span>
                      <div>
                        <div className="font-bold text-lg text-white leading-tight">
                          {item.houseName}
                        </div>
                        <div className={`text-xl font-black ${st.textAccent}`}>
                          {item.score} pts
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-white/10 text-xs font-sans text-stone-300">
                      <span className="text-stone-400 block text-[11px]">Mejor alumno/a de la casa:</span>
                      {item.topStudent ? (
                        <span className="font-mono font-semibold text-amber-200">
                          ⭐ {item.topStudent.studentId} ({item.topStudent.totalPoints} pts)
                        </span>
                      ) : (
                        <span className="text-stone-500 italic">Sin entregas aún</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PANTALLA 1: PANEL DE CONTROL DE LA PROFESORA (/profesor)
  // ============================================================================
  return (
    <div className="fixed inset-0 w-screen h-screen bg-stone-950 text-white font-serif overflow-y-auto select-none">
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.35] contrast-110"
        style={{ backgroundImage: "url('/escuela-hechiceria-bg-no-tittle.jpg')" }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-black/75 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 sm:py-8 flex flex-col min-h-screen justify-between">
        {/* Barra Superior */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitToApp}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-stone-700 text-stone-300 text-xs sm:text-sm font-sans transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Vista Alumnos</span>
            </button>
            <div className="px-3.5 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-sans flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Taller: <strong className="font-mono">{summary?.workshopId || "..."}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateMode("winners")}
              className="px-5 py-2.5 rounded-full font-sans font-bold text-xs sm:text-sm flex items-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 hover:scale-105 transition-all shadow-[0_0_25px_rgba(234,179,8,0.45)] cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-stone-950" />
              <span>Proclamar Ganadores 🏆</span>
            </button>

            <button
              onClick={() => fetchDashboard(true)}
              className="p-2.5 rounded-full bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 transition-colors cursor-pointer"
              title="Refrescar datos ahora"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDashboard ? "animate-spin text-amber-400" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-full bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/50 text-rose-300 transition-colors cursor-pointer"
              title="Cerrar sesión de Profesora"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Título del Panel */}
        <div className="my-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-400 text-xs uppercase tracking-widest font-sans font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              Control Docente en Tiempo Real
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
              Claustro de la Profesora
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-400 font-sans max-w-md">
            Activa o sella cada desafío en directo para todos los asistentes. Las pantallas de los alumnos se sincronizan automáticamente cada pocos segundos.
          </p>
        </div>

        {/* SECCIÓN 1: MARCADOR DE LAS 4 CASAS */}
        <div className="my-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-amber-200 flex items-center gap-2 font-sans">
              <Award className="w-4 h-4 text-amber-400" />
              Puntuaciones de las 4 Casas (En Vivo)
            </h2>
            <span className="text-xs text-stone-400 font-sans">
              Actualización automática cada 4 s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["gryffindor", "slytherin", "ravenclaw", "hufflepuff"] as const).map((houseId) => {
              const st = HOUSE_STYLES[houseId];
              const rankingObj = houseRankings.find((r) => r.house === houseId);
              const score = summary?.houseScores?.[houseId] ?? 0;
              const members = rankingObj?.membersCount ?? summary?.houseCounts?.[houseId] ?? 0;
              const topStudent = rankingObj?.topStudent || null;

              return (
                <div
                  key={houseId}
                  className={`p-5 rounded-2xl border bg-gradient-to-b ${st.gradient} ${st.border} shadow-xl flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">{st.emblem}</span>
                      <div>
                        <h3 className="font-bold text-lg text-white leading-tight">
                          {st.name}
                        </h3>
                        <span className="text-xs text-stone-300 font-sans flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-amber-400/80" />
                          {members} {members === 1 ? "alumno" : "alumnos"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl sm:text-3xl font-black ${st.textAccent}`}>
                        {score}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-stone-300 font-sans">
                        puntos
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 text-xs font-sans flex items-center justify-between">
                    <span className="text-stone-300 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      Líder:
                    </span>
                    {topStudent ? (
                      <span className="font-mono font-bold text-amber-200 truncate max-w-[150px]">
                        {topStudent.studentId} ({topStudent.totalPoints}p)
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">Sin entregas</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECCIÓN 2: CONTROL DE ACTIVACIÓN DE DESAFÍOS */}
        <div className="my-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-amber-200 flex items-center gap-2 font-sans">
              <Wand2 className="w-4 h-4 text-amber-400" />
              Control de Apertura de los Desafíos
            </h2>
            <span className="text-xs text-stone-400 font-sans">
              Los desafíos sellados ocultan su enunciado y código a los alumnos para evitar que se adelanten.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CHALLENGE_DEFINITIONS.map((ch) => {
              const IconComponent = ch.icon;
              const isUnlocked = unlockedClasses.includes(ch.id);
              const isBusy = togglingClassId === ch.id;

              return (
                <div
                  key={ch.id}
                  className={`relative rounded-2xl p-5 sm:p-6 border transition-all flex flex-col justify-between overflow-hidden ${
                    isUnlocked
                      ? "bg-gradient-to-b from-emerald-950/50 via-stone-900/95 to-black border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                      : "bg-gradient-to-b from-stone-900/95 to-black border-stone-800"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity ${
                      isUnlocked ? "opacity-25" : "opacity-10 grayscale"
                    }`}
                    style={{ backgroundImage: `url('${ch.bgImage}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-stone-950/50 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                          isUnlocked
                            ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                            : "bg-stone-900/80 border-stone-700 text-stone-400"
                        }`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>

                      {isUnlocked ? (
                        <span className="px-3 py-1 rounded-full text-xs font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ABIERTO A ALUMNOS
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-sans font-semibold bg-stone-900 text-stone-400 border border-stone-700 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-500/80" />
                          SELLADO (OCULTO)
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-amber-100 mb-1">
                      {ch.title}
                    </h3>
                    <p className="text-xs font-sans font-semibold text-amber-400/90 mb-2">
                      {ch.subtitle}
                    </p>
                    <p className="text-xs text-stone-300 font-sans leading-relaxed mb-5">
                      {ch.description}
                    </p>
                  </div>

                  <div className="relative z-10 pt-4 border-t border-stone-800/80">
                    <button
                      onClick={() => handleToggleClass(ch.id, isUnlocked)}
                      disabled={isBusy}
                      className={`w-full py-3 px-4 rounded-xl font-sans font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                        isUnlocked
                          ? "bg-stone-900 hover:bg-rose-950/80 text-stone-200 hover:text-rose-200 border border-stone-700 hover:border-rose-600/60"
                          : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-stone-950 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                      }`}
                    >
                      {isUnlocked ? (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>{isBusy ? "Sellando..." : "Bloquear Desafío"}</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>{isBusy ? "Activando..." : "Activar Desafío Ahora"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
