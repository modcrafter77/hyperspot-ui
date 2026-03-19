# Hyperspot AI Chat — Frontend Implementation Plan

## 1. Frontend Stack

### Base

- **Tauri 2**
- **Vite**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**

### UI and Layout

- **shadcn/ui**: Button, Input, Textarea, Dialog, DropdownMenu, Tooltip, Sheet, ScrollArea, Tabs, Separator, Skeleton, Badge, Toast, Alert, Progress, ContextMenu
- **lucide-react** for icons
- **class-variance-authority** for variant-based styling
- **tailwind-merge** and `clsx`

### Data / State

- **@tanstack/react-query** (v5) for server state
- **zustand** for client/UI state
- **react-hook-form** only where forms exist (settings, rename chat, etc.)
- **zod** for runtime validation of DTOs, SSE events, and API errors

### Chat-specific

- **react-markdown**
- **remark-gfm**
- **rehype-highlight** or `react-syntax-highlighter`
- **@tanstack/react-virtual** for long histories
- **react-dropzone** for drag-and-drop upload
- **sonner** or shadcn toaster for notifications
- **cmdk** for search / quick-switch chat palette
- **date-fns** for time formatting
- **nanoid** or `crypto.randomUUID()` for client-generated `request_id` and local temporary IDs

### Tauri-side

- `@tauri-apps/api`
- `@tauri-apps/plugin-store` for local prefs
- `@tauri-apps/plugin-opener`
- `@tauri-apps/plugin-dialog`
- `@tauri-apps/plugin-fs` only if local export/import is needed
- `@tauri-apps/plugin-http` can be skipped if browser fetch inside webview is sufficient

---

## 2. API Surface Coverage

From the OpenAPI spec, the desktop client must support:

| Endpoint | Purpose |
|---|---|
| `GET /v1/chats` | Chat list with cursor pagination, OData `$filter` on `title`, `updated_at`, `id`. Returns `ChatDetail[]` (includes `message_count`). |
| `POST /v1/chats` | Create chat with optional model selection (locked for lifetime). |
| `GET /v1/chats/{id}` | Chat metadata + `message_count`. |
| `PATCH /v1/chats/{id}` | Update title only. |
| `DELETE /v1/chats/{id}` | Soft-delete chat. |
| `GET /v1/chats/{id}/messages` | Message history with cursor pagination, `$orderby` (`created_at asc\|desc`, `id asc\|desc`), `$filter` on `created_at`, `role`, `id`. Default: `created_at asc`. |
| `POST /v1/chats/{id}/messages:stream` | Send message, receive SSE stream. |
| `POST /v1/chats/{id}/attachments` | Upload document/image (multipart/form-data). |
| `GET /v1/chats/{id}/attachments/{attachment_id}` | Poll attachment status. |
| `DELETE /v1/chats/{id}/attachments/{attachment_id}` | Delete attachment (409 if locked by a submitted message). |
| `GET /v1/chats/{id}/turns/{request_id}` | Authoritative turn status for disconnect recovery. |
| `PATCH /v1/chats/{id}/turns/{request_id}` | Edit last user turn — returns SSE stream (same contract as send). Server generates new `request_id`. |
| `DELETE /v1/chats/{id}/turns/{request_id}` | Delete last turn. |
| `POST /v1/chats/{id}/turns/{request_id}/retry` | Retry last turn — returns SSE stream. No request body. Server generates new `request_id`. |
| `PUT /v1/chats/{id}/messages/{msg_id}/reaction` | Set like/dislike on assistant message. |
| `DELETE /v1/chats/{id}/messages/{msg_id}/reaction` | Remove reaction. |
| `GET /v1/models` | Model catalog visible to user. |
| `GET /v1/models/{model_id}` | Single model detail. |
| `GET /v1/quota/status` | Per-tier, per-period quota usage with warnings. |

**SSE event ordering**: `stream_started ping* (delta | tool)* citations? (done | error)`.

Exactly one terminal event (`done` or `error`) ends the stream.

After disconnect, `GET /v1/chats/{id}/turns/{request_id}` is the authoritative source of truth.

**There is no attachment list endpoint** — `GET /v1/chats/{id}/attachments` does not exist. The client must track uploaded-but-not-yet-sent attachment IDs in local state.

---

## 3. Architecture

### 3.1 Feature Modules

```text
src/
  app/
  shared/
  entities/
    chat/
    message/
    attachment/
    model/
    quota/
    turn/
  features/
    create-chat/
    rename-chat/
    delete-chat/
    send-message/
    stream-response/
    upload-attachment/
    delete-attachment/
    retry-turn/
    edit-turn/
    delete-turn/
    react-to-message/
    switch-model/
  widgets/
    app-shell/
    sidebar-chats/
    chat-header/
    message-list/
    composer/
    attachment-strip/
    quota-panel/
    model-picker/
    stream-status/
    citations-panel/
    downgrade-notice/
```

### 3.2 Layers

1. **API client layer** — fetchJson, streamClient, error parser
2. **Domain DTO + Zod parsers**
3. **React Query hooks** (v5 with `useSuspenseQuery` / `useSuspenseInfiniteQuery`)
4. **UI state store** (Zustand — only for client/UI state)
5. **Widgets / pages**
6. **Tauri integration layer**

---

## 4. Pages and Widgets

### 4.1 App Shell

Left panel:
- Chat list
- New Chat button
- Search / filter
- Quota summary
- Settings

