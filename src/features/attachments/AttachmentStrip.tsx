import { useMemo } from "react";
import {
  useAttachmentStore,
  type LocalAttachment,
} from "./attachment-store";
import { cn } from "@/shared/lib/cn";
import {
  X,
  FileText,
  ImageIcon,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";

type Props = { chatId: string };

export function AttachmentStrip({ chatId }: Props) {
  const allItems = useAttachmentStore((s) => s.items);
  const remove = useAttachmentStore((s) => s.remove);
  const items = useMemo(
    () => Object.values(allItems).filter((a) => a.chatId === chatId),
    [allItems, chatId],
  );

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2">
      {items.map((item) => (
        <AttachmentChip key={item.id} item={item} onRemove={remove} />
      ))}
    </div>
  );
}

function AttachmentChip({
  item,
  onRemove,
}: {
  item: LocalAttachment;
  onRemove: (id: string) => void;
}) {
  const isImage = item.kind === "image";
  const thumbnail = item.serverData?.img_thumbnail;
  const hasThumbnail = isImage && thumbnail && item.status === "ready";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
        item.status === "failed"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : item.status === "deleting"
            ? "border-border/50 bg-muted/50 text-muted-foreground opacity-60"
            : "border-border bg-card text-card-foreground",
      )}
    >
      {/* Thumbnail or icon */}
      {hasThumbnail ? (
        <img
          src={`data:${thumbnail.content_type};base64,${thumbnail.data_base64}`}
          alt={item.filename}
          className="h-8 w-8 rounded object-cover"
          width={thumbnail.width}
          height={thumbnail.height}
        />
      ) : (
        <StatusIcon item={item} />
      )}

      {/* Filename */}
      <span className="max-w-[120px] truncate">{item.filename}</span>

      {/* Status text */}
      {item.status === "uploading" && (
        <span className="text-[10px] text-muted-foreground">uploading…</span>
      )}
      {item.status === "pending" && (
        <span className="text-[10px] text-muted-foreground">processing…</span>
      )}
      {item.status === "failed" && item.error && (
        <span className="max-w-[100px] truncate text-[10px]" title={item.error}>
          {item.error}
        </span>
      )}

      {/* Remove button */}
      {item.status !== "deleting" && (
        <button
          onClick={() => onRemove(item.id)}
          className="ml-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
          aria-label={`Remove ${item.filename}`}
        >
          {item.status === "failed" ? (
            <Trash2 className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
}

function StatusIcon({ item }: { item: LocalAttachment }) {
  if (item.status === "uploading" || item.status === "pending" || item.status === "deleting") {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  if (item.status === "failed") {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
  if (item.kind === "image") {
    return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}
