import { Suspense } from "react";
import { useAppStore } from "@/app/store";
import { Sidebar } from "@/widgets/sidebar-chats/Sidebar";
import { ChatView } from "@/widgets/message-list/ChatView";
import { Composer } from "@/widgets/composer/Composer";
import { useChatDetail } from "@/entities/chat";
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
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function ChatPane({ chatId }: { chatId: string }) {
  const { data: chat } = useChatDetail(chatId);
  const { send, cancel } = useSendMessage(chatId);

  return (
    <>
      <div className="flex-1 overflow-hidden">
        <ChatView chatId={chatId} />
      </div>
      <Composer
        chatModel={chat.model}
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

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium text-muted-foreground">
          Select a chat or create a new one
        </h2>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Use the sidebar to browse your conversations
        </p>
      </div>
    </div>
  );
}

import { ChatHeader } from "@/widgets/chat-header/ChatHeader";
const ChatHeaderLazy = ChatHeader;
