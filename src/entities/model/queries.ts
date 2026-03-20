import { useSuspenseQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { listModels } from "./api";

export function useModels() {
  return useSuspenseQuery({
    queryKey: queryKeys.models.list(),
    queryFn: listModels,
    staleTime: 5 * 60 * 1000,
  });
}
