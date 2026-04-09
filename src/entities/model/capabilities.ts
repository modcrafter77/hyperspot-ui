import type { Model } from "./types";

export type ModelCapabilities = {
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsWebSearch: boolean;
};

/**
 * Derive UI-relevant capability flags from a Model's multimodal_capabilities.
 * Known P1 values: VISION_INPUT, RAG. WEB_SEARCH may be added by backend.
 * Unknown values are ignored per the OpenAPI contract.
 */
export function getModelCapabilities(
  model: Model | undefined,
): ModelCapabilities {
  const caps = model?.multimodal_capabilities ?? [];
  return {
    supportsImages: caps.includes("VISION_INPUT"),
    supportsFiles: caps.includes("RAG"),
    supportsWebSearch: caps.includes("WEB_SEARCH"),
  };
}
