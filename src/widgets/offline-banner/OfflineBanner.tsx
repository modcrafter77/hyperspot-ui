import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-destructive/90 px-3 py-1.5 text-xs font-medium text-destructive-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      You are offline — messages will fail until the connection is restored
    </div>
  );
}
