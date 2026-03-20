import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
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

/** Non-suspense variant — safe for conditional rendering. */
export function useQuotaStatusSafe() {
  return useQuery({
    queryKey: queryKeys.quota.status(),
    queryFn: getQuotaStatus,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/** Returns true if any quota tier/period is exhausted. */
export function useIsQuotaExhausted(): boolean {
  const { data } = useQuotaStatusSafe();
  if (!data) return false;
  return data.tiers.some((t) =>
    t.periods.some((p) => p.exhausted),
  );
}
