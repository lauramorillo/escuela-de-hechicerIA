import React, { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";

interface AssignmentViewerProps {
  assignment: string;
  isTransfiguration?: boolean;
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
}> = ({ letter, name, points, desc }) => {
  const style = GRADE_CARD_STYLES[letter] || {
    badge: "bg-amber-500 text-stone-950 font-black",
    text: "text-amber-300",
    bg: "bg-black/40",
    border: "border-stone-800",
  };

  return (
    <div className={`p-3.5 sm:p-4 rounded-xl border ${style.bg} ${style.border} flex flex-col sm:flex-row sm:items-start gap-3 transition-all`}>
      <div className="flex items-center gap-3 shrink-0 sm:min-w-[220px]">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shadow-sm shrink-0 ${style.badge}`}>
          {letter}
        </span>
        <div className="flex flex-col">
          <span className={`font-bold text-base ${style.text}`}>{name}</span>
          {points && (
            <span className="text-xs font-mono text-stone-300 font-semibold">{points}</span>
          )}
        </div>
      </div>
      <div className="text-base text-stone-200 leading-relaxed font-sans sm:pt-0.5">
        {desc}
      </div>
    </div>
  );
};

const BulletList: React.FC<{ content: string; keyPrefix: string | number }> = ({ content, keyPrefix }) => {
  const lines = content.split("\n");

  return (
    <div key={keyPrefix} className="space-y-2.5 my-2">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return null;

        const cleanLine = line.replace(/^[•\-]\s*/, "").trim();
        if (!cleanLine) return null;

        const gradeMatch = cleanLine.match(/^([ESADTI])\s*\(([^)]+)\)\s*(?:\(([^)]+)\))?:\s*(.*)$/);
        if (gradeMatch) {
          return (
            <TimoGradeCard
              key={idx}
              letter={gradeMatch[1]}
              name={gradeMatch[2]}
              points={gradeMatch[3]}
              desc={gradeMatch[4]}
            />
          );
        }

        const noteMatch = cleanLine.match(/^(Nota(?: del tribunal)?):\s*(.*)$/i);
        if (noteMatch) {
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-amber-600/30 bg-amber-950/20 text-amber-200/90 text-sm sm:text-base flex items-start gap-2.5 my-1"
            >
              <span className="font-bold text-amber-300 shrink-0">{noteMatch[1]}:</span>
              <span>{noteMatch[2]}</span>
            </div>
          );
        }

        return (
          <div key={idx} className="flex items-start gap-2.5 text-base sm:text-lg text-stone-200 leading-relaxed pl-2">
            <span className="text-amber-400 font-bold mt-1 text-sm shrink-0">◆</span>
            <span className="font-sans">{cleanLine}</span>
          </div>
        );
      })}
    </div>
  );
};

export const AssignmentViewer: React.FC<AssignmentViewerProps> = ({ assignment }) => {
  if (!assignment) return null;

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
                const hasBullets = rest && (rest.startsWith("• ") || rest.startsWith("- ") || rest.includes("\n• ") || rest.includes("\n- "));

                return (
                  <div key={paraIdx} className="pt-2">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-amber-300 tracking-wide mb-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      <span>{title}</span>
                    </h3>
                    {rest && (
                      hasBullets ? (
                        <BulletList content={rest} keyPrefix={`header-rest-${paraIdx}`} />
                      ) : (
                        <p className="text-base sm:text-lg text-stone-200 leading-relaxed font-sans pl-4 whitespace-pre-line">
                          {rest}
                        </p>
                      )
                    )}
                  </div>
                );
              }

              if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.includes("\n• ") || trimmed.includes("\n- ")) {
                return <BulletList key={paraIdx} content={trimmed} keyPrefix={paraIdx} />;
              }

              return (
                <p key={paraIdx} className="text-base sm:text-lg text-stone-200 leading-relaxed font-sans whitespace-pre-line">
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
