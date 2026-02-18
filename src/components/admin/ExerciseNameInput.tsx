import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

export interface ExerciseSuggestion {
  id: string;
  name: string;
  muscle_group: string | null;
}

interface ExerciseNameInputProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: ExerciseSuggestion[];
  onSelectSuggestion: (ex: ExerciseSuggestion) => void;
  placeholder?: string;
  className?: string;
}

const ExerciseNameInput = ({
  value,
  onChange,
  suggestions,
  onSelectSuggestion,
  placeholder = "Es. Squat sotto 90° lento con pausa...",
  className,
}: ExerciseNameInputProps) => {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<ExerciseSuggestion[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 2) {
      const f = suggestions.filter((s) =>
        s.name.toLowerCase().includes(value.toLowerCase())
      );
      setFiltered(f.slice(0, 6));
      setOpen(f.length > 0);
    } else {
      setOpen(false);
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative flex-1 ${className ?? ""}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-44 overflow-auto">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectSuggestion(ex);
                setOpen(false);
              }}
            >
              <span>{ex.name}</span>
              {ex.muscle_group && (
                <span className="text-xs text-muted-foreground">{ex.muscle_group}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExerciseNameInput;
