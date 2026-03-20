import { Suspense } from "react";
import { useAppStore } from "@/app/store";
import { Sidebar } from "@/widgets/sidebar-chats/Sidebar";
import { ChatView } from "@/widgets/message-list/ChatView";
import { Composer } from "@/widgets/composer/Composer";
import { OfflineBanner } from "@/widgets/offline-banner/OfflineBanner";
import { NewChatPane } from "@/widgets/new-chat/NewChatPane";
import { useChatDetailSafe } from "@/entities/chat";
import { useIsQuotaExhausted } from "@/entities/quota";
import { useSendMessage } from "@/features/send-message/useSendMessage";
import { cn } from "@/shared/lib/cn";
import { PanelLeftClose, PanelLeft } from "lucide-react";

export function AppShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const selectedChatId = useAppStore((s) => s.selectedChatId);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
          sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden",
        )}
      >
        <Sidebar />
      </aside>

      {/* Main area */}
      <main className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {/* Top bar */}
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
              <ChatHeaderLazy chatId={selectedChatId} />
            </Suspense>
          )}
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
    </div>
  );
}

function ChatPane({ chatId }: { chatId: string }) {
  const { data: chat, isLoading } = useChatDetailSafe(chatId);
  const { send, cancel } = useSendMessage(chatId);
  const quotaExhausted = useIsQuotaExhausted();

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
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div
            className="h-4 animate-pulse rounded bg-muted"
            style={{ width: `${40 + Math.random() * 40}%` }}
          />
          <div
            className="h-4 animate-pulse rounded bg-muted"
            style={{ width: `${30 + Math.random() * 30}%` }}
          />
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

import { ChatHeader } from "@/widgets/chat-header/ChatHeader";
const ChatHeaderLazy = ChatHeader;
