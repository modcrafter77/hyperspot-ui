import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { SendHorizonal, Paperclip, Globe, Square } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useStreamStore } from "@/features/stream-response/stream-store";

type Props = {
  chatModel: string;
  disabled?: boolean;
  onSend: (message: string, opts?: { webSearch?: boolean }) => void;
  onCancel: () => void;
};

export function Composer({ chatModel, disabled, onSend, onCancel }: Props) {
  const [text, setText] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const phase = useStreamStore((s) => s.activeTurn?.phase);
  const isStreaming = phase === "opening" || phase === "streaming";
  const canSend = text.trim().length > 0 && !disabled && !isStreaming;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim(), webSearch ? { webSearch: true } : undefined);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, text, webSearch, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
          <button
            className="mb-0.5 flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={isStreaming ? "Waiting for response..." : "Send a message..."}
            disabled={disabled || isStreaming}
            rows={1}
            className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />

          <div className="mb-0.5 flex flex-shrink-0 items-center gap-1">
            <button
              onClick={() => setWebSearch((v) => !v)}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                webSearch
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              aria-label="Web search"
              title={webSearch ? "Web search enabled" : "Enable web search"}
            >
              <Globe className="h-4 w-4" />
            </button>

            {isStreaming ? (
              <button
                onClick={onCancel}
                className="rounded-md bg-destructive/20 p-1.5 text-destructive hover:bg-destructive/30"
                aria-label="Stop generation"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  canSend
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground opacity-40",
                )}
                aria-label="Send message"
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground">
            {chatModel}
            {webSearch && (
              <span className="ml-1.5 text-primary">+ web search</span>
            )}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {isStreaming ? "Generating..." : "Enter to send, Shift+Enter for newline"}
          </span>
        </div>
      </div>
    </div>
  );
}
