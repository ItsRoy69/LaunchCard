/**
 * Microsoft Clarity — heatmaps + session replay in the Clarity dashboard.
 * Project ID from https://clarity.microsoft.com → Settings → Setup
 * Set VITE_CLARITY_PROJECT_ID in Vercel env (and .env.local for local).
 */

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export function initClarity() {
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;
  if (!projectId || typeof window === "undefined") return;
  if (window.clarity) return;

  (function (c: Window, l: Document, a: string, r: string, i: string) {
    const w = c as Window & { [key: string]: unknown };
    w[a] =
      w[a] ||
      function (...args: unknown[]) {
        ((w[a] as { q?: unknown[][] }).q = (w[a] as { q?: unknown[][] }).q || []).push(args);
      };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = "https://www.clarity.ms/tag/" + i;
    const y = l.getElementsByTagName(r)[0];
    y?.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", projectId);
}
