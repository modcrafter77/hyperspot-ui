import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AppShell } from "@/widgets/app-shell/AppShell";
import { SettingsDialog } from "@/widgets/settings/SettingsDialog";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { useAppStore } from "./store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppWithTheme() {
  const theme = useAppStore((s) => s.theme);
  return (
    <>
      <ErrorBoundary queryClient={queryClient}>
        <AppShell />
      </ErrorBoundary>
      <SettingsDialog />
      <Toaster
        position="bottom-right"
        theme={theme}
        richColors
        closeButton
      />
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWithTheme />
    </QueryClientProvider>
  );
}
