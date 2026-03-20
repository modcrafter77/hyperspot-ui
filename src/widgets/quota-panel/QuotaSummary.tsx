import { useQuotaStatus } from "@/entities/quota";
import { cn } from "@/shared/lib/cn";
import { Zap } from "lucide-react";

export function QuotaSummary() {
  const { data: quota } = useQuotaStatus();

  const premiumTier = quota.tiers.find((t) => t.tier === "premium");
  const dailyPeriod = premiumTier?.periods.find((p) => p.period === "daily");

  if (!dailyPeriod) return null;

  const pct = dailyPeriod.remaining_percentage;
  const isWarning = dailyPeriod.warning;
  const isExhausted = dailyPeriod.exhausted;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-sidebar-foreground">
          <Zap className="h-3 w-3" />
          Daily quota
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
      {isExhausted && (
        <p className="text-[10px] text-destructive">
          Quota exhausted — resets{" "}
          {dailyPeriod.next_reset
            ? new Date(dailyPeriod.next_reset).toLocaleTimeString()
            : "soon"}
        </p>
      )}
    </div>
  );
}
