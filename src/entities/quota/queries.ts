import { useSuspenseQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getQuotaStatus } from "./api";

export function useQuotaStatus() {
  return useSuspenseQuery({
    queryKey: queryKeys.quota.status(),
    queryFn: getQuotaStatus,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
