import { useCallback, useRef, useEffect, Fragment, useMemo } from "react";
import { useMessagesInfinite } from "@/entities/message";
import { MessageBubble } from "./MessageBubble";
import { StreamingBubble } from "./StreamingBubble";
import { useStreamStore } from "@/features/stream-response/stream-store";
import { useTurnActions } from "@/features/turn-actions/useTurnActions";
import { useReaction } from "@/features/turn-actions/useReaction";
import { Loader2 } from "lucide-react";

type Props = { chatId: string };

export function ChatView({ chatId }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError, error } =
    useMessagesInfinite(chatId);

  const turn = useStreamStore((s) => s.activeTurn);
  const isActive = turn?.chatId === chatId && turn.phase !== "idle";

  const { handleRetry, handleEdit, handleDelete } = useTurnActions(chatId);
  const { toggleReaction } = useReaction(chatId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isActive, turn?.partialText]);

  const observer = useRef<IntersectionObserver | null>(null);
  const topSentinelRef = useCallback(
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

  const allMessages = data?.pages.flatMap((p) => p.items) ?? [];
  const streamingMsgId = isActive ? turn?.assistantMessageId : null;
  const messages = allMessages
    .filter((m) => m.id !== streamingMsgId)
    .reverse();

  // Find the request_id of the last turn (latest user+assistant pair)
  const lastTurnRequestId = useMemo(() => {
    if (allMessages.length === 0) return null;
    const newest = allMessages[0];
    return newest?.request_id ?? null;
  }, [allMessages]);

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">Failed to load messages</p>
          <p className="mt-1 text-xs text-muted-foreground">{error?.message}</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isActive) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto">
      <div ref={topSentinelRef} className="h-1 flex-shrink-0" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl space-y-1 px-4 py-4">
        {messages.map((msg) => (
          <Fragment key={msg.id}>
            <MessageBubble
              message={msg}
              isLastTurn={
                !isActive &&
                !!msg.request_id &&
                msg.request_id === lastTurnRequestId
              }
              onRetry={handleRetry}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReaction={toggleReaction}
            />
          </Fragment>
        ))}

        <StreamingBubble chatId={chatId} />
      </div>

      <div ref={bottomRef} className="h-4 flex-shrink-0" />
    </div>
  );
}
