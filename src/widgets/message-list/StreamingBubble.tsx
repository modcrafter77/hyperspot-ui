import { useStreamStore, type ActiveTurn } from "@/features/stream-response/stream-store";
import { cn } from "@/shared/lib/cn";
import {
  Bot,
  Loader2,
  FileSearch,
  Globe,
  AlertCircle,
  ArrowDownRight,
  WifiOff,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type Props = { chatId: string };

export function StreamingBubble({ chatId }: Props) {
  const turn = useStreamStore((s) => s.activeTurn);

  if (!turn || turn.chatId !== chatId) return null;
  if (turn.phase === "idle") return null;

  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 max-w-[85%] space-y-2">
        <ToolIndicators turn={turn} />
        <ContentBlock turn={turn} />
        <StatusLine turn={turn} />
      </div>
    </div>
  );
}

function ToolIndicators({ turn }: { turn: ActiveTurn }) {
  if (turn.tools.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {turn.tools.map((tool, i) => {
        const Icon = tool.name === "web_search" ? Globe : FileSearch;
        const isDone = tool.phase === "done";
        return (
          <span
            key={`${tool.name}-${i}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]",
              isDone
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {isDone ? (
              <Icon className="h-3 w-3" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {tool.name === "file_search" ? "Searching files" : "Searching web"}
            {isDone && tool.details?.files_searched != null && (
              <span className="text-muted-foreground">
                ({tool.details.files_searched} files)
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function ContentBlock({ turn }: { turn: ActiveTurn }) {
  if (turn.phase === "opening") {
    return (
      <div className="rounded-lg bg-card px-3.5 py-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (turn.phase === "error" && turn.errorData) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              {turn.errorData.code || "Error"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {turn.errorData.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (turn.phase === "recovering") {
    return (
      <div className="rounded-lg bg-card px-3.5 py-2.5">
        {turn.partialText && (
          <div className="prose prose-invert prose-sm max-w-none">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {turn.partialText}
            </Markdown>
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
          <WifiOff className="h-3.5 w-3.5" />
          Reconnecting...
        </div>
      </div>
    );
  }

  if (!turn.partialText && turn.phase === "streaming") {
    return (
      <div className="rounded-lg bg-card px-3.5 py-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card px-3.5 py-2.5 text-sm leading-relaxed text-card-foreground">
      <div className="prose prose-invert prose-sm max-w-none">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {turn.partialText}
        </Markdown>
      </div>
      {turn.phase === "streaming" && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground" />
      )}
    </div>
  );
}

function StatusLine({ turn }: { turn: ActiveTurn }) {
  if (turn.phase === "done" && turn.doneData) {
    const d = turn.doneData;
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {d.usage && (
          <span>
            {d.usage.input_tokens}→{d.usage.output_tokens} tokens
          </span>
        )}
        <span>{d.effective_model}</span>
        {d.quota_decision === "downgrade" && (
          <span className="inline-flex items-center gap-0.5 text-warning">
            <ArrowDownRight className="h-3 w-3" />
            Downgraded from {d.downgrade_from}
          </span>
        )}
      </div>
    );
  }

  if (turn.phase === "cancelled") {
    return (
      <span className="text-[11px] text-muted-foreground">
        Generation cancelled
      </span>
    );
  }

  return null;
}
