import React, { useEffect, useState, useRef, type FormEvent } from "react";
import { motion } from "motion/react";
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
    border: "border-[#d3a625]/70",
    glow: "shadow-[0_0_55px_rgba(174,0,1,0.5)]",
    textAccent: "text-[#eeba30]",
    badgeBg: "bg-[#740001] text-[#eeba30] border-[#d3a625]",
  },
  slytherin: {
    name: "Slytherin",
    emblem: "🐍",
    gradient: "from-[#1a472a]/90 via-[#0f2b19]/95 to-stone-950",
    border: "border-emerald-400/60",
    glow: "shadow-[0_0_55px_rgba(42,98,61,0.5)]",
    textAccent: "text-emerald-300",
    badgeBg: "bg-[#1a472a] text-emerald-200 border-emerald-400/60",
  },
  ravenclaw: {
    name: "Ravenclaw",
    emblem: "🦅",
    gradient: "from-[#0e1a40]/90 via-[#081029]/95 to-stone-950",
    border: "border-sky-400/60",
    glow: "shadow-[0_0_55px_rgba(34,47,91,0.55)]",
    textAccent: "text-sky-300",
    badgeBg: "bg-[#0e1a40] text-sky-200 border-sky-400/60",
  },
  hufflepuff: {
    name: "Hufflepuff",
    emblem: "🦡",
    gradient: "from-[#b8860b]/85 via-[#5c4306]/95 to-stone-950",
    border: "border-[#ecb939]/80",
    glow: "shadow-[0_0_55px_rgba(236,185,57,0.45)]",
    textAccent: "text-[#ecb939]",
    badgeBg: "bg-[#ecb939] text-stone-950 border-yellow-200",
  },
};

