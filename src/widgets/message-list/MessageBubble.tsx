import type { Message } from "@/entities/message";
import { cn } from "@/shared/lib/cn";
import { User, Bot, ThumbsUp, ThumbsDown, Paperclip } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type Props = { message: Message };

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "group flex gap-3 py-3",
        isUser && "flex-row-reverse",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {/* Content */}
      <div className={cn("min-w-0 max-w-[85%] space-y-2", isUser && "text-right")}>
        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5", isUser && "justify-end")}>
            {message.attachments.map((a) => (
              <span
                key={a.attachment_id}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{a.filename}</span>
              </span>
            ))}
          </div>
        )}

        {/* Message text */}
        <div
          className={cn(
            "rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground",
          )}
        >
          {isAssistant ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </Markdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Meta row */}
        <div
          className={cn(
            "flex items-center gap-2 text-[11px] text-muted-foreground",
            isUser && "justify-end",
          )}
        >
          {isAssistant && message.model && (
            <span>{message.model}</span>
          )}
          {isAssistant && message.input_tokens != null && (
            <span>
              {message.input_tokens}→{message.output_tokens} tokens
            </span>
          )}
          {isAssistant && <ReactionBadge reaction={message.my_reaction} />}
        </div>
      </div>
    </div>
  );
}

function ReactionBadge({ reaction }: { reaction: "like" | "dislike" | null }) {
  if (!reaction) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5",
        reaction === "like" ? "text-success" : "text-destructive",
      )}
    >
      {reaction === "like" ? (
        <ThumbsUp className="h-3 w-3" />
      ) : (
        <ThumbsDown className="h-3 w-3" />
      )}
    </span>
  );
}
