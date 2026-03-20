import { fetchJson } from "@/shared/api";
import type { QuotaStatusResponse } from "./types";

export function getQuotaStatus(): Promise<QuotaStatusResponse> {
  return fetchJson("/v1/quota/status");
}
