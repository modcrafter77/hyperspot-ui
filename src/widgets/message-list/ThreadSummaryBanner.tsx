import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { ThreadSummaryInfo } from "@/features/stream-response/sse-types";

type Props = { summary: ThreadSummaryInfo };

export function ThreadSummaryBanner({ summary }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2">
      {/* Divider line with label */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Layers className="h-3 w-3" />
          Earlier messages summarized
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {summary.messages_compressed != null && (
            <span>
              {summary.messages_compressed} message{summary.messages_compressed !== 1 ? "s" : ""} compressed
            </span>
          )}
          <span>~{summary.token_estimate} tokens</span>
          {summary.summary_updated_at && (
            <span>
              updated{" "}
              {new Date(summary.summary_updated_at).toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
