import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AppShell } from "@/widgets/app-shell/AppShell";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary queryClient={queryClient}>
        <AppShell />
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors
          closeButton
        />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
