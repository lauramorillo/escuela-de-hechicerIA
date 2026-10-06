import React from "react";

export interface StudentBadgeProps {
  studentHouse: string;
  studentId?: string;
  className?: string;
}

export const HOUSE_THEMES: Record<
  string,
  { main: string; accent: string; text: string; name: string; emblem: string }
> = {
  gryffindor: { main: "#740001", accent: "#d3a625", text: "#eeba30", name: "Gryffindor", emblem: "🦁" },
  slytherin: { main: "#1a472a", accent: "#aaaaaa", text: "#c0c0c0", name: "Slytherin", emblem: "🐍" },
  ravenclaw: { main: "#0e1a40", accent: "#946b2d", text: "#946b2d", name: "Ravenclaw", emblem: "🦅" },
  hufflepuff: { main: "#ecb939", accent: "#372e29", text: "#111111", name: "Hufflepuff", emblem: "🦡" },
};

export const StudentBadge: React.FC<StudentBadgeProps> = ({
  studentHouse,
  studentId,
  className = "",
}) => {
  const normalizedHouse = (studentHouse || "gryffindor").toLowerCase();
  const theme = HOUSE_THEMES[normalizedHouse] || HOUSE_THEMES.gryffindor;

  const effectiveId =
    (studentId && studentId.trim()) ||
    (typeof window !== "undefined"
      ? localStorage.getItem("sorting_hat_student_id") || ""
      : "");

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border shadow-xl backdrop-blur-md transition-all ${className}`}
      style={{
        backgroundColor: `${theme.main}cc`,
        borderColor: theme.accent,
      }}
    >
      <span className="text-base sm:text-lg shrink-0">{theme.emblem}</span>
      <span className="font-bold text-xs sm:text-sm tracking-wider uppercase text-amber-100 shrink-0">
        {theme.name}
      </span>
      {effectiveId && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-amber-200/90 font-mono tracking-tight truncate max-w-[150px] sm:max-w-[220px]">
            {effectiveId}
          </span>
        </>
      )}
    </div>
  );
};
