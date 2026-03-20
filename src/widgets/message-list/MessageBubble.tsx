import { useState } from "react";
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
  RotateCcw,
  Pencil,
  Trash2,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type AttachmentSummary = components["schemas"]["AttachmentSummary"];

type Props = {
  message: Message;
  isLastTurn?: boolean;
  onRetry?: (requestId: string) => void;
  onEdit?: (requestId: string, content: string) => void;
  onDelete?: (requestId: string) => void;
  onReaction?: (
    messageId: string,
    reaction: "like" | "dislike",
    current: "like" | "dislike" | null,
  ) => void;
};

export function MessageBubble({
  message,
  isLastTurn,
  onRetry,
  onEdit,
  onDelete,
  onReaction,
}: Props) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const canAct = isLastTurn && message.request_id;

  const submitEdit = () => {
    if (editText.trim() && message.request_id && onEdit) {
      onEdit(message.request_id, editText.trim());
      setEditing(false);
    }
  };

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

      <div
        className={cn(
          "min-w-0 max-w-[85%] space-y-2",
          isUser && "text-right",
        )}
      >
        {message.attachments.length > 0 && (
          <AttachmentRow
            attachments={message.attachments}
            alignRight={isUser}
          />
        )}

        {/* Message text or edit mode */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={submitEdit}
                disabled={!editText.trim()}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                Save & send
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditText(message.content);
                }}
                className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
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
        )}

        {/* Meta + action row */}
        <div
          className={cn(
            "flex items-center gap-1 text-[11px] text-muted-foreground",
            isUser && "justify-end",
          )}
        >
          {isAssistant && message.model && (
            <span className="mr-1">{message.model}</span>
          )}
          {isAssistant && message.input_tokens != null && (
            <span className="mr-1">
              {message.input_tokens}→{message.output_tokens} tokens
            </span>
          )}

          {/* Reaction buttons for assistant messages */}
          {isAssistant && onReaction && (
            <>
              <ActionBtn
                icon={ThumbsUp}
                active={message.my_reaction === "like"}
                activeClass="text-green-400"
                label="Like"
                onClick={() =>
                  onReaction(message.id, "like", message.my_reaction)
                }
              />
              <ActionBtn
                icon={ThumbsDown}
                active={message.my_reaction === "dislike"}
                activeClass="text-red-400"
                label="Dislike"
                onClick={() =>
                  onReaction(message.id, "dislike", message.my_reaction)
                }
              />
            </>
          )}

          {/* Turn actions — only on last turn */}
          {canAct && isAssistant && onRetry && (
            <ActionBtn
              icon={RotateCcw}
              label="Retry"
              onClick={() => onRetry(message.request_id!)}
            />
          )}
          {canAct && isUser && onEdit && !editing && (
            <ActionBtn
              icon={Pencil}
              label="Edit"
              onClick={() => setEditing(true)}
            />
          )}
          {canAct && isUser && onDelete && (
            <ActionBtn
              icon={Trash2}
              label="Delete turn"
              onClick={() => onDelete(message.request_id!)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  active,
  activeClass,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  activeClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded p-1 transition-colors",
        active
          ? activeClass
          : "text-muted-foreground opacity-0 hover:bg-secondary hover:text-foreground group-hover:opacity-100",
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3 w-3" />
    </button>
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
    <div
      className={cn(
        "space-y-1.5",
        alignRight && "flex flex-col items-end",
      )}
    >
      {images.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap gap-1.5",
            alignRight && "justify-end",
          )}
        >
          {images.map((img) => (
            <ImageChip key={img.attachment_id} attachment={img} />
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap gap-1.5",
            alignRight && "justify-end",
          )}
        >
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
