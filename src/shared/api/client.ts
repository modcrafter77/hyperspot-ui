import type { components } from "./schema.gen";
import { appFetch } from "@/shared/lib/fetch";

export type ErrorResponse = components["schemas"]["ErrorResponse"];

export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: ErrorResponse,
  ) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
  }

  get code(): string {
    return this.problem.code || this.problem.title;
  }
}

/** Parse an error response body and throw an ApiError. Extracted to avoid
 *  the identical try/catch block being repeated across fetchJson, fetchDelete,
 *  and uploadFile. */
async function throwApiError(res: Response, path: string): Promise<never> {
  let problem: ErrorResponse;
  try {
    problem = await res.json();
  } catch {
    problem = {
      type: "about:blank",
      title: res.statusText,
      status: res.status,
      detail: `HTTP ${res.status}`,
      instance: path,
      code: "",
    };
  }
  throw new ApiError(res.status, problem);
}

let baseUrl = "";
let getAccessToken: (() => string | null) | null = null;

export function configureApi(opts: {
  baseUrl: string;
  getAccessToken?: () => string | null;
}) {
  baseUrl = opts.baseUrl.replace(/\/$/, "");
  getAccessToken = opts.getAccessToken ?? null;
}

export function getBaseUrl(): string {
  return baseUrl;
}

/** Resolve the effective base URL and apply it via configureApi.
 *  In dev mode with no URL configured, uses the Vite proxy (empty base).
 *  Extracted here (next to configureApi) to avoid a circular dependency
 *  when feature modules need to reconfigure the API at runtime. */
export function applyServerUrl(serverUrl: string) {
  if (import.meta.env.DEV && !serverUrl) {
    configureApi({ baseUrl: "" });
  } else {
    configureApi({
      baseUrl:
        serverUrl ||
        import.meta.env.VITE_API_BASE_URL ||
        "http://127.0.0.1:8087/mini-chat",
    });
  }
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await appFetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(),
      ...(init?.headers as Record<string, string>),
    },
  });

  if (!res.ok) await throwApiError(res, path);

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function fetchDelete(path: string): Promise<void> {
  const url = `${baseUrl}${path}`;
  const res = await appFetch(url, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  if (!res.ok) await throwApiError(res, path);
}

export async function uploadFile<T>(
  path: string,
  file: File,
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const form = new FormData();
  form.append("file", file);

  const res = await appFetch(url, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });

  if (!res.ok) await throwApiError(res, path);

  return res.json();
}
