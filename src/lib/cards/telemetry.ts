/** Lightweight product events via Vercel Analytics (no PII, no draft content). */

import { track } from "@vercel/analytics";

export function trackEvent(
  name: "export_png" | "export_pack" | "copy_image" | "share_link" | "load_share",
  props?: Record<string, string | number | boolean | null>,
) {
  try {
    track(name, props);
  } catch {
    // Analytics must never break the studio.
  }
}