Right area:
- Header of selected chat
- Message list
- Attachment strip
- Composer
- Optional right panel: citations / model / quota / turn details

### 4.2 Sidebar Chats

- Infinite or cursor pagination (bi-directional: `next_cursor` / `prev_cursor`)
- Local optimistic new chat
- Rename inline
- Delete with confirmation
- Current model badge (use `display_name` from Model)
- Last updated time
- Message count badge (available from `ChatDetail` in the list response)
- OData `$filter` for search: `contains(title, '...')`

### 4.3 Message List

Role-based rendering: user / assistant / system.

**Assistant messages:**
- Markdown rendering with code blocks
- Copy message
- Reaction buttons (like / dislike)
- Attachment summary pills (from `Message.attachments[]`)
- 2-phase tool status rendering (backend `ToolPhase` only has `Start` and `Done`, no `Progress`):
  - `start` — animated spinner + "Searching files..." / "Searching the web..."
  - `done` — checkmark + summary (e.g., "Searched 3 files" from `details.files_searched`)
- Inline citations block
- Model badge showing `effective_model` (from `SseDoneEvent.effective_model` or message `model` field), especially when it differs from the chat's locked model
- **Model downgrade banner**: when `quota_decision: "downgrade"`, show inline notice: "Response generated with [effective_model] instead of [selected_model] — [human-readable reason from `downgrade_reason`]"
  - `premium_quota_exhausted` → "Premium quota exhausted"
  - `force_standard_tier` → "Premium tier disabled by administrator"
  - `disable_premium_tier` → "Premium tier globally disabled"
  - `model_disabled` → "Selected model disabled"
- Token usage display (`input_tokens`, `output_tokens`) on assistant messages
- Retry / edit / delete controls **only on the latest terminal turn**

**User messages:**
- Plain text
- Attachment summary pills

### 4.4 Composer

- Autosize textarea
- Send button
- Stop / cancel visual state
- Model display for current chat (`display_name`)
- Attach files (drag-and-drop via react-dropzone + file picker)
- Paste image support
- **Web search toggle**: produces `{ web_search: { enabled: true } }` (object, not bare boolean). Toggle should be hidden or disabled if `web_search_disabled` kill switch is active (handle 400 `web_search_disabled` gracefully)
- **Image attachment limits awareness**: per-turn limit (default: 4 images), per-user daily limit (default: 50). Warn or block client-side before submitting
- `attachment_ids` in send payload. UI must make clear that retrieval covers **all** documents in the chat vector store, not just the selected attachments
- Disabled state when quota is exhausted
- Validation and disabled states

### 4.5 Attachment Strip / Attachment Manager

States: uploading → pending → uploaded → ready / failed / deleting / locked.

Note: the backend has an internal `uploaded` status between `pending` and `ready` (the file is uploaded to the provider but not yet indexed/processed). The API does not remap this — the client may receive `status: "uploaded"` during polling. Treat `uploaded` the same as `pending` in the UI (still processing).

**Document attachments**: file icon, filename, status, doc summary preview when ready (tooltip/popover), `summary_updated_at` for freshness.

**Image attachments**: thumbnail preview from `img_thumbnail.data_base64` (webp, WxH), image preview dialog.

**No list endpoint** — client must track uploaded-but-not-yet-sent attachment IDs in Zustand store. Consider persisting pending attachment IDs in Tauri store for crash recovery.

**Delete rules**: only possible if attachment is not referenced by a submitted message (server returns 409 `attachment_locked`). Show server reason on locked attachments.

### 4.6 Citations Panel

SSE `citations` event delivers `CitationItem[]` with `source: "file" | "web"`.

- **File citations**: `title` (original filename), `attachment_id`, `snippet`, optional `score`
- **Web citations**: `title` (page title), `url`, `snippet`, optional `score`
- `span` (start/end) reserved for inline position mapping

Render inline under assistant message and optionally in expanded side panel.

### 4.7 Quota Panel

From `GET /v1/quota/status`:

- Tiers: premium, total
- Periods: daily, monthly
- Per-period: `limit_credits_micro`, `used_credits_micro`, `remaining_credits_micro`, `remaining_percentage`, `next_reset`, `warning`, `exhausted`
- `warning_threshold_pct` for threshold display

Show: progress bars, warning badges, exhausted lock state for composer, next reset countdown.

**Post-turn quota warnings**: `SseDoneEvent.quota_warnings[]` provides per-tier per-period warnings after each turn. Show inline toast/banner after turn completion when `warning: true` or `exhausted: true`.

---

## 5. Data Model

### 5.1 Normalized Entities

#### Chat

```ts
type Chat = {
  id: string
  model: string
  title: string | null
  isTemporary: boolean
  createdAt: string
  updatedAt: string
  messageCount: number  // always present from ChatDetail (list + get)
}
```

#### Message

```ts
type Message = {
  id: string
  requestId: string
  role: "user" | "assistant" | "system"
  content: string
  model: string | null
  inputTokens: number | null
  outputTokens: number | null
  attachments: AttachmentSummary[]
  myReaction: "like" | "dislike" | null
  createdAt: string
}
```

#### AttachmentSummary (embedded in Message)

```ts
type AttachmentSummary = {
  attachmentId: string
  kind: "document" | "image"
  filename: string
  status: "pending" | "uploaded" | "ready" | "failed"
  imgThumbnail: ImgThumbnail | null
}
```

#### Attachment (full, from GET attachment)

