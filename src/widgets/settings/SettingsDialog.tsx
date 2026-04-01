import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/app/store";
import { applyServerUrl } from "@/shared/api";
import { Dialog } from "@/shared/ui/Dialog";
import { retryAfterSettings } from "@/shared/ui/ErrorBoundary";
import { toast } from "sonner";

export function SettingsDialog() {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const serverUrl = useAppStore((s) => s.serverUrl);
  const setServerUrl = useAppStore((s) => s.setServerUrl);
  const qc = useQueryClient();

  const [draft, setDraft] = useState(serverUrl);

  const handleOpen = useCallback(() => {
    setDraft(useAppStore.getState().serverUrl);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim().replace(/\/+$/, "");
    setServerUrl(trimmed);
    applyServerUrl(trimmed);
    qc.clear();
    setOpen(false);
    toast.success("Settings saved", {
      description: trimmed ? `Server: ${trimmed}` : "Using default server",
    });
    retryAfterSettings();
    requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        "main textarea",
      );
      textarea?.focus();
    });
  }, [draft, setServerUrl, setOpen, qc]);

  if (!open) return null;

  return (
    <SettingsDialogInner
      draft={draft}
      setDraft={setDraft}
      onClose={handleClose}
      onSave={handleSave}
      onOpen={handleOpen}
    />
  );
}

function SettingsDialogInner({
  draft,
  setDraft,
  onClose,
  onSave,
  onOpen,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  onOpen: () => void;
}) {
  // Sync draft with the current store value when the dialog mounts.
  // Previously used useState(() => onOpen()) which abuses the initializer
  // for side effects and fires twice in React 18 Strict Mode.
  useEffect(onOpen, [onOpen]);

  return (
    <Dialog open onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="server-url"
            className="text-sm font-medium text-foreground"
          >
            Server URL
          </label>
          <input
            id="server-url"
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
            }}
            placeholder="http://127.0.0.1:8087/cf/mini-chat"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Base URL of the Hyperspot API. Leave empty to use the default.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
