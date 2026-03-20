export const queryKeys = {
  chats: {
    all: ["chats"] as const,
    list: (filter?: string) => ["chats", "list", { filter }] as const,
    detail: (id: string) => ["chats", "detail", id] as const,
  },
  messages: {
    all: (chatId: string) => ["messages", chatId] as const,
    list: (chatId: string) => ["messages", chatId, "list"] as const,
  },
  models: {
    all: ["models"] as const,
    list: () => ["models", "list"] as const,
  },
  quota: {
    status: () => ["quota", "status"] as const,
  },
} as const;