const CHALLENGE_DEFINITIONS = [
  {
    id: "transfiguration",
    order: 1,
    title: "1. Transfiguración",
    subtitle: "McGonagall",
    icon: Wand2,
  },
  {
    id: "defense",
    order: 2,
    title: "2. Mapa del Merodeador",
    subtitle: "Lupin",
    icon: Map,
  },
  {
    id: "battle",
    order: 3,
    title: "3. Batalla de Hogwarts",
    subtitle: "Dumbledore",
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

  // Pantalla de Contraseña de Profesora (protege tanto /profesor como /profesor/ganadores)
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
  // Muestra directamente la Casa Ganadora y el Alumno/a Ganador sin clics extra
  // ============================================================================
  if (mode === "winners") {
    const winStyle = HOUSE_STYLES[winningHouseItem?.house || "gryffindor"] || HOUSE_STYLES.gryffindor;

    return (
      <div className="fixed inset-0 w-screen h-screen bg-stone-950 text-white font-serif overflow-y-auto select-none">
        <div
          className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.35] contrast-115"
          style={{ backgroundImage: "url('/escuela-hechiceria-bg-no-tittle.jpg')" }}
        />
        <div className="fixed inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-black/75 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 sm:py-8 flex flex-col min-h-screen justify-between">
          {/* Barra superior */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-amber-800/40">
            <button
              onClick={() => onNavigateMode("dashboard")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 hover:bg-black/90 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-sans transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver al Panel de la Profesora</span>
            </button>

            <button
              onClick={() => fetchDashboard(true)}
              className="p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDashboard ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>

          {/* Encabezado de la Ceremonia */}
          <div className="text-center my-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/70 border border-amber-400/40 text-amber-300 text-xs sm:text-sm tracking-widest uppercase mb-2 font-sans">
              <Trophy className="w-4 h-4 text-amber-400" />
              Gran Ceremonia de Clausura • Torneo de las Casas
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-lg">
              ¡Campeones de la Escuela de HechicerIA!
            </h1>
          </div>

          {/* Dos grandes protagonistas a pantalla completa: Casa Ganadora + Alumno/a MVP */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch my-4">
            {/* 1. Tarjeta Gigante de la Casa Ganadora */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`relative rounded-3xl p-8 sm:p-10 border-2 bg-gradient-to-b ${winStyle.gradient} ${winStyle.border} ${winStyle.glow} flex flex-col items-center justify-center text-center overflow-hidden`}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 border border-amber-400/50 text-amber-300 text-xs sm:text-sm uppercase tracking-widest font-sans font-bold mb-6">
                <Trophy className="w-4 h-4 text-amber-400" />
                Casa Ganadora de la Copa
              </div>

              {winningHouseItem ? (
                <div className="flex flex-col items-center">
                  <div className="text-8xl sm:text-9xl mb-6 drop-shadow-[0_0_35px_rgba(255,255,255,0.45)]">
                    {winStyle.emblem}
                  </div>
                  <div className="text-xs sm:text-sm uppercase tracking-[0.3em] text-amber-300 font-sans font-bold mb-2">
                    ¡La Copa de las Casas es para...
                  </div>
                  <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-wide drop-shadow-xl">
                    {winningHouseItem.houseName}
                  </h2>
                </div>
              ) : (
                <p className="text-stone-400 font-sans text-lg">Aún no hay entregas registradas.</p>
              )}
            </motion.div>

            {/* 2. Tarjeta Gigante del Alumno/a Ganador de esa Casa (MVP) */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative rounded-3xl p-8 sm:p-10 border-2 bg-gradient-to-b from-amber-950/85 via-stone-900/95 to-black border-amber-400/80 shadow-[0_0_65px_rgba(234,179,8,0.4)] flex flex-col items-center justify-center text-center overflow-hidden"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 border border-amber-400/50 text-amber-300 text-xs sm:text-sm uppercase tracking-widest font-sans font-bold mb-6">
                <Crown className="w-4 h-4 text-amber-400" />
                Premio Especial Individual
              </div>

              {mvpStudent ? (
                <div className="w-full flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(234,179,8,0.45)]">
                    <Crown className="w-11 h-11 text-amber-300" />
                  </div>

                  <div className="text-xs sm:text-sm uppercase tracking-[0.25em] text-amber-300 font-sans font-bold mb-3">
                    Mayor Contribución en {winStyle.name}
                  </div>

                  {/* Identificador del alumno ganador gigante */}
                  <div className="my-2 px-8 py-5 rounded-2xl bg-black/85 border-2 border-amber-400 shadow-[0_0_40px_rgba(234,179,8,0.35)] max-w-full">
                    <span className="text-3xl sm:text-5xl font-mono font-black text-amber-300 tracking-tight break-all">
                      {mvpStudent.studentId}
                    </span>
                  </div>

                  <p className="mt-4 text-stone-300 text-sm sm:text-base font-sans max-w-md">
                    Revisa la esquina superior derecha de tu pantalla: si este es tu identificador de alumno/a, ¡acércate a recoger tu premio!
                  </p>
                </div>
              ) : (
                <p className="text-stone-400 font-sans text-lg">
                  Aún no hay entregas registradas en la casa ganadora.
                </p>
              )}
            </motion.div>
          </div>

          <div className="h-2" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // PANTALLA 1: PANEL DE CONTROL DE LA PROFESORA (/profesor)
  // Optimizado para proyectarse durante todo el taller:
  // - Marcador gigante de las 4 casas (sin desvelar al alumno líder)
  // - Barra inferior compacta para activar/bloquear los 3 desafíos
  // ============================================================================
  return (
    <div className="fixed inset-0 w-screen h-screen bg-stone-950 text-white font-serif overflow-y-auto select-none">
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none filter brightness-[0.35] contrast-110"
        style={{ backgroundImage: "url('/escuela-hechiceria-bg-no-tittle.jpg')" }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-black/75 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-6 flex flex-col min-h-screen justify-between gap-4">
        {/* Barra Superior Compacta */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitToApp}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-stone-700 text-stone-300 text-xs font-sans transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Vista Alumnos</span>
            </button>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h1 className="text-lg sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
                Copa de las Casas • Puntuación en Tiempo Real
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateMode("winners")}
              className="px-5 py-2 rounded-full font-sans font-bold text-xs sm:text-sm flex items-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 hover:scale-105 transition-all shadow-[0_0_25px_rgba(234,179,8,0.45)] cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-stone-950" />
              <span>Proclamar Ganadores 🏆</span>
            </button>

            <button
              onClick={() => fetchDashboard(true)}
              className="p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 transition-colors cursor-pointer"
              title="Refrescar datos ahora"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDashboard ? "animate-spin text-amber-400" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/50 text-rose-300 transition-colors cursor-pointer"
              title="Cerrar sesión de Profesora"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SECCIÓN PRINCIPAL GIGANTE: PUNTUACIONES DE LAS 4 CASAS (Protagonista de la pantalla) */}
        <div className="flex-1 flex flex-col justify-center my-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 h-full">
            {(["gryffindor", "slytherin", "ravenclaw", "hufflepuff"] as const).map((houseId) => {
              const st = HOUSE_STYLES[houseId];
              const rankingObj = houseRankings.find((r) => r.house === houseId);
              const score = summary?.houseScores?.[houseId] ?? 0;
              const members = rankingObj?.membersCount ?? summary?.houseCounts?.[houseId] ?? 0;

              return (
                <div
                  key={houseId}
                  className={`p-6 sm:p-8 rounded-3xl border-2 bg-gradient-to-b ${st.gradient} ${st.border} ${st.glow} flex flex-col items-center justify-between text-center min-h-[280px] sm:min-h-[360px] transition-all`}
                >
                  {/* Emblema y Nombre de la Casa */}
                  <div className="flex flex-col items-center">
                    <span className="text-6xl sm:text-7xl mb-3 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                      {st.emblem}
                    </span>
                    <h2 className="font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
                      {st.name}
                    </h2>
                  </div>

                  {/* Puntuación Gigante */}
                  <div className="my-4 flex flex-col items-center">
                    <div className={`text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none ${st.textAccent} drop-shadow-lg`}>
                      {score}
                    </div>
                    <span className="mt-2 text-xs sm:text-sm uppercase tracking-[0.25em] text-stone-300 font-sans font-semibold">
                      Puntos
                    </span>
                  </div>

                  {/* Integrantes de la Casa */}
                  <div className="px-4 py-1.5 rounded-full bg-black/45 border border-white/15 text-xs sm:text-sm text-stone-200 font-sans flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>
                      <strong>{members}</strong> {members === 1 ? "mago" : "magos"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BARRA INFERIOR COMPACTA: CONTROL DE ACTIVACIÓN DE LOS 3 DESAFÍOS */}
        <div className="pt-3 border-t border-amber-900/40">
          <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-3 sm:px-5 sm:py-3.5 flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-sans font-bold text-amber-300 uppercase tracking-wider shrink-0">
              <Wand2 className="w-4 h-4 text-amber-400" />
              <span>Control de Desafíos:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full lg:w-auto flex-1 max-w-4xl">
              {CHALLENGE_DEFINITIONS.map((ch) => {
                const IconComponent = ch.icon;
                const isUnlocked = unlockedClasses.includes(ch.id);
                const isBusy = togglingClassId === ch.id;

                return (
                  <div
                    key={ch.id}
                    className={`px-3.5 py-2 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isUnlocked
                        ? "bg-emerald-950/40 border-emerald-500/50"
                        : "bg-stone-900/80 border-stone-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent
                        className={`w-4 h-4 shrink-0 ${
                          isUnlocked ? "text-emerald-400" : "text-stone-400"
                        }`}
                      />
                      <div className="truncate">
                        <div className="text-xs sm:text-sm font-bold text-stone-100 truncate font-sans">
                          {ch.title}
                        </div>
                        <div className="text-[10px] font-sans flex items-center gap-1">
                          {isUnlocked ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Abierto
                            </span>
                          ) : (
                            <span className="text-stone-400 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-500/80" /> Sellado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleClass(ch.id, isUnlocked)}
                      disabled={isBusy}
                      className={`px-3 py-1.5 rounded-lg font-sans font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50 ${
                        isUnlocked
                          ? "bg-stone-800 hover:bg-rose-950 text-stone-300 hover:text-rose-200 border border-stone-700"
                          : "bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-stone-950 shadow-md"
                      }`}
                    >
                      {isUnlocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{isBusy ? "..." : "Bloquear"}</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{isBusy ? "..." : "Activar"}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
