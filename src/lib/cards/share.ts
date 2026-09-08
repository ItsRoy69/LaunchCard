import { PALETTES, SIZES, TEMPLATES } from "./catalog";
import type { CardDoc, Stat, TemplateId } from "./types";

/** v1 legacy JSON payload (kept for decoding old links). */
type SharePayloadV1 = {
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

const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
const PALETTE_IDS = PALETTES.map((p) => p.id);
const SIZE_IDS = SIZES.map((s) => s.id);

function toBase64Url(bytes: Uint8Array) {
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
  return bytes;
}

function utf8Encode(text: string) {
  return new TextEncoder().encode(text);
}

function utf8Decode(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function isTemplateId(id: string): id is TemplateId {
  return TEMPLATE_IDS.includes(id as TemplateId);
}

function newStatId(i: number) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${i}-${Date.now()}`;
}

function packStats(stats: Stat[]) {
  return stats
    .slice(0, 4)
    .filter((s) => s.value.trim() || s.label.trim())
    .map((s) => `${s.value.slice(0, 24)}\t${s.label.slice(0, 24)}`)
    .join("\n");
}

function unpackStats(raw: string): Stat[] {
  const lines = raw ? raw.split("\n") : [];
  const stats = lines
    .slice(0, 4)
    .map((line, i) => {
      const tab = line.indexOf("\t");
      const value = tab === -1 ? line : line.slice(0, tab);
      const label = tab === -1 ? "" : line.slice(tab + 1);
      return {
        id: newStatId(i),
        value: value.slice(0, 24),
        label: label.slice(0, 24),
      };
    })
    .filter((s) => s.value || s.label);
  return stats.length ? stats : [{ id: newStatId(0), label: "", value: "" }];
}

/**
 * v2 compact format:
 *   2.<tplIdx><palIdx><szIdx>.<base64url(name\0tagline\0handle\0url\0stats)>
 * Indices are single base36 digits (0-9a-z) — enough for current catalogs.
 */
export function encodeShare(doc: CardDoc): string {
  const tpl = Math.max(0, TEMPLATE_IDS.indexOf(doc.templateId));
  const pal = Math.max(0, PALETTE_IDS.indexOf(doc.paletteId));
  const sz = Math.max(0, SIZE_IDS.indexOf(doc.sizeId));

  const body = [
    doc.name.slice(0, 48),
    doc.tagline.slice(0, 140),
    doc.handle.slice(0, 32),
    doc.url.slice(0, 64),
    packStats(doc.stats),
  ].join("\0");

  const head = `2.${tpl.toString(36)}${pal.toString(36)}${sz.toString(36)}.`;
  return head + toBase64Url(utf8Encode(body));
}

function decodeV2(raw: string): Partial<CardDoc> | null {
  // 2.xyz.<payload>
  if (!raw.startsWith("2.") || raw.length < 6) return null;
  const idxBlock = raw.slice(2, 5);
  if (raw[5] !== ".") return null;
  const payload = raw.slice(6);

  const tpl = parseInt(idxBlock[0] ?? "0", 36);
  const pal = parseInt(idxBlock[1] ?? "0", 36);
  const sz = parseInt(idxBlock[2] ?? "0", 36);
  if (Number.isNaN(tpl) || Number.isNaN(pal) || Number.isNaN(sz)) return null;

  const text = utf8Decode(fromBase64Url(payload));
  const parts = text.split("\0");
  const name = (parts[0] ?? "").slice(0, 48);
  const tagline = (parts[1] ?? "").slice(0, 140);
  const handle = (parts[2] ?? "").slice(0, 32);
  const url = (parts[3] ?? "").slice(0, 64);
  const statsRaw = parts[4] ?? "";

  return {
    name,
    tagline,
    handle,
    url,
    stats: unpackStats(statsRaw),
    templateId: TEMPLATE_IDS[tpl] ?? "editorial",
    paletteId: PALETTE_IDS[pal] ?? "ink",
    sizeId: SIZE_IDS[sz] ?? "og",
    logoDataUrl: null,
    shotDataUrl: null,
  };
}

function decodeV1(raw: string): Partial<CardDoc> | null {
  try {
    const text = utf8Decode(fromBase64Url(raw));
    const data = JSON.parse(text) as SharePayloadV1;
    if (!data || data.v !== 1) return null;

    const templateId = isTemplateId(data.templateId) ? data.templateId : "editorial";
    const paletteId = PALETTE_IDS.includes(data.paletteId) ? data.paletteId : "ink";
    const sizeId = SIZE_IDS.includes(data.sizeId) ? data.sizeId : "og";

    const stats: Stat[] = (Array.isArray(data.stats) ? data.stats : [])
      .slice(0, 4)
      .map((s, i) => ({
        id: newStatId(i),
        label: String(s?.label ?? "").slice(0, 24),
        value: String(s?.value ?? "").slice(0, 24),
      }));

    if (!stats.length) stats.push({ id: newStatId(0), label: "", value: "" });

    return {
      name: String(data.name ?? "").slice(0, 48),
      tagline: String(data.tagline ?? "").slice(0, 180),
      handle: String(data.handle ?? "").slice(0, 40),
      url: String(data.url ?? "").slice(0, 80),
      stats,
      templateId,
      paletteId,
      sizeId,
      logoDataUrl: null,
      shotDataUrl: null,
    };
  } catch {
    return null;
  }
}

export function decodeShare(raw: string): Partial<CardDoc> | null {
  if (!raw) return null;
  if (raw.startsWith("2.")) return decodeV2(raw);
  return decodeV1(raw);
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

/** Rough safe budget for hash URLs across browsers / messengers. */
export const SHARE_URL_SOFT_LIMIT = 1800;
