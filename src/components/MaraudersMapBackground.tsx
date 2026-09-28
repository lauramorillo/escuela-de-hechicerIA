import React from "react";

// Componente para una huella individual izquierda o derecha
const FootprintIcon: React.FC<{
  isLeft?: boolean;
  className?: string;
  size?: number;
}> = ({ isLeft = true, className = "", size = 20 }) => (
  <svg
    width={size}
    height={size * 1.8}
    viewBox="0 0 16 28"
    fill="currentColor"
    className={`inline-block filter drop-shadow-[0_1px_1px_rgba(70,30,10,0.3)] ${className}`}
    style={{ transform: isLeft ? "scaleX(1)" : "scaleX(-1)" }}
  >
    {/* Tacón */}
    <path d="M 8 20 C 4.5 20 3 22 3 24.5 C 3 26.5 4.8 28 8 28 C 11.2 28 13 26.5 13 24.5 C 13 22 11.5 20 8 20 Z" />
    {/* Suela principal con puntera curvada */}
    <path d="M 8 0 C 4 0 1.5 2.5 1 6 C 0.5 9 2 12.5 4.5 15 C 6 16.5 7.5 18 8 18.5 C 8.5 18 10 16.5 11.5 15 C 14 12.5 15.5 9 15 6 C 14.5 2.5 12 0 8 0 Z" />
  </svg>
);

// Componente para huella de gato (Sra. Norris)
const CatPawIcon: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 14,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    className={`inline-block filter drop-shadow-[0_1px_1px_rgba(70,30,10,0.3)] ${className}`}
  >
    <circle cx="3" cy="4" r="1.8" />
    <circle cx="7" cy="2.2" r="1.8" />
    <circle cx="11" cy="3" r="1.8" />
    <circle cx="14" cy="5.8" r="1.6" />
    <path d="M 8 7 C 4.5 7 2.5 9.5 3 12.5 C 3.5 15 6 16 8 16 C 10 16 12.5 15 13 12.5 C 13.5 9.5 11.5 7 8 7 Z" />
  </svg>
);

// Etiqueta de personaje con tipografía del Mapa del Merodeador
const MarauderNameTag: React.FC<{
  name: string;
  subtitle?: string;
  rotation?: number;
}> = ({ name, subtitle, rotation = 0 }) => (
  <div
    className="inline-flex flex-col items-center px-2.5 py-0.5 rounded-sm bg-[#eedeb7]/85 border border-[#6b3b14]/70 shadow-[0_2px_5px_rgba(50,20,5,0.2)] backdrop-blur-[1px] pointer-events-none"
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    <span
      className="text-xs sm:text-sm font-bold tracking-wider text-[#381c09] leading-tight select-none"
      style={{ fontFamily: "'Fondamento', 'MedievalSharp', cursive, serif" }}
    >
      {name}
    </span>
    {subtitle && (
      <span
        className="text-[9px] italic text-[#633614] leading-none"
        style={{ fontFamily: "'Fondamento', cursive" }}
      >
        {subtitle}
      </span>
    )}
  </div>
);

