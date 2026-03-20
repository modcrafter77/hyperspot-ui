# Hyperspot Chat

Desktop AI chat client for Cyber Fabric mini-chat. Built with Tauri 2, React, and TypeScript.

## Prerequisites

- Node.js 20.19+ or 22.12+
- Rust 1.77+ (for Tauri build)
- Tauri 2 system dependencies: https://v2.tauri.app/start/prerequisites/

## Setup

```bash
npm install
```

## Running the backend (Cyber Fabric mini-chat)

Requires Rust 1.92+.

Set Azure OpenAI credentials before starting:

```bash
export AZURE_OPENAI_API_HOST=<Azure endpoint without https:// prefix>
export AZURE_OPENAI_API_KEY=<api token>
```

**macOS / Linux:**

```bash
make mini-chat
```

**Windows:**

```bash
cargo run --release --bin hyperspot-server --features mini-chat,static-authn,static-authz,single-tenant,static-credstore,otel -- --config config/mini-chat.yaml run
```

If the frontend can't connect, verify that `config/mini-chat.yaml` contains `prefix_path: "/cf"` in the API gateway section:

```yaml
modules:
  api-gateway:
    config:
      prefix_path: "/cf"
```

## Development

Frontend only (browser, uses Vite proxy to backend):

```bash
npm run dev
```

The Vite proxy is configured in `vite.config.ts` — forwards `/v1/*` to `http://127.0.0.1:8087/cf/mini-chat`.

Full desktop app with Tauri:

```bash
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Output:
- macOS: `src-tauri/target/release/bundle/macos/Hyperspot Chat.app`
- DMG: `src-tauri/target/release/bundle/dmg/Hyperspot Chat_<version>_<arch>.dmg`

Note: if `CI` env var is set (common in IDEs), use `CI=false npm run tauri build`.

## Configuration

On first launch the standalone app opens a Settings dialog for the backend URL (e.g. `http://127.0.0.1:8087/cf/mini-chat`). The setting is persisted in `~/Library/Application Support/com.hyperspot.chat/preferences.json`.

## Other commands

| Command | Description |
|---|---|
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run generate:types` | Regenerate API types from `docs/openapi.json` |

## Stack

- **Tauri 2** — desktop shell, system tray, window state persistence, native HTTP
- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS 4** — styling
- **TanStack Query v5** — server state
- **Zustand** — client/UI state
- **cmdk** — command palette (Cmd+K)
