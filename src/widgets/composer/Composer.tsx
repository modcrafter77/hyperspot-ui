import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { SendHorizonal, Paperclip, Globe } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type Props = {
  chatModel: string;
  disabled?: boolean;
  onSend?: (message: string) => void;
};

export function Composer({ chatModel, disabled, onSend }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend?.(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, text, onSend]);

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
          {/* Attach button */}
          <button
            className="mb-0.5 flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Send a message..."
            disabled={disabled}
            rows={1}
            className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />

          {/* Right controls */}
          <div className="mb-0.5 flex flex-shrink-0 items-center gap-1">
            {/* Web search toggle */}
            <button
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Web search"
            >
              <Globe className="h-4 w-4" />
            </button>

            {/* Send button */}
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
          </div>
        </div>

        {/* Model indicator */}
        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground">
            {chatModel}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Enter to send, Shift+Enter for newline
          </span>
        </div>
      </div>
    </div>
  );
}