```ts
type Attachment = {
  id: string
  status: "pending" | "uploaded" | "ready" | "failed"
  kind: "document" | "image"
  filename: string
  contentType: string
  sizeBytes: number
  docSummary: string | null
  imgThumbnail: ImgThumbnail | null
  errorCode: string | null
  summaryUpdatedAt: string | null
  createdAt: string
}
```

#### ImgThumbnail

```ts
type ImgThumbnail = {
  contentType: "image/webp"
  width: number
  height: number
  dataBase64: string
}
```

#### Model

```ts
type Model = {
  modelId: string
  displayName: string
  tier: "standard" | "premium"
  multiplierDisplay: string       // e.g. "1x", "2x"
  description?: string
  multimodalCapabilities: string[] // e.g. ["VISION_INPUT", "RAG"]
  contextWindow: number
}
```

#### StreamTurn

```ts
type StreamTurn = {
  requestId: string
  assistantMessageId?: string
  state: "idle" | "opening" | "streaming" | "done" | "error" | "cancelled" | "recovering"
  partialText: string
  tools: ToolEvent[]
  citations?: CitationItem[]
  finalUsage: { inputTokens: number; outputTokens: number } | null
  effectiveModel?: string
  selectedModel?: string
  quotaDecision?: "allow" | "downgrade"
  downgradeFrom?: string
  downgradeReason?: "premium_quota_exhausted" | "force_standard_tier" | "disable_premium_tier" | "model_disabled"
  quotaWarnings?: QuotaWarning[]
  finalError?: SseErrorData
  isReplay: boolean  // from stream_started.is_new_turn === false
}
```

Note: the OpenAPI spec documents `completion_signal` on `SseDoneEvent` but this field does **not exist** in the actual backend `DoneData` struct. Do not implement truncation-notice UX until the backend ships this field.

#### ToolEvent

```ts
type ToolEvent = {
  phase: "start" | "done"
  name: "file_search" | "web_search"
  details?: {
    filesSearched?: number
    [key: string]: unknown
  }
}
```

Note: the OpenAPI spec documents `"start" | "progress" | "done"` but the actual backend `ToolPhase` enum only has `Start` and `Done`. No `progress` events are emitted.

#### CitationItem

```ts
type CitationItem = {
  source: "file" | "web"
  title: string
  url?: string          // required when source = "web"
  attachmentId?: string // required when source = "file"
  snippet: string
  score?: number
  span?: { start: number; end: number }
}
```

#### QuotaWarning

```ts
type QuotaWarning = {
  tier: "premium" | "total"
  period: "daily" | "monthly"
  remainingPercentage: number
  warning: boolean
  exhausted: boolean
}
```

#### TurnStatus (from GET turn status)

```ts
type TurnStatus = {
  requestId: string
  state: "running" | "done" | "error" | "cancelled"
  errorCode: string | null
  assistantMessageId: string | null
  updatedAt: string
}
```

#### SseErrorData (SSE terminal error — NOT Problem Details)

The SSE `event: error` payload uses a **simpler format** than JSON error responses. The OpenAPI spec says it uses the full `ErrorResponse` envelope, but the actual backend `ErrorData` struct serializes as:

```ts
type SseErrorData = {
  code: string
  message: string
}
```

The SSE relay also emits a synthetic `stream_interrupted` error if the provider stream closes without a terminal event.

#### ErrorResponse (Problem Details — JSON errors only)

Used for pre-stream JSON 4xx/5xx responses and non-streaming endpoints. NOT used in SSE error events.

```ts
type ErrorResponse = {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  code: string
  traceId?: string | null
  errors?: ValidationViolation[] | null
}
```

---

## 6. API Client Strategy

### 6.1 Type Generation

Use `openapi-typescript` to generate **only types** from OpenAPI. Write HTTP client by hand.

### 6.2 REST Client

- `fetchJson<T>()` with typed return
- Bearer auth header injection
- Problem Details parsing (`ErrorResponse`)
- Status mapping: 401 / 403 / 404 / 409 / 413 / 415 / 422 / 429 / 500 / 502 / 504

### 6.3 Stream Client

Separate `streamChatTurn()` adapter, parameterized for three endpoints:
- `POST /v1/chats/{id}/messages:stream` (send)
- `PATCH /v1/chats/{id}/turns/{request_id}` (edit) — response is SSE, not JSON
- `POST /v1/chats/{id}/turns/{request_id}/retry` (retry) — response is SSE

All three share the same SSE event contract. The adapter must:
- POST/PATCH to the endpoint
- Detect pre-stream JSON errors (4xx/5xx) vs SSE 200
- Parse `text/event-stream`
- Emit typed events
- Append deltas
- Track tool phases
- Buffer citations
- Finalize on `done` or `error`
- Extract downgrade/quota info from `done` (no `completion_signal` in current backend)
- Detect replay via `stream_started.is_new_turn === false`
- Handle synthetic `stream_interrupted` error from SSE relay
- Abort via `AbortController`
- On network break, switch to recovery mode and query Turn Status API

---

## 7. Streaming Architecture

### 7.1 SSE Parser Contract

