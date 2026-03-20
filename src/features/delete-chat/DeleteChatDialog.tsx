import { Dialog } from "@/shared/ui/Dialog";
import { useDeleteChat } from "@/entities/chat";
import { useAppStore } from "@/app/store";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string | null;
};

export function DeleteChatDialog({
  open,
  onClose,
  chatId,
  chatTitle,
}: Props) {
  const deleteMut = useDeleteChat();
  const selectedChatId = useAppStore((s) => s.selectedChatId);
  const selectChat = useAppStore((s) => s.selectChat);

  const handleDelete = () => {
    deleteMut.mutate(chatId, {
      onSuccess: () => {
        if (selectedChatId === chatId) selectChat(null);
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Delete Chat">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">
            {chatTitle || "Untitled chat"}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-4 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {deleteMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
          </button>
        </div>
      </div>
    </Dialog>
  );
}
