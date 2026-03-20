import { isTauri } from "./tauri";

export type Preferences = {
  sidebarOpen: boolean;
  sidebarWidth: number;
  lastChatId: string | null;
  serverUrl: string;
};

const DEFAULTS: Preferences = {
  sidebarOpen: true,
  sidebarWidth: 280,
  lastChatId: null,
  serverUrl: "",
};

const STORE_FILE = "preferences.json";

let storeInstance: Awaited<ReturnType<typeof import("@tauri-apps/plugin-store").load>> | null = null;

async function getStore() {
  if (storeInstance) return storeInstance;
  const { load } = await import("@tauri-apps/plugin-store");
  storeInstance = await load(STORE_FILE, { autoSave: true, defaults: {} });
  return storeInstance;
}

export async function loadPreferences(): Promise<Preferences> {
  if (!isTauri) return { ...DEFAULTS };
  try {
    const store = await getStore();
    const prefs: Partial<Preferences> = {};
    for (const key of Object.keys(DEFAULTS) as (keyof Preferences)[]) {
      const val = await store.get<Preferences[typeof key]>(key);
      if (val !== null && val !== undefined) {
        (prefs as Record<string, unknown>)[key] = val;
      }
    }
    return { ...DEFAULTS, ...prefs };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function savePreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Promise<void> {
  if (!isTauri) return;
  try {
    const store = await getStore();
    await store.set(key, value);
  } catch {
    // silently ignore in case Tauri isn't available
  }
}
