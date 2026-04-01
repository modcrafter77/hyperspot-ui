import { Suspense, useCallback, useRef } from "react";
import { useAppStore } from "@/app/store";
import { Sidebar } from "@/widgets/sidebar-chats/Sidebar";
import { ChatView } from "@/widgets/message-list/ChatView";
import { Composer } from "@/widgets/composer/Composer";
import { OfflineBanner } from "@/widgets/offline-banner/OfflineBanner";
import { NewChatPane } from "@/widgets/new-chat/NewChatPane";
import { CommandPalette } from "@/widgets/command-palette/CommandPalette";
import { ChatHeader } from "@/widgets/chat-header/ChatHeader";
import { useChatDetailSafe } from "@/entities/chat";
import { useIsQuotaExhausted } from "@/entities/quota";
import { useSendMessage } from "@/features/send-message/useSendMessage";
import { useWindowTitle } from "@/shared/hooks/useWindowTitle";
import { useGlobalShortcuts } from "@/shared/hooks/useGlobalShortcuts";
import { cn } from "@/shared/lib/cn";
import { PanelLeftClose, PanelLeft, Search as SearchIcon } from "lucide-react";

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;

// Stable skeleton widths — Math.random() in render causes layout shift.
const SKELETON_WIDTHS: [string, string][] = [
  ["75%", "50%"],
  ["55%", "40%"],
  ["65%", "55%"],
  ["45%", "35%"],
];

// Platform-aware keyboard shortcut label for the search button.
const SEARCH_KBD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? "\u2318K"
    : "Ctrl+K";

export function AppShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const selectedChatId = useAppStore((s) => s.selectedChatId);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  useGlobalShortcuts();

  const dragging = useRef(false);

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMove = (ev: PointerEvent) => {
        const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth + ev.clientX - startX));
        setSidebarWidth(w);
      };
      const onUp = () => {
        dragging.current = false;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
      };
      document.body.style.cursor = "col-resize";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [sidebarWidth, setSidebarWidth],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex-shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
          sidebarOpen ? "" : "w-0 overflow-hidden",
        )}
        style={sidebarOpen ? { width: sidebarWidth } : undefined}
      >
        <Sidebar />
        {/* Resize handle */}
        {sidebarOpen && (
          <div
            onPointerDown={onResizeStart}
            className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/40"
          />
        )}
      </aside>

      {/* Main area */}
      <main className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {/* Titlebar / header */}
        <header className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border px-3">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>

          {selectedChatId && (
            <Suspense fallback={<ChatHeaderSkeleton />}>
              <ChatHeader chatId={selectedChatId} />
            </Suspense>
          )}

          {/* Drag region fills remaining header space for Tauri window dragging */}
          <div className="flex-1" data-tauri-drag-region="" />

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Search chats (Ctrl+K)"
            title="Search chats (Ctrl+K)"
          >
            <SearchIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded bg-muted px-1 py-0.5 text-[10px] font-medium sm:inline-block">
              {SEARCH_KBD}
            </kbd>
          </button>
        </header>

        {/* Content + Composer */}
        {selectedChatId ? (
          <Suspense fallback={<MessagesSkeleton />}>
            <ChatPane chatId={selectedChatId} />
          </Suspense>
        ) : (
          <Suspense fallback={<NewChatSkeleton />}>
            <NewChatPane />
          </Suspense>
        )}
      </main>

      <CommandPalette />
    </div>
  );
}

function ChatPane({ chatId }: { chatId: string }) {
  const { data: chat, isLoading } = useChatDetailSafe(chatId);
  const { send, cancel } = useSendMessage(chatId);
  const quotaExhausted = useIsQuotaExhausted();

  useWindowTitle(chat?.title);

  if (isLoading && !chat) {
    return <MessagesSkeleton />;
  }

  return (
    <>
      <div className="flex-1 overflow-hidden">
        <ChatView chatId={chatId} />
      </div>
      <Composer
        chatId={chatId}
        chatModel={chat?.model ?? ""}
        disabled={quotaExhausted}
        quotaExhausted={quotaExhausted}
        onSend={send}
        onCancel={cancel}
      />
    </>
  );
}

function ChatHeaderSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      {SKELETON_WIDTHS.map(([w1, w2], i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-4 animate-pulse rounded bg-muted" style={{ width: w1 }} />
          <div className="h-4 animate-pulse rounded bg-muted" style={{ width: w2 }} />
        </div>
      ))}
    </div>
  );
}

function NewChatSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-2xl px-4">
        <div className="mb-8 flex justify-center">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
