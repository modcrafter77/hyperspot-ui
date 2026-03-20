import { Suspense, useCallback, useRef } from "react";
import { useAppStore } from "@/app/store";
import { useChatsInfinite } from "@/entities/chat";
import { Search, Plus, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { QuotaSummary } from "@/widgets/quota-panel/QuotaSummary";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { formatDistanceToNow } from "date-fns";

export function Sidebar() {
  return (
    <div className="flex h-full flex-col">
      <SidebarHeader />
      <Suspense fallback={<SidebarSkeleton />}>
        <ChatList />
      </Suspense>
      <div className="border-t border-sidebar-border p-3">
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <QuotaSummary />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function SidebarHeader() {
  const filter = useAppStore((s) => s.chatSearchFilter);
  const setFilter = useAppStore((s) => s.setChatSearchFilter);

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sidebar-foreground">
          Chats
        </span>
        <button
          className="rounded-md p-1.5 text-sidebar-foreground hover:bg-secondary hover:text-foreground"
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search chats..."
          className="w-full rounded-md border border-sidebar-border bg-transparent py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}

function ChatList() {
  const selectedChatId = useAppStore((s) => s.selectedChatId);
  const selectChat = useAppStore((s) => s.selectChat);
  const filter = useAppStore((s) => s.chatSearchFilter);

  const odataFilter = filter
    ? `contains(title, '${filter.replace(/'/g, "''")}')`
    : undefined;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useChatsInfinite(odataFilter);

  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  const chats = data?.pages.flatMap((p) => p.items) ?? [];

  if (chats.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-3">
        <p className="text-xs text-muted-foreground">
          {filter ? "No chats match your search" : "No chats yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-1.5">
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => selectChat(chat.id)}
          className={cn(
            "group flex w-full flex-col rounded-md px-2.5 py-2 text-left transition-colors",
            selectedChatId === chat.id
              ? "bg-secondary text-foreground"
              : "text-sidebar-foreground hover:bg-secondary/50",
          )}
        >
          <span className="truncate text-sm font-medium">
            {chat.title || "Untitled chat"}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{chat.model}</span>
            <span>·</span>
            <span className="flex-shrink-0">
              {formatDistanceToNow(new Date(chat.updated_at), {
                addSuffix: true,
              })}
            </span>
          </span>
        </button>
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex-1 space-y-1 px-1.5 py-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-md px-2.5 py-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
