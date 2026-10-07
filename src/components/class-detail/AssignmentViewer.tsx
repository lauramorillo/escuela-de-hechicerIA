import React, { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";

interface AssignmentViewerProps {
  assignment: string;
  isTransfiguration?: boolean;
  theme?: "dark" | "parchment";
}

interface ContentPart {
  type: "text" | "code";
  content: string;
  lang?: string;
}

const GRADE_CARD_STYLES: Record<string, { badge: string; text: string; bg: string; border: string }> = {
  E: { badge: "bg-amber-500 text-stone-950 font-black", text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  S: { badge: "bg-indigo-500 text-white font-black", text: "text-indigo-300", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  A: { badge: "bg-emerald-500 text-white font-black", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  I: { badge: "bg-orange-500 text-white font-black", text: "text-orange-300", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  D: { badge: "bg-rose-600 text-white font-black", text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  T: { badge: "bg-stone-800 text-red-400 font-black", text: "text-red-400", bg: "bg-red-950/20", border: "border-red-900/40" },
};

const GRADE_CARD_STYLES_PARCHMENT: Record<string, { badge: string; text: string; bg: string; border: string }> = {
  E: { badge: "bg-amber-500 text-stone-950 font-black shadow-sm", text: "text-amber-900", bg: "bg-amber-500/15", border: "border-amber-600/40" },
  S: { badge: "bg-indigo-600 text-white font-black shadow-sm", text: "text-indigo-900", bg: "bg-indigo-500/15", border: "border-indigo-600/40" },
  A: { badge: "bg-emerald-600 text-white font-black shadow-sm", text: "text-emerald-900", bg: "bg-emerald-500/15", border: "border-emerald-600/40" },
  I: { badge: "bg-orange-500 text-white font-black shadow-sm", text: "text-orange-900", bg: "bg-orange-500/15", border: "border-orange-600/40" },
  D: { badge: "bg-rose-600 text-white font-black shadow-sm", text: "text-rose-900", bg: "bg-rose-500/15", border: "border-rose-600/40" },
  T: { badge: "bg-stone-800 text-red-400 font-black shadow-sm", text: "text-stone-900", bg: "bg-stone-900/10", border: "border-stone-700/40" },
};

function splitContentIntoParts(text: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const codeRegex = /```([a-z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "json", content: match[2].trim() });
    lastIndex = codeRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts;
}

const CodeBlock: React.FC<{ lang?: string; content: string }> = ({ lang = "json", content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="my-4 rounded-xl bg-[#0c0d12] border border-amber-600/40 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900/90 border-b border-stone-800 text-xs sm:text-sm text-amber-300 font-mono font-bold">
        <span className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-amber-400" />
          <span>Formato de entrega ({lang.toUpperCase()})</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded bg-black/60 text-stone-300 border border-stone-700">
            {lang}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 border border-amber-500/30"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "¡Copiado!" : "Copiar"}</span>
          </button>
        </div>
      </div>
      <pre className="p-4 sm:p-5 text-sm sm:text-base font-mono leading-relaxed text-amber-200 overflow-x-auto bg-[#0a0a0e]">
        <code>{content}</code>
      </pre>
    </div>
  );
};

const TimoGradeCard: React.FC<{
  letter: string;
  name: string;
  points?: string;
  desc: string;
  theme?: "dark" | "parchment";
}> = ({ letter, name, points, desc, theme = "dark" }) => {
  const isParchment = theme === "parchment";
  const stylesTable = isParchment ? GRADE_CARD_STYLES_PARCHMENT : GRADE_CARD_STYLES;
  const style = stylesTable[letter] || {
    badge: "bg-amber-500 text-stone-950 font-black",
    text: isParchment ? "text-amber-900" : "text-amber-300",
    bg: isParchment ? "bg-amber-500/10" : "bg-black/40",
    border: isParchment ? "border-amber-700/30" : "border-stone-800",
  };

  return (
    <div className={`p-3.5 sm:p-4 rounded-xl border ${style.bg} ${style.border} flex flex-col sm:flex-row sm:items-start gap-3 transition-all shadow-sm`}>
      <div className="flex items-center gap-3 shrink-0 sm:min-w-[220px]">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shadow-sm shrink-0 ${style.badge}`}>
          {letter}
        </span>
        <div className="flex flex-col">
          <span className={`font-bold text-base ${style.text}`}>{name}</span>
          {points && (
            <span className={`text-xs font-mono font-semibold ${isParchment ? "text-[#5e2f0d]" : "text-stone-300"}`}>
              {points}
            </span>
          )}
        </div>
      </div>
      <div className={`text-base leading-relaxed font-sans sm:pt-0.5 ${isParchment ? "text-[#2e1709]" : "text-stone-200"}`}>
        {desc}
      </div>
    </div>
  );
};

const BulletList: React.FC<{ content: string; keyPrefix: string | number; theme?: "dark" | "parchment" }> = ({
  content,
  keyPrefix,
  theme = "dark",
}) => {
  const isParchment = theme === "parchment";
  const lines = content.split("\n");

  return (
    <div key={keyPrefix} className="space-y-2.5 my-2">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return null;

        const isIndented = /^\s{2,}|\t/.test(rawLine);
        const cleanLine = line.replace(/^[•\-]\s*/, "").trim();
        if (!cleanLine) return null;

        const isHeader = line.includes("⚠️") ||
          cleanLine.toLowerCase().startsWith("política de reintentos") ||
          (!rawLine.trimStart().startsWith("•") && !rawLine.trimStart().startsWith("-") && line.endsWith(":"));

        const gradeMatch = cleanLine.match(/^([ESADTI])\s*\(([^)]+)\)\s*(?:\(([^)]+)\))?:\s*(.*)$/);
        if (gradeMatch) {
          return (
            <TimoGradeCard
              key={idx}
              letter={gradeMatch[1]}
              name={gradeMatch[2]}
              points={gradeMatch[3]}
              desc={gradeMatch[4]}
              theme={theme}
            />
          );
        }

        const noteMatch = cleanLine.match(/^(Nota(?: del tribunal)?):\s*(.*)$/i);
        if (noteMatch) {
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 my-1 ${
                isParchment
                  ? "border-[#cbb085] bg-[#ead4a8]/50 text-[#3b1d09] text-sm sm:text-base"
                  : "border-amber-600/30 bg-amber-950/20 text-amber-200/90 text-sm sm:text-base"
              }`}
            >
              <span className={`font-bold shrink-0 ${isParchment ? "text-[#7a431c]" : "text-amber-300"}`}>
                {noteMatch[1]}:
              </span>
              <span>{noteMatch[2]}</span>
            </div>
          );
        }

        if (isHeader) {
          return (
            <div
              key={idx}
              className={`pt-3 pb-1 font-bold text-base sm:text-lg flex items-center gap-2 ${
                isParchment ? "text-[#7a431c]" : "text-amber-300"
              }`}
            >
              <span>{cleanLine}</span>
            </div>
          );
        }

        if (isIndented) {
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 text-base sm:text-lg leading-relaxed pl-7 sm:pl-9 ${
                isParchment ? "text-[#4b260f]" : "text-stone-300"
              }`}
            >
              <span className={`text-xs shrink-0 mt-1.5 font-bold ${isParchment ? "text-[#8a4a1c]" : "text-amber-400/90"}`}>
                ▸
              </span>
              <span className="font-sans">{cleanLine}</span>
            </div>
          );
        }

        return (
          <div
            key={idx}
            className={`flex items-start gap-2.5 text-base sm:text-lg leading-relaxed pl-2 ${
              isParchment ? "text-[#2e1709]" : "text-stone-200"
            }`}
          >
            <span className={`font-bold mt-1 text-sm shrink-0 ${isParchment ? "text-[#7a431c]" : "text-amber-400"}`}>
              ◆
            </span>
            <span className="font-sans">{cleanLine}</span>
          </div>
        );
      })}
    </div>
  );
};

