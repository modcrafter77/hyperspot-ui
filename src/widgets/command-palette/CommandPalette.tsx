import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useAppStore } from "@/app/store";
import { useChatsInfinite } from "@/entities/chat";
import { cn } from "@/shared/lib/cn";
import {
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const selectChat = useAppStore((s) => s.selectChat);
  const selectedChatId = useAppStore((s) => s.selectedChatId);

  const [search, setSearch] = useState("");

  const odataFilter = search
    ? `contains(title, '${search.replace(/'/g, "''")}')`
    : undefined;
  const { data } = useChatsInfinite(odataFilter);
  const chats = data?.pages.flatMap((p) => p.items) ?? [];

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, [setOpen]);

  const handleSelect = useCallback(
    (chatId: string) => {
      selectChat(chatId);
      close();
    },
    [selectChat, close],
  );

  const handleNewChat = useCallback(() => {
    selectChat(null);
    close();
  }, [selectChat, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50" onClick={close} />
      <Command
        className="relative w-full max-w-lg rounded-lg border border-border bg-popover shadow-2xl"
        shouldFilter={false}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search chats or type a command..."
            className="h-11 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden flex-shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
            No chats found.
          </Command.Empty>

          <Command.Group heading="Actions" className="px-1 py-1.5 text-[11px] font-medium text-muted-foreground">
            <Command.Item
              value="__new_chat__"
              onSelect={handleNewChat}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-popover-foreground data-[selected=true]:bg-secondary"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              New chat
              <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {"\u2318"}N
              </kbd>
            </Command.Item>
          </Command.Group>

          {chats.length > 0 && (
            <Command.Group heading="Chats" className="px-1 py-1.5 text-[11px] font-medium text-muted-foreground">
              {chats.map((chat) => (
                <Command.Item
                  key={chat.id}
                  value={chat.id}
                  onSelect={() => handleSelect(chat.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-secondary",
                    selectedChatId === chat.id
                      ? "text-foreground"
                      : "text-popover-foreground",
                  )}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {chat.title || "Untitled chat"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {chat.model} &middot;{" "}
                      {formatDistanceToNow(new Date(chat.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {selectedChatId === chat.id && (
                    <span className="flex-shrink-0 text-[10px] text-primary">
                      current
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
