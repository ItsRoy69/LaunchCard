import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "Something went wrong while rendering.";
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep console noise for local debugging; nothing is sent off-device.
    console.error("[LaunchCard] ErrorBoundary caught:", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-fg">
        <div className="max-w-md space-y-2">
          <p className="font-display text-2xl tracking-tight">
            {this.props.fallbackTitle ?? "Studio crashed"}
          </p>
          <p className="text-sm text-muted">
            A rendering error occurred. Your draft is still in local storage — try reloading the
            studio.
          </p>
          {this.state.message ? (
            <p className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-subtle">
              {this.state.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={this.reset}>
            Try again
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}
