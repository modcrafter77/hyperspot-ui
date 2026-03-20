import { useState, Suspense } from "react";
import { Dialog } from "@/shared/ui/Dialog";
import { useModels } from "@/entities/model";
import { useCreateChat } from "@/entities/chat";
import { useAppStore } from "@/app/store";
import { cn } from "@/shared/lib/cn";
import { Bot, Check, Loader2, Sparkles, Zap } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewChatDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="New Chat">
      <Suspense fallback={<ModelsSkeleton />}>
        <NewChatForm onClose={onClose} />
      </Suspense>
    </Dialog>
  );
}

function NewChatForm({ onClose }: { onClose: () => void }) {
  const { data: modelList } = useModels();
  const createChat = useCreateChat();
  const selectChat = useAppStore((s) => s.selectChat);

  const models = modelList.items;
  const [selectedModel, setSelectedModel] = useState(
    () => models.find((m) => m.tier === "premium")?.model_id ?? models[0]?.model_id ?? "",
  );
  const [title, setTitle] = useState("");

  const handleCreate = () => {
    createChat.mutate(
      {
        model: selectedModel || undefined,
        title: title.trim() || undefined,
      },
      {
        onSuccess: (chat) => {
          selectChat(chat.id);
          onClose();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Optional title */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q3 Revenue Analysis"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
      </div>

      {/* Model picker */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Model
        </label>
        <div className="space-y-1.5">
          {models.map((model) => (
            <button
              key={model.model_id}
              onClick={() => setSelectedModel(model.model_id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                selectedModel === model.model_id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30 hover:bg-secondary/50",
              )}
            >
              <Bot className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    {model.display_name}
                  </span>
                  <TierBadge tier={model.tier} />
                  <span className="text-[11px] text-muted-foreground">
                    {model.multiplier_display}
                  </span>
                </div>
                {model.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {model.description}
                  </p>
                )}
              </div>
              {selectedModel === model.model_id && (
                <Check className="h-4 w-4 flex-shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={createChat.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {createChat.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          Create
        </button>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  if (tier === "premium") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
        <Sparkles className="h-2.5 w-2.5" />
        Premium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Zap className="h-2.5 w-2.5" />
      Standard
    </span>
  );
}

function ModelsSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