export const MaraudersMapBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. PLANO ARQUITECTÓNICO DE PASILLOS Y HABITACIONES DE HOGWARTS */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 text-[#603513]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="corridor-pattern"
            width="140"
            height="140"
            patternUnits="userSpaceOnUse"
          >
            {/* Muros dobles góticos con arcos */}
            <path
              d="M 0 35 L 140 35 M 0 38 L 140 38"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
              strokeDasharray="4 2"
            />
            <path
              d="M 0 105 L 140 105 M 0 108 L 140 108"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
              strokeDasharray="4 2"
            />
            <path
              d="M 35 0 L 35 140 M 38 0 L 38 140"
              stroke="currentColor"
              strokeWidth="0.8"
              fill="none"
              opacity="0.6"
            />
            <circle
              cx="70"
              cy="70"
              r="22"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeDasharray="2 2"
            />
            <path
              d="M 70 48 L 70 92 M 48 70 L 92 70"
              stroke="currentColor"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#corridor-pattern)" />

        {/* Pasadizos y escaleras diagonales decorativas */}
        <g stroke="currentColor" fill="none" strokeWidth="1.5" opacity="0.7">
          <path d="M -50 150 Q 250 80 400 320 T 900 250" strokeDasharray="6 3" />
          <path d="M 800 50 Q 1100 200 1300 100 T 1700 450" strokeDasharray="5 3" />
          <path d="M 200 650 Q 450 500 700 750 T 1200 600" strokeDasharray="7 3" />
        </g>
      </svg>

      {/* RÓTULOS ARQUITECTÓNICOS DE LOCALIZACIONES CANÓNICAS */}
      <div
        className="absolute top-12 left-6 text-[11px] sm:text-xs text-[#522b0f]/35 font-bold uppercase tracking-[0.2em] -rotate-6"
        style={{ fontFamily: "'MedievalSharp', serif" }}
      >
        § Mazmorras de Pociones §
      </div>

      <div
        className="absolute top-28 right-10 text-[11px] sm:text-xs text-[#522b0f]/35 font-bold uppercase tracking-[0.2em] rotate-3"
        style={{ fontFamily: "'MedievalSharp', serif" }}
      >
        § Pasadizo de la Bruja Tuerta §
      </div>

      <div
        className="absolute bottom-20 left-10 text-[11px] sm:text-xs text-[#522b0f]/35 font-bold uppercase tracking-[0.2em] rotate-12"
        style={{ fontFamily: "'MedievalSharp', serif" }}
      >
        § Biblioteca: Sección Prohibida §
      </div>

      <div
        className="absolute bottom-28 right-8 text-[11px] sm:text-xs text-[#522b0f]/35 font-bold uppercase tracking-[0.2em] -rotate-3"
        style={{ fontFamily: "'MedievalSharp', serif" }}
      >
        § Despacho de Dumbledore §
      </div>

      {/* 2. RASTROS DE HUELLAS Y NOMBRES SUPERPUESTOS */}

      {/* RASTRO 1: SEVERUS SNAPE (Lateral Izquierdo) */}
      <div className="absolute top-[18%] left-[2%] sm:left-[5%] flex flex-col items-start gap-1 text-[#43210b]/75 animate-pulse" style={{ animationDuration: "4s" }}>
        <div className="flex items-center gap-2 mb-1.5 -ml-1">
          <MarauderNameTag name="Severus Snape" subtitle="Pasadizo de las mazmorras" rotation={-7} />
        </div>
        <div className="relative w-36 h-28">
          {/* Serie de pisadas alternadas */}
          <div className="absolute top-0 left-2 rotate-[25deg]">
            <FootprintIcon isLeft={true} size={15} />
          </div>
          <div className="absolute top-4 left-7 rotate-[30deg]">
            <FootprintIcon isLeft={false} size={15} />
          </div>
          <div className="absolute top-10 left-12 rotate-[25deg]">
            <FootprintIcon isLeft={true} size={15} />
          </div>
          <div className="absolute top-16 left-18 rotate-[35deg]">
            <FootprintIcon isLeft={false} size={15} />
          </div>
          <div className="absolute top-22 left-24 rotate-[28deg]">
            <FootprintIcon isLeft={true} size={15} />
          </div>
        </div>
      </div>

      {/* RASTRO 2: HARRY POTTER (Lateral Derecho - Arriba) */}
      <div className="absolute top-[12%] right-[3%] sm:right-[6%] flex flex-col items-end gap-1 text-[#43210b]/80">
        <div className="flex items-center gap-2 mb-1 mr-2">
          <MarauderNameTag name="Harry Potter" subtitle="Bajo la Capa de Invisibilidad" rotation={4} />
        </div>
        <div className="relative w-36 h-28">
          <div className="absolute top-0 right-4 rotate-[-35deg]">
            <FootprintIcon isLeft={false} size={14} />
          </div>
          <div className="absolute top-5 right-9 rotate-[-30deg]">
            <FootprintIcon isLeft={true} size={14} />
          </div>
          <div className="absolute top-12 right-14 rotate-[-40deg]">
            <FootprintIcon isLeft={false} size={14} />
          </div>
          <div className="absolute top-18 right-20 rotate-[-32deg]">
            <FootprintIcon isLeft={true} size={14} />
          </div>
          <div className="absolute top-24 right-26 rotate-[-38deg]">
            <FootprintIcon isLeft={false} size={14} />
          </div>
        </div>
      </div>

      {/* RASTRO 3: ARGUS FILCH Y SRA. NORRIS (Lateral Izquierdo - Centro) */}
      <div className="absolute top-[52%] left-[1%] sm:left-[4%] flex flex-col items-start gap-1 text-[#45220c]/70">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <MarauderNameTag name="Argus Filch" rotation={5} />
          <div className="flex items-center gap-1 bg-[#eedeb7]/75 px-1.5 py-0.5 rounded border border-[#6b3b14]/50">
            <span
              className="text-[11px] font-bold text-[#381c09]"
              style={{ fontFamily: "'Fondamento', cursive" }}
            >
              Sra. Norris
            </span>
            <CatPawIcon size={11} className="text-[#592c10]" />
          </div>
        </div>
        <div className="relative w-40 h-24">
          {/* Filch footprints */}
          <div className="absolute top-2 left-2 rotate-[-15deg]">
            <FootprintIcon isLeft={true} size={16} />
          </div>
          <div className="absolute top-7 left-8 rotate-[-10deg]">
            <FootprintIcon isLeft={false} size={16} />
          </div>
          <div className="absolute top-14 left-15 rotate-[-12deg]">
            <FootprintIcon isLeft={true} size={16} />
          </div>
          {/* Cat paw prints wandering alongside Filch */}
          <div className="absolute top-5 left-18 text-[#54290d] rotate-[10deg]">
            <CatPawIcon size={12} />
          </div>
          <div className="absolute top-10 left-22 text-[#54290d] rotate-[15deg]">
            <CatPawIcon size={12} />
          </div>
          <div className="absolute top-16 left-26 text-[#54290d] rotate-[12deg]">
            <CatPawIcon size={12} />
          </div>
        </div>
      </div>

      {/* RASTRO 4: ALBUS DUMBLEDORE (Lateral Derecho - Centro) */}
      <div className="absolute top-[48%] right-[2%] sm:right-[5%] flex flex-col items-end gap-1 text-[#3b1b08]/75">
        <div className="flex items-center gap-2 mb-1 mr-1">
          <MarauderNameTag name="Albus Dumbledore" subtitle="Rondando la Torre del Reloj" rotation={-3} />
        </div>
        <div className="relative w-36 h-28">
          <div className="absolute top-1 right-2 rotate-[40deg]">
            <FootprintIcon isLeft={true} size={15} />
          </div>
          <div className="absolute top-6 right-7 rotate-[35deg]">
            <FootprintIcon isLeft={false} size={15} />
          </div>
          <div className="absolute top-12 right-13 rotate-[42deg]">
            <FootprintIcon isLeft={true} size={15} />
          </div>
          <div className="absolute top-18 right-19 rotate-[38deg]">
            <FootprintIcon isLeft={false} size={15} />
          </div>
        </div>
      </div>

      {/* RASTRO 5: PETER PETTIGREW (Parte Inferior Izquierda - Sigiloso) */}
      <div className="absolute bottom-[8%] left-[3%] sm:left-[7%] flex flex-col items-start gap-1 text-[#43210b]/60 opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 mb-1">
          <MarauderNameTag name="Peter Pettigrew" subtitle="¿En los muros del pasillo?" rotation={8} />
        </div>
        <div className="relative w-32 h-20">
          <div className="absolute top-1 left-2 rotate-[-45deg]">
            <FootprintIcon isLeft={true} size={13} />
          </div>
          <div className="absolute top-5 left-7 rotate-[-40deg]">
            <FootprintIcon isLeft={false} size={13} />
          </div>
          <div className="absolute top-10 left-13 rotate-[-50deg]">
            <FootprintIcon isLeft={true} size={13} />
          </div>
          <div className="absolute top-14 left-18 rotate-[-42deg]">
            <FootprintIcon isLeft={false} size={13} />
          </div>
        </div>
      </div>

      {/* RASTRO 6: REMUS LUPIN (Parte Inferior Derecha) */}
      <div className="absolute bottom-[6%] right-[3%] sm:right-[7%] flex flex-col items-end gap-1 text-[#3d1d09]/75">
        <div className="flex items-center gap-2 mb-1">
          <MarauderNameTag name="Remus Lupin" subtitle="Inspección de Artefactos Oscuros" rotation={-6} />
        </div>
        <div className="relative w-32 h-20">
          <div className="absolute top-1 right-2 rotate-[25deg]">
            <FootprintIcon isLeft={false} size={15} />
          </div>
          <div className="absolute top-5 right-7 rotate-[20deg]">
            <FootprintIcon isLeft={true} size={15} />
          </div>
          <div className="absolute top-10 right-13 rotate-[30deg]">
            <FootprintIcon isLeft={false} size={15} />
          </div>
          <div className="absolute top-15 right-19 rotate-[22deg]">
            <FootprintIcon isLeft={true} size={15} />
          </div>
        </div>
      </div>
    </div>
  );
};