API guarantees (verified against backend `StreamPhase` state machine and `DoneData`/`ErrorData` structs):
- `stream_started` — first event, carries `request_id`, `message_id`, `is_new_turn`
- `ping` — keepalive, MUST ignore
- `delta` — incremental text, `{ type: "text", content: "..." }`
- `tool` — 2-phase (`start` / `done`), names: `file_search`, `web_search`. Details object: `{}` on start, `{ files_searched: N }` on done for file_search
- `citations` — at most once, after all deltas, before terminal event
- `done` — terminal success with `usage` (nullable), `effective_model`, `selected_model`, `quota_decision`, optional `downgrade_from`, `downgrade_reason`, `quota_warnings[]`
- `error` — terminal failure, simple `{ code, message }` format (NOT Problem Details)

If the provider stream closes without emitting a terminal event, the SSE relay emits a synthetic error: `{ code: "stream_interrupted", message: "Provider stream ended unexpectedly" }`.

HTTP 200 does NOT guarantee success. Success = received `done`.

**Replay detection**: when `stream_started.is_new_turn === false`, the stream replays an already-completed turn. UI should NOT show typing animation, NOT increment usage counters, NOT fire telemetry for "new generation".

### 7.2 Turn State Machine

```text
idle → opening → streaming → done
                           → error
                           → cancelled
                           → recovering → done / error / cancelled / still running
```

Transitions:
- `opening → streaming` on `stream_started`
- `streaming → done` on SSE `done`
- `streaming → error` on SSE `error`
- `streaming → cancelled` on user abort
- `streaming → recovering` on transport break
- `recovering → done/error/cancelled` from `GET /turns/{request_id}`
- `recovering → recovering` (poll again) if turn is still `running`

### 7.3 Disconnect Recovery

1. Save `chatId`, `requestId`
2. UI shows "Reconnecting..."
3. Query `GET /v1/chats/{id}/turns/{request_id}`
4. If `running`: poll again or offer manual refresh
5. If `done`: fetch assistant message via `$filter=id eq '{assistant_message_id}'`, reconcile final message
6. If `error`: show terminal state with appropriate copy (see error mapping below)
7. If `cancelled`: show cancelled state

### 7.4 Idempotency

`request_id` is a client-generated UUID used as idempotency key. API `required` array only mandates `content`, but **always generate `request_id` client-side** for:
- Dedupe accidental double submit
- Reconnect recovery binding
- Optimistic placeholder binding to future assistant message

If a completed turn exists for the same `(chat_id, request_id)`, the server replays the stored response without quota/billing side effects (`is_new_turn: false`).

---

## 8. Attachments

### 8.1 Flow

1. User drops/selects file
2. `POST /v1/chats/{id}/attachments` (multipart/form-data)
3. Server returns attachment with `status: pending`
4. **Track attachment ID in Zustand store** (no list endpoint exists)
5. Show in attachment strip
6. Poll `GET /v1/chats/{id}/attachments/{attachment_id}` until `ready` or `failed`
7. On send message, include `attachment_ids` array (max 20, unique)
8. After message sent, attachment summaries are embedded in `Message.attachments[]`

MIME type → kind: `image/png`, `image/jpeg`, `image/webp` → `image`; everything else → `document`. Documents indexed in chat vector store; images are NOT indexed.

**Crash recovery**: consider persisting pending (unsent) attachment IDs in Tauri plugin-store so they survive app restart.

### 8.2 UX Requirements

- Pending chip with status
- Retry upload for failed
- Delete attachment (with 409 `attachment_locked` handling for submitted attachments)
- Document: file icon, filename, status, `doc_summary` tooltip/popover, `summary_updated_at`
- Image: thumbnail preview from `img_thumbnail`, preview dialog
- Upload validation errors: `file_too_large` (413), `unsupported_file_type` (415), upload quota exceeded (429)

### 8.3 Polling Policy

- First 10 seconds: every 1.5s
- 10s to 60s: every 5s
- After 60s: manual refresh
- Stop on `ready` | `failed` (continue polling while `pending` or `uploaded`)

---

## 9. Chat History and Pagination

### Chats Sidebar

- Infinite scroll with cursor pagination (`next_cursor` / `prev_cursor`)
- OData `$filter` for search on `title`
- Prefetch next page

### Messages

- **Initial load**: `$orderby=created_at desc&limit=20` to fetch the latest window first, reverse on client before rendering
- Scroll-up loads older pages via `prev_cursor`
- Scroll-down (if not at bottom) via `next_cursor`
- Virtualize message list with anchor restore (`@tanstack/react-virtual`)

---

## 10. Message Actions

### 10.1 Retry

- Button only on the latest terminal turn
- Calls `POST /v1/chats/{id}/turns/{request_id}/retry` (no request body)
- Server reuses original user message content and attachment associations
- Response is SSE stream — reuse the same streaming adapter from send
- Server generates a new `request_id`; client picks it up from `stream_started` event
- Error cases: `not_latest_turn` (409), `generation_in_progress` (409), `invalid_turn_state` (400)

### 10.2 Edit

- Button only on the latest terminal turn
- UX: "Edit last prompt" → composer fills with old text → user submits
- Calls `PATCH /v1/chats/{id}/turns/{request_id}` with `{ content: "new text" }`
- **Response is SSE stream** (same contract as send), NOT a simple JSON response
- Server generates a new `request_id` for the new turn; the old `request_id` becomes replay-only
- Original `attachment_ids` are preserved automatically by the server (copied via `message_attachments`)
- Previous turn visually marked as replaced
- Reuse the streaming adapter from Phase 3

### 10.3 Delete Turn

