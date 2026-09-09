/** Lifetime pageview ping (once per browser tab session). */

const SESSION_FLAG = "launchcard-view-recorded";

export async function recordPageView(): Promise<number | null> {
  try {
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(SESSION_FLAG)) return null;
      sessionStorage.setItem(SESSION_FLAG, "1");
    }

    const res = await fetch("/api/views", {
      method: "POST",
      headers: { Accept: "application/json" },
      keepalive: true,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { total?: number };
    return typeof data.total === "number" ? data.total : null;
  } catch {
    return null;
  }
}

export async function fetchPageViewTotal(): Promise<number | null> {
  try {
    const res = await fetch("/api/views", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { total?: number };
    return typeof data.total === "number" ? data.total : null;
  } catch {
    return null;
  }
}
