import { useRef } from "react";
import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, string> = {
  arancione: "#f97316",
  azzurro:   "#38bdf8",
  verde:     "#22c55e",
  giallo:    "#eab308",
  rosso:     "#ef4444",
  blu:       "#3b82f6",
  viola:     "#a855f7",
};

/** Divide il testo in token (parole + spazi/punteggiatura) e colora le keyword, preservando le newline */
function renderColoredTokens(value: string) {
  // Split by newlines first, then by spaces within each line
  const lines = value.split(/(\n)/);
  return lines.map((line, lineIdx) => {
    if (line === "\n") {
      return <br key={`br-${lineIdx}`} />;
    }
    const tokens = line.split(/(\s+)/);
    return tokens.map((token, i) => {
      const color = COLOR_MAP[token.toLowerCase().replace(/[^a-zàèéìòù]/gi, "")];
      if (color) {
        return (
          <span key={`${lineIdx}-${i}`} style={{ color, fontWeight: 700 }}>
            {token}
          </span>
        );
      }
      return <span key={`${lineIdx}-${i}`}>{token}</span>;
    });
  });
}

interface ExerciseNameInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const ExerciseNameInput = ({
  value,
  onChange,
  placeholder = "Es. Elastico arancione - Squat sotto 90°...",
  className,
}: ExerciseNameInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate the height based on content lines (min 1 line = ~40px, each additional line adds ~20px)
  const lineCount = Math.max(1, (value.match(/\n/g) || []).length + 1);
  const minHeight = Math.max(40, lineCount * 22 + 18);

  return (
    <div className={cn("relative flex-1", className)} style={{ minHeight }}>
      {/* Layer colorato sotto */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-start px-3 py-2 text-sm font-normal pointer-events-none overflow-hidden rounded-md"
        style={{ zIndex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {value ? renderColoredTokens(value) : null}
      </div>

      {/* Textarea trasparente sopra */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        rows={lineCount}
        className={cn(
          "absolute inset-0 w-full h-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "transition-colors resize-none overflow-hidden"
        )}
        style={{
          color: "transparent",
          caretColor: "hsl(var(--foreground))",
          zIndex: 2,
          minHeight,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      />
    </div>
  );
};

export default ExerciseNameInput;