- Button only on the latest terminal turn
- Calls `DELETE /v1/chats/{id}/turns/{request_id}`
- After delete: invalidate messages query cache, update chat metadata, optimistically remove tail messages
- Error cases: `not_latest_turn` (409), `generation_in_progress` (409), `invalid_turn_state` (400)

### 10.4 Reactions

- Like / dislike only on assistant messages
- `PUT .../reaction` with `{ reaction: "like" | "dislike" }`
- `DELETE .../reaction` to remove
- Instant optimistic update
- Both endpoints are idempotent

---

## 11. Model Handling

Model is selected at chat creation and **locked for chat lifetime**. No runtime model switcher for existing chats.

### Model Picker UX (New Chat Dialog)

Render from `GET /v1/models`:
- `display_name` as primary label (NOT `model_id`)
- `tier` badge: "Premium" / "Standard"
- `multiplier_display` as cost indicator (e.g., "2x")
- `multimodal_capabilities` as feature icons (VISION_INPUT, RAG)
- `context_window` as info tooltip
- `description` as help text

### In Existing Chat

- Model badge in chat header showing `display_name`
- No "change model" control — model is immutable
- Assistant messages show `effective_model` from usage data (may differ from chat model due to downgrade)

---

## 12. Auth and Desktop Shell

### 12.1 Token Storage

- Access token in memory
- Refresh/session handling via backend or host auth flow
- Long-lived secrets never in localStorage

### 12.2 Tauri Responsibilities

- Window shell
- Deep links / auth callback
- Secure local preferences (plugin-store)
- Optional native file save/export
- Native notifications
- Auto-update (later)

Chat UI and networking live in the React layer.

---

## 13. Error UX

### Error Categories

The API uses Problem Details (`ErrorResponse`) with `title` carrying the application error token.

| Error Code / Title | HTTP | Context | UX Copy |
|---|---|---|---|
| `quota_exceeded` | 429 | Pre-stream | "Quota exceeded. Resets [next_reset]." Block composer. |
| `rate_limited` | 429 or SSE error | Pre- or mid-stream | "Too many requests. Please wait." |
| `provider_error` | 502 or SSE error | Pre- or mid-stream | "AI service error. Please retry." |
| `provider_timeout` | 504 or SSE error | Pre- or mid-stream | "AI service timed out. Please retry." |
| `orphan_timeout` | — | Turn Status recovery | "Request timed out. Please try again." **NOT** "Provider error." This is a system timeout (pod crash, network partition), not a provider issue. Track separately in analytics. |
| `context_budget_exceeded` | 422 | Pre-stream | "Conversation too long. Delete older messages or start a new chat." |
| `image_bytes_exceeded` | 413 | Pre-stream (messages:stream) | "Images in this message exceed the size limit." |
| `file_too_large` | 413 | Attachment upload | "File too large." |
| `unsupported_file_type` | 415 | Attachment upload | "File type not supported." |
| `unsupported_media` | 415 | Pre-stream | "Model does not support images." |
| `web_search_disabled` | 400 | Pre-stream | "Web search is currently disabled." Hide/disable toggle. |
| `generation_in_progress` | 409 | Send/edit/retry/delete | "A response is already being generated." |
| `request_id_conflict` | 409 | Send | "Duplicate request. Please try again." |
| `not_latest_turn` | 409 | Edit/retry/delete | "Can only modify the latest message." |
| `invalid_turn_state` | 400 | Edit/retry/delete | "Cannot modify this message in its current state." |
| `attachment_locked` | 409 | Delete attachment | "Cannot delete — attachment is used in a message." |
| `invalid_reaction_target` | 400 | Set reaction | "Reactions only available on assistant messages." |
| `feature_not_licensed` | 403 | Any | "AI Chat is not available for your organization." |
| `insufficient_permissions` | 403 | Any | "You don't have permission for this action." |
| `quota_overshoot_exceeded` | — | Turn Status | "Usage exceeded limits. Contact support." |

### Pre-stream vs Mid-stream Error Distinction

- **Pre-stream**: JSON 4xx/5xx with full Problem Details (`ErrorResponse`). No SSE stream opened. Display in toast or inline error.
- **Mid-stream**: HTTP 200, terminal SSE `event: error` with simple `{ code, message }` format (NOT Problem Details). Display in message bubble as error state. Also handle synthetic `stream_interrupted` from the SSE relay when provider stream closes unexpectedly.
- **Post-disconnect**: Turn Status API. Map `error_code` to appropriate UX.

These three paths use **different error formats** and must be handled distinctly in parsing, telemetry, and UX.

### Additional Error Codes from Backend

From the actual backend `stream_service.rs` and `billing_outcome.rs`, additional error codes not in the OpenAPI spec:

| Error Code | Context | UX Copy |
|---|---|---|
| `stream_interrupted` | SSE relay synthetic | "Response was interrupted. Please retry." |
| `web_search_calls_exceeded` | Mid-stream | "Web search limit reached for this message." |
| `document_limit_exceeded` | Attachment upload | "Maximum number of documents per chat reached." |
| `storage_limit_exceeded` | Attachment upload | "Storage limit exceeded for this chat." |
| `vector_store_timeout` | Attachment processing | "File processing timed out. Please retry." |
| `upload_failed` | Attachment processing | "File upload failed. Please retry." |
| `index_failed` | Attachment processing | "File indexing failed. Please retry." |

---

## 14. Phased Implementation Plan

### Phase 0 — Foundation, Toolchain, App Skeleton

**Goal**: Working desktop shell and baseline frontend platform.

