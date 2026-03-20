import { useQuotaStatusSafe } from "@/entities/quota";
import type { QuotaPeriodStatus } from "@/entities/quota";
import { cn } from "@/shared/lib/cn";
import { Zap, Clock } from "lucide-react";

export function QuotaSummary() {
  const { data: quota, isLoading } = useQuotaStatusSafe();

  if (isLoading || !quota) return null;

  const allPeriods: Array<{ tier: string; period: QuotaPeriodStatus }> = [];
  for (const t of quota.tiers) {
    for (const p of t.periods) {
      allPeriods.push({ tier: t.tier, period: p });
    }
  }

  if (allPeriods.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {allPeriods.map(({ tier, period }) => (
        <QuotaBar key={`${tier}-${period.period}`} tier={tier} period={period} />
      ))}
    </div>
  );
}

function QuotaBar({
  tier,
  period,
}: {
  tier: string;
  period: QuotaPeriodStatus;
}) {
  const pct = period.remaining_percentage;
  const isWarning = period.warning;
  const isExhausted = period.exhausted;

  const label =
    tier === "premium"
      ? period.period === "daily"
        ? "Premium daily"
        : "Premium monthly"
      : period.period === "daily"
        ? "Daily"
        : "Monthly";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-sidebar-foreground">
          <Zap className="h-3 w-3" />
          {label}
        </span>
        <span
          className={cn(
            "font-medium",
            isExhausted
              ? "text-destructive"
              : isWarning
                ? "text-warning"
                : "text-sidebar-foreground",
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isExhausted
              ? "bg-destructive"
              : isWarning
                ? "bg-warning"
                : "bg-primary",
          )}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      {isExhausted && period.next_reset && (
        <p className="flex items-center gap-1 text-[10px] text-destructive">
          <Clock className="h-2.5 w-2.5" />
          Resets {new Date(period.next_reset).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
