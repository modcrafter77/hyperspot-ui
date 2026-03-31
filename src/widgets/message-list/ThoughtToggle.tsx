import { useState } from "react";
import { cn } from "@/shared/lib/cn";

type Props = {
  reasoning: string;
  durationMs: number;
};

/**
 * Collapsed-by-default toggle that reveals model reasoning.
 * Used in both StreamingBubble (after thinking ends) and MessageBubble
 * (for persisted messages that have stored reasoning).
 */
export function ThoughtToggle({ reasoning, durationMs }: Props) {
  const [open, setOpen] = useState(false);
  const seconds = Math.round(durationMs / 1000);
  const label = seconds > 0 ? `Thought for ${seconds}s` : "Thought";

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
      >
        <span
          className="inline-block transition-transform duration-200 text-[9px]"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
        <span>{label}</span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-250",
          open ? "max-h-64 opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        <div className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Model reasoning
            </span>
            {seconds > 0 && (
              <span className="font-sans text-[10px] text-muted-foreground/50">
                {seconds}s
              </span>
            )}
          </div>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
            {reasoning}
          </pre>
        </div>
      </div>
    </div>
  );
}