**Scope**:
- Initialize Tauri 2 + Vite + React + TypeScript
- Tailwind CSS + shadcn/ui + lucide-react
- TanStack Query v5
- Zustand for UI state
- Strict TypeScript, ESLint, formatting, path aliases
- Generate only types from OpenAPI via `openapi-typescript`
- Base `apiClient` for JSON endpoints
- Skeleton `streamClient` interface (parameterized for send/edit/retry)
- Global ErrorBoundary, toast system, theme, app layout
- Tauri capabilities: minimum necessary for window

**Deliverables**:
- App builds and runs as desktop app
- Base shell: sidebar, header, main area, right panel placeholder
- OpenAPI types, base HTTP client, error parser, environment config

**Acceptance criteria**:
- Build passes locally and in CI
- Shell works on Windows/macOS/Linux target profiles
- All runtime configs separated from UI code
- No business logic in components yet

---

### Phase 1 — Read-only Data Flow: Chats, Messages, Models, Quota

**Goal**: Client that correctly reads and displays data without mutations.

**Scope**:
- Query layer on TanStack Query v5 with `useSuspenseQuery` / `useSuspenseInfiniteQuery`
- Implement reads:
  - `GET /v1/chats` (returns `ChatDetail[]` with `message_count`)
  - `GET /v1/chats/{id}`
  - `GET /v1/chats/{id}/messages` (with `$orderby=created_at desc` for initial load)
  - `GET /v1/models`
  - `GET /v1/quota/status`
- Render:
  - Sidebar chat list with `message_count` badge
  - Main message list with markdown and code blocks
  - Chat header with model `display_name`
  - Model info (tier badge, multiplier, capabilities)
  - Quota summary card
- Skeleton / empty / error states
- Cursor pagination for sidebar (bi-directional) and message history

**Deliverables**:
- Open chat list, select chat, see message history
- See model info and quota summary
- All on top of Query cache

**Acceptance criteria**:
- Sidebar and message history support pagination
- Errors 401/403/404/500 mapped to clear UI
- Message list renders markdown and code blocks read-only
- Query keys normalized for invalidation strategy

---

### Phase 2 — Chat Lifecycle: Create, Rename, Delete

**Goal**: Full chat CRUD.

**Scope**:
- Mutations via `useMutation`:
  - `POST /v1/chats` (with model selection from `/v1/models`)
  - `PATCH /v1/chats/{id}` (title only)
  - `DELETE /v1/chats/{id}`
- New chat dialog with model picker (full Model schema: `display_name`, `tier`, `multiplier_display`, `multimodal_capabilities`, `context_window`, `description`)
- Rename chat
- Delete chat with confirmation
- Optimistic updates where safe
- Keyboard shortcut for new chat

**Deliverables**:
- Create, rename, delete chats
- New chat auto-selected
- Model shown in header and sidebar

**Acceptance criteria**:
- Model selected only at creation, never changed after
- Rename handles trim/empty/max-length errors
- Delete cleans active selection and query cache

---

### Phase 3 — Streaming Core: Send, Live Output, Recovery

**Goal**: The heart of the product — streaming conversation.

**Scope**:
- Composer with autosize textarea
- Client-generated `request_id` (UUID) before sending
- `POST /v1/chats/{id}/messages:stream`
- **Custom protocol-aware stream adapter** (reusable for send/edit/retry):
  - Open stream
  - Parse SSE frames
  - Dispatch typed events
  - Transport abort via `AbortController`
  - Reconnect/recovery orchestration
- Turn state machine (idle → opening → streaming → done/error/cancelled/recovering)
- SSE event handling:
  - `stream_started`: extract `request_id`, `message_id`, detect replay via `is_new_turn`
  - `ping`: ignore
  - `delta`: append to `partialText`
  - `tool`: 2-phase rendering (start/done — no progress phase in backend)
  - `citations`: buffer CitationItem[]
  - `done`: extract `usage`, `effective_model`, `selected_model`, `quota_decision`, `downgrade_from`, `downgrade_reason`, `quota_warnings`
  - `error`: extract `{ code, message }` (simple format, not Problem Details)
- Model downgrade banner after `quota_decision: "downgrade"`
- Post-turn quota warnings from `done.quota_warnings[]`
- Authoritative recovery via Turn Status API after transport break
- Sync Query cache and message list after terminal event

**Deliverables**:
- Send message and see streamed assistant response
- Tool activity and citations displayed during stream
- Model downgrade notices shown when applicable
- Network break → recovery → correct final state

**Acceptance criteria**:
- Success only after `done`, not after HTTP 200
- `ping` ignored
- `tool` and `citations` don't break partial text rendering
- Mid-stream disconnect doesn't create duplicate assistant messages
- Recovery via Turn Status correctly reconciles final state
- `orphan_timeout` shows "Request timed out", not "Provider error"
- `is_new_turn: false` skips typing animation and usage counter increment
- Streaming adapter is parameterized, not hardcoded to send endpoint
- Downgrade banner renders correctly for all 4 `downgrade_reason` values
- `stream_interrupted` synthetic error handled gracefully

---

### Phase 4 — Attachments: Upload, Polling, Preview, Send Integration

**Goal**: Documents and images as first-class chat UX.

