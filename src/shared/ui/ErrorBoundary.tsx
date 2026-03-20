import { Component, type ErrorInfo, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api";
import { mapApiError } from "@/shared/lib/error-messages";
import { useAppStore } from "@/app/store";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  queryClient?: QueryClient;
};
type State = { error: Error | null };

let resetBoundary: (() => void) | null = null;

export function retryAfterSettings() {
  resetBoundary?.();
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  componentDidMount() {
    resetBoundary = this.handleRetry;
  }

  componentWillUnmount() {
    if (resetBoundary === this.handleRetry) resetBoundary = null;
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    try {
      const detail = [
        `Time: ${new Date().toISOString()}`,
        `Type: ${typeof error}`,
        `Constructor: ${error?.constructor?.name}`,
        `Name: ${error?.name}`,
        `Message: ${error?.message}`,
        `Stack: ${error?.stack}`,
        `JSON: ${JSON.stringify(error)}`,
        `String: ${String(error)}`,
        `Component: ${info.componentStack}`,
      ].join("\n");
      import("@tauri-apps/plugin-store").then(({ load }) =>
        load("crash-log.json", { autoSave: true, defaults: {} }).then((s) =>
          s.set("last_error", detail),
        ),
      ).catch(() => {});
    } catch {}
  }

  handleRetry = () => {
    if (this.props.queryClient) {
      this.props.queryClient.resetQueries();
    }
    this.setState({ error: null });
  };

  handleOpenSettings = () => {
    useAppStore.getState().setSettingsOpen(true);
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;

      const err = this.state.error;
      let title = "Something went wrong";
      let detail = err.message;

      if (err instanceof ApiError) {
        const info = mapApiError(err);
        title = info.title;
        detail = info.detail;
      } else if (
        err instanceof TypeError ||
        /fetch|network|load failed|failed to fetch/i.test(err.message)
      ) {
        title = "Cannot connect to server";
        detail =
          "Check that the server URL is correct and the backend is running.";
      }

      return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{detail}</p>
            <p className="break-all font-mono text-xs text-muted-foreground/60">
              {err instanceof Error
                ? `${err.name}: ${err.message}`
                : `[${typeof err}] ${JSON.stringify(err) ?? String(err)}`}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleOpenSettings}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Settings
              </button>
              <button
                onClick={this.handleRetry}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
