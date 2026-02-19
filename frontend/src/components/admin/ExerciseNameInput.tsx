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

/** Divide il testo in token (parole + spazi/punteggiatura) e colora le keyword */
function renderColoredTokens(value: string) {
  // Split mantenendo i separatori come token separati
  const tokens = value.split(/(\s+)/);
  return tokens.map((token, i) => {
    const color = COLOR_MAP[token.toLowerCase().replace(/[^a-zàèéìòù]/gi, "")];
    if (color) {
      return (
        <span key={i} style={{ color, fontWeight: 700 }}>
          {token}
        </span>
      );
    }
    return <span key={i}>{token}</span>;
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
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative flex-1 h-10", className)}>
      {/* Layer colorato sotto */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center px-3 text-sm font-normal pointer-events-none overflow-hidden whitespace-pre rounded-md"
        style={{ zIndex: 1 }}
      >
        {value ? renderColoredTokens(value) : null}
      </div>

      {/* Input trasparente sopra */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "absolute inset-0 w-full h-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "transition-colors"
        )}
        style={{
          color: "transparent",
          caretColor: "hsl(var(--foreground))",
          zIndex: 2,
        }}
      />
    </div>
  );
};

export default ExerciseNameInput;
