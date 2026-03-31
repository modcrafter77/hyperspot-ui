import { useState, useCallback, useEffect } from "react";
import { useStreamStore, type ActiveTurn } from "@/features/stream-response/stream-store";
import { ThoughtToggle } from "./ThoughtToggle";
import { mapSseError, type ErrorUiInfo } from "@/shared/lib/error-messages";
import { cn } from "@/shared/lib/cn";
import {
  Bot,
  Loader2,
  FileSearch,
  Globe,
  AlertCircle,
  AlertTriangle,
  Info,
  WifiOff,
  RotateCcw,
  Timer,
  Copy,
  Check,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "@/shared/lib/markdown-components";

type Props = { chatId: string; onRetry?: (requestId: string) => void };

export function StreamingBubble({ chatId, onRetry }: Props) {
  const turn = useStreamStore((s) => s.activeTurn);

  if (!turn || turn.chatId !== chatId) return null;
  if (turn.phase === "idle") return null;

  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="group min-w-0 max-w-[85%] space-y-2">
        <ToolIndicators turn={turn} />
        <ThinkingBadge turn={turn} />
        <ContentBlock turn={turn} onRetry={onRetry} />
        {turn.phase === "cancelled" && (
          <span className="text-[11px] text-muted-foreground">
            Generation cancelled
          </span>
        )}
        {turn.partialText && (turn.phase === "done" || turn.phase === "cancelled") && (
          <CopyBtn text={turn.partialText} />
        )}
      </div>
    </div>
  );
}

function ToolIndicators({ turn }: { turn: ActiveTurn }) {
  if (turn.tools.length === 0) return null;

  const turnEnded =
    turn.phase === "cancelled" ||
    turn.phase === "done" ||
    turn.phase === "error";

  return (
    <div className="flex flex-wrap gap-1.5">
      {turn.tools.map((tool, i) => {
        const Icon = tool.name === "web_search" ? Globe : FileSearch;
        const stillRunning = tool.phase !== "done" && !turnEnded;
        return (
          <span
            key={`${tool.name}-${i}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]",
              stillRunning
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {stillRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon className="h-3 w-3" />
            )}
            {tool.name === "file_search" ? "Searching files" : "Searching web"}
            {tool.phase === "done" && tool.details?.files_searched != null && (
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

function ThinkingBadge({ turn }: { turn: ActiveTurn }) {
  const [elapsed, setElapsed] = useState(0);

  const isThinking =
    turn.reasoning !== "" &&
    turn.reasoningDurationMs === null &&
    turn.reasoningStartedAt !== null;

  useEffect(() => {
    if (!isThinking || turn.reasoningStartedAt === null) return;
    const startedAt = turn.reasoningStartedAt;
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [isThinking, turn.reasoningStartedAt]);

  if (!turn.reasoning) return null;

  if (isThinking) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <span className="font-mono">
          Thinking{elapsed > 0 ? ` ${elapsed}s` : ""}...
        </span>
      </div>
    );
  }

  const durationMs =
    turn.reasoningDurationMs ??
    (turn.reasoningStartedAt ? Date.now() - turn.reasoningStartedAt : 0);

  return <ThoughtToggle reasoning={turn.reasoning} durationMs={durationMs} />;
}

function ContentBlock({
  turn,
  onRetry,
}: {
  turn: ActiveTurn;
  onRetry?: (requestId: string) => void;
}) {
  if (turn.phase === "opening") {
    return (
      <div className="rounded-lg bg-card px-3.5 py-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (turn.phase === "error" && turn.errorData) {
    const info = mapSseError(turn.errorData);
    return <ErrorBlock info={info} requestId={turn.requestId} onRetry={onRetry} />;
  }

  if (turn.phase === "recovering") {
    return (
      <div className="rounded-lg bg-card px-3.5 py-2.5">
        {turn.partialText && (
          <div className="prose prose-invert prose-sm max-w-none">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents} skipHtml={false}>
              {turn.partialText}
            </Markdown>
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
          <WifiOff className="h-3.5 w-3.5" />
          Connection lost — attempting to recover...
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
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents} skipHtml={false}>
          {turn.partialText}
        </Markdown>
      </div>
      {turn.phase === "streaming" && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground" />
      )}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <div className="flex items-center text-[11px] text-muted-foreground">
      <button
        onClick={handleCopy}
        className={cn(
          "rounded p-1 transition-colors",
          copied
            ? "text-green-400"
            : "opacity-0 hover:bg-secondary hover:text-foreground group-hover:opacity-100",
        )}
        aria-label="Copy"
        title="Copy"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function ErrorBlock({
  info,
  requestId,
  onRetry,
}: {
  info: ErrorUiInfo;
  requestId: string;
  onRetry?: (requestId: string) => void;
}) {
  const SeverityIcon =
    info.severity === "warning"
      ? AlertTriangle
      : info.severity === "info"
        ? Info
        : info.category === "infrastructure"
          ? Timer
          : AlertCircle;

  const borderClass =
    info.severity === "warning"
      ? "border-warning/30 bg-warning/5"
      : "border-destructive/30 bg-destructive/5";

  const titleClass =
    info.severity === "warning" ? "text-warning" : "text-destructive";

  return (
    <div className={cn("rounded-lg border px-3.5 py-2.5", borderClass)}>
      <div className="flex items-start gap-2">
        <SeverityIcon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", titleClass)} />
        <div className="min-w-0 flex-1 text-sm">
          <p className={cn("font-medium", titleClass)}>{info.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{info.detail}</p>
          {info.retryable && onRetry && (
            <button
              onClick={() => onRetry(requestId)}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

