import { Button } from "@/components/ui/button";

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect
        x="2.5"
        y="5.5"
        width="13"
        height="9"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="8.5" y="9.5" width="13" height="9" rx="1.6" fill="currentColor" />
    </svg>
  );
}

export function NotFound() {
  const path =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 md:px-5">
        <a href="/" className="flex min-w-0 flex-1 items-center gap-2.5 text-fg no-underline">
          <Mark className="size-6 text-primary" />
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight tracking-tight">LaunchCard</p>
            <p className="truncate text-xs text-subtle">On-device drafts. No account required.</p>
          </div>
        </a>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="space-y-3">
          <p className="font-mono text-xs tracking-widest text-muted">404</p>
          <h1 className="font-display text-3xl tracking-tight text-fg md:text-4xl">
            Page not found
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted">
            Nothing lives at this path. LaunchCard is a single studio — the only page is the editor
            itself.
          </p>
          {path && path !== "/" ? (
            <p className="mx-auto max-w-md truncate rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-subtle">
              {path}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" asChild>
            <a href="/">Back to studio</a>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.history.back()}
          >
            Go back
          </Button>
        </div>
      </main>
    </div>
  );
}