**Scope**:
- Drag-and-drop and file picker upload
- Upload queue
- `POST /v1/chats/{id}/attachments`
- Polling `GET /v1/chats/{id}/attachments/{attachment_id}`
- **Zustand store for pending attachment IDs** (no list endpoint)
- **Persist pending IDs to Tauri plugin-store** for crash recovery
- States: uploading → pending → uploaded → ready / failed / deleting / locked (treat `uploaded` same as `pending` in UI)
- Image: thumbnail preview, preview dialog
- Document: summary chip/tooltip, `summary_updated_at`
- `attachment_ids` in composer send flow (max 20, unique)
- Image count limits: per-turn (default 4), daily (default 50) — warn client-side
- `DELETE /v1/chats/{id}/attachments/{attachment_id}` with `attachment_locked` handling

**Deliverables**:
- Upload documents and images
- Attachment strip shows real processing status
- Composer sends turns with selected attachments
- Delete non-locked attachments

**Acceptance criteria**:
- Polling stops on `ready` | `failed` (continues through `pending` and `uploaded`)
- Failed uploads can be retried or deleted
- UI distinguishes image vs document
- User not misled about `attachment_ids` scoping retrieval
- Locked attachments show server reason
- Image count limits enforced or warned client-side

---

### Phase 5 — Turn Actions and Reactions

**Goal**: Complete chat lifecycle for daily use.

**Scope**:
- Retry last turn (reuses Phase 3 streaming adapter with retry endpoint)
- Edit last user turn (reuses Phase 3 streaming adapter with PATCH endpoint + SSE response)
- Delete last turn
- Like/dislike reactions on assistant messages
- Inline action menus on tail turn
- Optimistic update for reactions
- Handle server conflicts: `generation_in_progress`, `not_latest_turn`, `invalid_turn_state`
- After retry/edit: pick up new server-generated `request_id` from `stream_started`
- After retry/edit/delete: targeted invalidation and reconciliation

**Deliverables**:
- Retry / edit / delete last turn
- Like / dislike assistant messages
- UI stays consistent after all operations

**Acceptance criteria**:
- Edit/retry/delete visible only where allowed
- After retry, no duplicate assistant bubbles
- Reactions work without full history reload
- Edit correctly reuses streaming infra (SSE response, not JSON)
- New `request_id` from server is tracked for recovery

---

### Phase 6 — Error UX, Quota UX, Resilience

**Goal**: Predictable behavior on errors, not just a happy path.

**Scope**:
- Problem Details / API error mapping as first-class UI model (see Section 13 error table)
- Distinct handling for all error codes including `orphan_timeout` (system timeout, not provider error)
- `image_bytes_exceeded` (413) distinct from `file_too_large` (413)
- Quota panel: current usage, warnings, exhausted, next reset
- Disabled send/upload on exhausted quota
- Offline/reconnecting banners
- Retry affordances for recoverable failures
- Telemetry hooks for frontend error categories and stream outcome categories
  - Track `orphan_timeout` separately from `provider_error`
  - Track pre-stream vs mid-stream vs post-disconnect errors separately

**Deliverables**:
- User understands what happened and whether retry is possible
- Composer and upload UX respect quota and runtime limits

**Acceptance criteria**:
- No generic "Something went wrong" where backend provides specific problem type
- Quota exhaustion blocks send before attempting futile request
- Runtime stream errors rendered separately from pre-stream validation errors
- `orphan_timeout` → "Request timed out", tracked as infrastructure issue in analytics

---

### Phase 7 — Desktop Polish with Tauri 2 APIs

**Goal**: Turn website-in-a-box into a proper desktop app.

**Scope**:
- `@tauri-apps/api/window` for window management
- System tray integration via Tauri 2 capabilities
- `@tauri-apps/plugin-window-state` for persisting/restoring window size and position
- Native window controls
- Persist sidebar width, theme, last opened chat ID
- Window title sync with current chat
- Quick-switch chat (`cmdk`)
- Desktop keyboard shortcuts
- Optional: tray minimize, native notifications, menu integration
- Platform-aware titlebar/menu behavior

**Deliverables**:
- App feels like a desktop app
- Window state and prefs persist between launches
- Navigation and shortcuts suitable for daily use

**Acceptance criteria**:
- Window size/position restored correctly
- Quick-switch works without lag
- Shortcuts don't conflict with textarea editing
- Tray/menu/title behavior tested on at least two target platforms

---

### Phase 8 — Testing, Mocking, Hardening

**Goal**: Automated verification, not just "it works on my machine".

**Scope**:
- **Vitest 2+** as test runner (no Jest)
- **React Testing Library** for component tests
- Unit tests: SSE parser, turn state machine, error mapping
- Hook tests: query/mutation orchestration
- Component tests: composer, message list, attachment strip, quota panel
- MSW for REST mocking
- Custom SSE mock harness for stream protocol tests
- Scenarios:
  - Normal `done`
  - Pre-stream JSON 4xx/5xx
  - Terminal SSE `error`
  - Transport cut → recovery to done / error / cancelled / running
  - `orphan_timeout` recovery
  - Duplicate submit with same `request_id`
  - Attachment pending → uploaded → ready / failed
  - Quota exhausted
  - Model downgrade (all 4 reasons)
  - Synthetic `stream_interrupted` error
  - Replay detection (`is_new_turn: false`)
  - Long history virtualization
  - Image attachment count limits

**Acceptance criteria**:
- Stream parser and state machine covered for all terminal outcomes
- UI tests not coupled to real backend race conditions
- Reconnection/retry/edit/delete errors reproducible in tests
- No duplicate bubbles, no stale optimistic state, correct invalidation boundaries
- No memory leaks from abandoned streams / AbortController misuse
- No Jest dependency

