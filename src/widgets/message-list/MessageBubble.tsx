import type { Message } from "@/entities/message";
import type { components } from "@/shared/api";
import { cn } from "@/shared/lib/cn";
import {
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
  FileText,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type AttachmentSummary = components["schemas"]["AttachmentSummary"];
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
      <div
        className={cn(
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div className={cn("min-w-0 max-w-[85%] space-y-2", isUser && "text-right")}>
        {/* Attachments */}
        {message.attachments.length > 0 && (
          <AttachmentRow
            attachments={message.attachments}
            alignRight={isUser}
          />
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
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
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
          {isAssistant && message.model && <span>{message.model}</span>}
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

function AttachmentRow({
  attachments,
  alignRight,
}: {
  attachments: AttachmentSummary[];
  alignRight: boolean;
}) {
  const images = attachments.filter((a) => a.kind === "image");
  const docs = attachments.filter((a) => a.kind === "document");

  return (
    <div className={cn("space-y-1.5", alignRight && "flex flex-col items-end")}>
      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className={cn("flex flex-wrap gap-1.5", alignRight && "justify-end")}>
          {images.map((img) => (
            <ImageChip key={img.attachment_id} attachment={img} />
          ))}
        </div>
      )}

      {/* Document chips */}
      {docs.length > 0 && (
        <div className={cn("flex flex-wrap gap-1.5", alignRight && "justify-end")}>
          {docs.map((doc) => (
            <DocChip key={doc.attachment_id} attachment={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageChip({ attachment }: { attachment: AttachmentSummary }) {
  const thumb = attachment.img_thumbnail;

  if (thumb) {
    return (
      <div className="group/img relative overflow-hidden rounded-lg border border-border">
        <img
          src={`data:${thumb.content_type};base64,${thumb.data_base64}`}
          alt={attachment.filename}
          className="h-16 w-16 object-cover"
          width={thumb.width}
          height={thumb.height}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 pb-0.5 pt-3 opacity-0 transition-opacity group-hover/img:opacity-100">
          <span className="block truncate text-[9px] text-white">
            {attachment.filename}
          </span>
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
      {attachment.status === "failed" ? (
        <AlertCircle className="h-3 w-3 text-destructive" />
      ) : (
        <ImageIcon className="h-3 w-3" />
      )}
      <span className="max-w-[100px] truncate">{attachment.filename}</span>
    </span>
  );
}

function DocChip({ attachment }: { attachment: AttachmentSummary }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]",
        attachment.status === "failed"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {attachment.status === "failed" ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <FileText className="h-3 w-3" />
      )}
      <span className="max-w-[120px] truncate">{attachment.filename}</span>
    </span>
  );
}

function ReactionBadge({
  reaction,
}: {
  reaction: "like" | "dislike" | null;
}) {
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