export const AssignmentViewer: React.FC<AssignmentViewerProps> = ({ assignment, theme = "dark" }) => {
  if (!assignment) return null;

  const isParchment = theme === "parchment";
  const parts = splitContentIntoParts(assignment);

  return (
    <div className="space-y-4">
      {parts.map((part, pIdx) => {
        if (part.type === "code") {
          return <CodeBlock key={pIdx} lang={part.lang} content={part.content} />;
        }

        const paragraphs = part.content.split("\n\n");
        return (
          <div key={pIdx} className="space-y-3">
            {paragraphs.map((para, paraIdx) => {
              const trimmed = para.trim();
              if (!trimmed) return null;

              const numberedHeaderMatch = trimmed.match(/^(\d+\.\s+[^:\n]+:?)([\s\S]*)$/);
              if (numberedHeaderMatch) {
                const title = numberedHeaderMatch[1];
                const rest = numberedHeaderMatch[2]?.trim();
                const hasBullets = rest && (rest.startsWith("• ") || rest.startsWith("- ") || rest.includes("\n• ") || rest.includes("\n- ") || /(\n\s*[•\-])/.test(rest) || rest.includes("⚠️"));

                return (
                  <div key={paraIdx} className="pt-2">
                    <h3
                      className={`text-base sm:text-lg md:text-xl font-bold tracking-wide mb-2 flex items-center gap-2 ${
                        isParchment ? "text-[#7a431c]" : "text-amber-300"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isParchment ? "bg-[#7a431c]" : "bg-amber-400"}`} />
                      <span>{title}</span>
                    </h3>
                    {rest && (
                      hasBullets ? (
                        <BulletList content={rest} keyPrefix={`header-rest-${paraIdx}`} theme={theme} />
                      ) : (
                        <p
                          className={`text-base sm:text-lg leading-relaxed font-sans pl-4 whitespace-pre-line ${
                            isParchment ? "text-[#2e1709]" : "text-stone-200"
                          }`}
                        >
                          {rest}
                        </p>
                      )
                    )}
                  </div>
                );
              }

              const hasBulletsInPara = trimmed.startsWith("• ") || trimmed.startsWith("- ") || /(\n\s*[•\-])/.test(trimmed) || trimmed.includes("⚠️");

              if (hasBulletsInPara) {
                return <BulletList key={paraIdx} content={trimmed} keyPrefix={paraIdx} theme={theme} />;
              }

              return (
                <p
                  key={paraIdx}
                  className={`text-base sm:text-lg leading-relaxed font-sans whitespace-pre-line ${
                    isParchment ? "text-[#2e1709]" : "text-stone-200"
                  }`}
                >
                  {trimmed}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
