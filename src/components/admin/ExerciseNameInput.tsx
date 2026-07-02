import { useCallback, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const COMBO_SYMBOL = String.fromCodePoint(0x1f517);

const COLOR_MAP: Record<string, string> = {
  arancione: "#f97316",
  azzurro: "#38bdf8",
  verde: "#22c55e",
  giallo: "#eab308",
  rosso: "#ef4444",
  blu: "#3b82f6",
  viola: "#a855f7",
};

const normalizeExerciseText = (value: string) =>
  value.replace(/[\u00e0\u00c0]/g, COMBO_SYMBOL);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderColoredHtml = (value: string) =>
  value
    .split(/(\n|\s+)/)
    .map((part) => {
      if (part === "\n") return "<br>";

      const key = part.toLowerCase().replace(/[^\u0061-\u007a\u00e0\u00e8\u00e9\u00ec\u00f2\u00f9]/gi, "");
      const color = COLOR_MAP[key];
      const escaped = escapeHtml(part);

      return color ? `<span style="color:${color}">${escaped}</span>` : escaped;
    })
    .join("");

const getPlainText = (root: HTMLElement) =>
  root.innerText.replace(/\u00a0/g, " ").replace(/\n$/, "");

const getCaretOffset = (root: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return getPlainText(root).length;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return getPlainText(root).length;

  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
};

const setCaretOffset = (root: HTMLElement, offset: number) => {
  const selection = window.getSelection();
  if (!selection) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = 0;
  let node = walker.nextNode();

  while (node) {
    const textLength = node.textContent?.length || 0;
    if (current + textLength >= offset) {
      const range = document.createRange();
      range.setStart(node, Math.max(0, offset - current));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    current += textLength;
    node = walker.nextNode();
  }

  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

interface ExerciseNameInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const ExerciseNameInput = ({
  value,
  onChange,
  placeholder = `Es. Elastico arancione - ${COMBO_SYMBOL} Squat + Push-up...`,
  className,
}: ExerciseNameInputProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const caretOffsetRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const wasFocused = document.activeElement === editor;
    const caretOffset = wasFocused ? caretOffsetRef.current ?? getCaretOffset(editor) : null;
    const html = renderColoredHtml(value);

    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }

    if (wasFocused && caretOffset !== null) {
      setCaretOffset(editor, Math.min(caretOffset, value.length));
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const caretOffset = getCaretOffset(editor);
    const nextValue = normalizeExerciseText(getPlainText(editor));
    caretOffsetRef.current = Math.min(caretOffset, nextValue.length);
    onChange(nextValue);
  }, [onChange]);

  return (
    <div className={cn("relative flex-1", className)}>
      {!value && (
        <div className="pointer-events-none absolute left-3 top-2 z-10 text-sm leading-5 text-muted-foreground">
          {placeholder}
        </div>
      )}
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        className={cn(
          "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-5 text-foreground",
          "whitespace-pre-wrap break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        style={{
          overflowWrap: "break-word",
          wordBreak: "break-word",
        }}
      />
    </div>
  );
};

export default ExerciseNameInput;
