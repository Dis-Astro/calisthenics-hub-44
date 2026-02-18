import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

export interface ExerciseSuggestion {
  id: string;
  name: string;
  muscle_group: string | null;
}

const COLOR_MAP: Record<string, string> = {
  arancione: "#f97316",
  azzurro:   "#38bdf8",
  verde:     "#22c55e",
  giallo:    "#eab308",
};

function detectColor(value: string): string | undefined {
  const lower = value.toLowerCase();
  for (const [keyword, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(keyword)) return hex;
  }
  return undefined;
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
  const color = detectColor(value);

  return (
    <div className={`relative flex-1 ${className ?? ""}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full transition-colors"
        style={color ? { color, borderColor: color + "80", fontWeight: 600 } : undefined}
        autoComplete="off"
      />
    </div>
  );
};

export default ExerciseNameInput;
