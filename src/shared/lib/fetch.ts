import { isTauri } from "./tauri";

let tauriFetch: typeof globalThis.fetch | null = null;
let tauriFetchFailed = false;

function writeCrashLog(detail: string) {
  import("@tauri-apps/plugin-store")
    .then(({ load }) =>
      load("debug-log.json", { autoSave: true, defaults: {} }).then((s) =>
        s.set("fetch_" + Date.now(), detail),
      ),
    )
    .catch(() => {});
}

async function loadTauriFetch(): Promise<typeof globalThis.fetch | null> {
  if (tauriFetch) return tauriFetch;
  if (tauriFetchFailed) return null;
  try {
    const mod = await import("@tauri-apps/plugin-http");
    tauriFetch = mod.fetch;
    return tauriFetch;
  } catch (err) {
    tauriFetchFailed = true;
    writeCrashLog(`loadTauriFetch failed: ${String(err)}`);
    return null;
  }
}

export async function appFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (isTauri) {
    const f = await loadTauriFetch();
    if (f) {
      try {
        return await f(input, init);
      } catch (err) {
        const msg = err instanceof Error ? err.stack || err.message : JSON.stringify(err);
        writeCrashLog(`tauriFetch error for ${String(input)}: ${msg}`);
        throw err;
      }
    }
  }
  return fetch(input, init);
}