---

### Phase 9 — Production Readiness and Rollout

**Goal**: Ready for real users, not just a demo.

**Scope**:
- Crash/error reporting for frontend
- Metrics/logging: stream start/success/failure, recovery invoked, attachment outcome, quota blocks, downgrade events
- Performance pass: long histories, many attachments, rapid chat switching, repeated reconnects
- Accessibility pass: keyboard navigation, focus management, contrast, screen reader basics
- Packaging, signing, update strategy
- Rollout checklist, support diagnostics panel

**Deliverables**:
- Desktop app ready for limited rollout
- Observability for main user flows
- Documented release checklist

**Acceptance criteria**:
- Stable on target desktop environments
- Main user journeys covered by telemetry and diagnostics
- Packaging/release reproducible in CI

---

## 15. Backend Implementation Notes (verified against Rust source)

These details were verified against the actual Rust server at `modules/mini-chat/mini-chat/src/`.

### SSE Wire Format

The `StreamPhase` state machine in `api/rest/sse.rs` enforces ordering:
`stream_started ping* (delta | tool)* citations? (done | error)`

Each `StreamEvent` maps to an Axum SSE `Event` via `into_sse_event()`. Event names are lowercase: `stream_started`, `ping`, `delta`, `tool`, `citations`, `done`, `error`.

### DoneData fields (actual, from `domain/stream_events.rs`)

```rust
pub struct DoneData {
    pub usage: Option<Usage>,           // { input_tokens, output_tokens }
    pub effective_model: String,
    pub selected_model: String,
    pub quota_decision: String,         // "allow" | "downgrade"
    pub downgrade_from: Option<String>,
    pub downgrade_reason: Option<String>,
    pub quota_warnings: Option<Vec<QuotaWarning>>,
    // NOTE: NO completion_signal field
}
```

### ErrorData fields (actual, from `domain/stream_events.rs`)

```rust
pub struct ErrorData {
    pub code: String,
    pub message: String,
    // NOTE: NOT Problem Details format
}
```

### ToolPhase (actual, from `domain/llm.rs`)

```rust
pub enum ToolPhase {
    Start,
    Done,
    // NOTE: NO Progress variant
}
```

### Attachment internal lifecycle (from `infra/db/entity/attachment.rs`)

`pending → uploaded → ready | failed` — the `uploaded` state is exposed via API (not remapped to `pending`).

### Turn states (from `infra/db/entity/chat_turn.rs`)

`Running → Completed | Failed | Cancelled` (all terminal, no further transitions). API maps: `Running` → `"running"`, `Completed` → `"done"`, `Failed` → `"error"`, `Cancelled` → `"cancelled"`.

### Stream orchestration (from `domain/service/stream_service.rs`)

- Uses `mpsc::channel` for event flow from provider task to SSE relay
- Web search calls are counted per-turn; exceeding `web_search_max_calls` causes the call to be suppressed
- Both `retry_turn` and `edit_turn` handlers use `start_mutation_stream()` which creates the same SSE pipeline as `stream_message`
- Replay of completed turns is handled in `stream_message` handler: on `StreamError::Replay`, the stored response is replayed as SSE with `is_new_turn: false`

### Auth model

- All routes require `bearerAuth` (JWT) and `ai_chat` license feature
- Per-action authz via `PolicyEnforcer::access_scope()` with resource/action pairs
- Ownership checks via `AccessScope::ensure_owner(subject_id)`

---

## 16. Code Generation Order (for LLM-assisted generation)


### Step A
- App shell, sidebar, main layout
- Typed API client skeleton (parameterized for REST + SSE)
- DTO types from OpenAPI

### Step B
- Chats queries/mutations
- Message list (read-only)
- Model picker (full schema)
- Quota panel

### Step C (separately, carefully)
- SSE parser with all event types
- Stream state machine with full done-event extraction
- send-message hook
- Assistant streaming bubble with downgrade banner

### Step D
- Attachment uploader + Zustand store for pending IDs
- Polling hook
- Attachment preview components
- Delete attachment

### Step E
- Turn actions (retry/edit/delete) — reuse streaming adapter
- Reactions
- Problem/error UX with full error mapping table

---

## 17. Key Architectural Decisions

1. **TanStack Query v5 is the server-state layer**, but NOT a replacement for the custom SSE streaming adapter.
2. **Custom SSE adapter is mandatory**, parameterized for send/edit/retry endpoints.
3. **Client-generated `request_id`** is mandatory for idempotency, recovery, and dedupe (even though the API technically allows omission).
4. **Model selection only at create chat** — no fake runtime model switcher.
5. **Attachments are async** with polling. No list endpoint; track pending IDs in Zustand + Tauri store.
6. **`is_new_turn` flag** must be handled to distinguish live generation from replay.
7. **Model downgrade** is a first-class UX feature, not an afterthought. (`completion_signal` is documented in OpenAPI but not yet implemented in the backend — defer until backend ships it.)
8. **`orphan_timeout`** is a distinct error category from provider errors.
9. **Testing: Vitest 2 + RTL**, no Jest.
10. **Desktop polish via Tauri 2 window APIs + window-state + tray**.
11. **React Query for server state, Zustand only for UI state** (including pending attachment IDs and active stream turns).
12. **Problem Details as first-class UI model** — every known error code maps to specific UX copy.
