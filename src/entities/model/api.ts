import { fetchJson } from "@/shared/api";
import type { ModelList } from "./types";

export function listModels(): Promise<ModelList> {
  return fetchJson("/v1/models");
}
