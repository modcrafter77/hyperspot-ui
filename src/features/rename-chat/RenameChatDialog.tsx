import { useState } from "react";
import { Dialog } from "@/shared/ui/Dialog";
import { useRenameChatTitle } from "@/entities/chat";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  chatId: string;
  currentTitle: string | null;
};

export function RenameChatDialog({
  open,
  onClose,
  chatId,
  currentTitle,
}: Props) {
  const [title, setTitle] = useState(currentTitle ?? "");
  const rename = useRenameChatTitle();

  const canSubmit = title.trim().length > 0 && title.trim() !== (currentTitle ?? "");

  const handleSubmit = () => {
    if (!canSubmit) return;
    rename.mutate(
      { id: chatId, title: title.trim() },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title="Rename Chat">
      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chat title"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || rename.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {rename.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
