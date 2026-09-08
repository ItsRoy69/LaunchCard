import { PALETTES, SIZES, TEMPLATES } from "./catalog";
import type { CardDoc, Stat, TemplateId } from "./types";

/** Compact share payload — text + layout only (images stay on-device). */
type SharePayload = {
  v: 1;
  name: string;
  tagline: string;
  handle: string;
  url: string;
  stats: { label: string; value: string }[];
  templateId: TemplateId;
  paletteId: string;
  sizeId: string;
};

function toBase64Url(json: string) {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(raw: string) {
  const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function isTemplateId(id: string): id is TemplateId {
  return TEMPLATES.some((t) => t.id === id);
}

export function encodeShare(doc: CardDoc): string {
  const payload: SharePayload = {
    v: 1,
    name: doc.name.slice(0, 48),
    tagline: doc.tagline.slice(0, 180),
    handle: doc.handle.slice(0, 40),
    url: doc.url.slice(0, 80),
    stats: doc.stats.slice(0, 4).map((s) => ({
      label: s.label.slice(0, 24),
      value: s.value.slice(0, 24),
    })),
    templateId: doc.templateId,
    paletteId: doc.paletteId,
    sizeId: doc.sizeId,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShare(raw: string): Partial<CardDoc> | null {
  try {
    const text = fromBase64Url(raw);
    const data = JSON.parse(text) as SharePayload;
    if (!data || data.v !== 1) return null;

    const templateId = isTemplateId(data.templateId) ? data.templateId : "editorial";
    const paletteId = PALETTES.some((p) => p.id === data.paletteId)
      ? data.paletteId
      : "ink";
    const sizeId = SIZES.some((s) => s.id === data.sizeId) ? data.sizeId : "og";

    const stats: Stat[] = (Array.isArray(data.stats) ? data.stats : [])
      .slice(0, 4)
      .map((s, i) => ({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `s-${i}-${Date.now()}`,
        label: String(s?.label ?? "").slice(0, 24),
        value: String(s?.value ?? "").slice(0, 24),
      }));

    if (!stats.length) {
      stats.push({ id: "s1", label: "", value: "" });
    }

    return {
      name: String(data.name ?? "").slice(0, 48),
      tagline: String(data.tagline ?? "").slice(0, 180),
      handle: String(data.handle ?? "").slice(0, 40),
      url: String(data.url ?? "").slice(0, 80),
      stats,
      templateId,
      paletteId,
      sizeId,
      // Shared links never include images.
      logoDataUrl: null,
      shotDataUrl: null,
    };
  } catch {
    return null;
  }
}

export function readShareFromLocation(): Partial<CardDoc> | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith("s=")) return null;
  return decodeShare(hash.slice(2));
}

export function buildShareUrl(doc: CardDoc): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return `${origin}${path}#s=${encodeShare(doc)}`;
}
