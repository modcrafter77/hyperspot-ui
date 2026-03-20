import { useChatDetail } from "@/entities/chat";
import { Bot } from "lucide-react";

type Props = { chatId: string };

export function ChatHeader({ chatId }: Props) {
  const { data: chat } = useChatDetail(chatId);

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <h1 className="truncate text-sm font-medium">
        {chat.title || "Untitled chat"}
      </h1>
      <ModelBadge model={chat.model} />
      {chat.message_count > 0 && (
        <span className="flex-shrink-0 text-xs text-muted-foreground">
          {chat.message_count} messages
        </span>
      )}
    </div>
  );
}

function ModelBadge({ model }: { model: string }) {
  return (
    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      <Bot className="h-3 w-3" />
      {model}
    </span>
  );
}
