import type { CardDoc, CardPalette, CardSize, TemplateMeta } from "./types";

export const SIZES: CardSize[] = [
  { id: "og", label: "OG / Link", w: 1200, h: 630, hint: "X, Slack, iMessage" },
  { id: "post", label: "X Post", w: 1600, h: 900, hint: "16:9 in-feed" },
  { id: "header", label: "X Header", w: 1500, h: 500, hint: "Profile banner" },
  { id: "square", label: "Square", w: 1080, h: 1080, hint: "Carousel, avatar" },
  { id: "instagram", label: "Instagram", w: 1080, h: 1350, hint: "4:5 feed post" },
  { id: "ph", label: "Product Hunt", w: 1270, h: 760, hint: "Gallery image" },
  { id: "story", label: "Story", w: 1080, h: 1920, hint: "9:16 vertical" },
];

export const PALETTES: CardPalette[] = [
  {
    id: "ink",
    label: "Ink",
    bg: "#0b0b0c",
    fg: "#f3f0e8",
    muted: "#9c978c",
    rule: "#2c2b28",
    accent: "#f3f0e8",
  },
  {
    id: "bone",
    label: "Bone",
    bg: "#efeae0",
    fg: "#161513",
    muted: "#6f6a62",
    rule: "#d4cfc4",
    accent: "#161513",
  },
  {
    id: "slate",
    label: "Slate",
    bg: "#12151a",
    fg: "#e4e9ef",
    muted: "#8b95a3",
    rule: "#2a313b",
    accent: "#d5dde6",
  },
  {
    id: "harbor",
    label: "Harbor",
    bg: "#0e1416",
    fg: "#dce6e6",
    muted: "#7e8c8c",
    rule: "#243032",
    accent: "#c5d4d4",
  },
  {
    id: "studio",
    label: "Studio",
    bg: "#181614",
    fg: "#f0ebe3",
    muted: "#9a9286",
    rule: "#322e28",
    accent: "#e8dcc8",
  },
  {
    id: "newsprint",
    label: "Newsprint",
    bg: "#e7e2d6",
    fg: "#1c1916",
    muted: "#6b655c",
    rule: "#cfc8b8",
    accent: "#1c1916",
  },
];

export const TEMPLATES: TemplateMeta[] = [
  { id: "editorial", label: "Editorial", blurb: "Serif, rules, press" },
  { id: "flex", label: "Flex", blurb: "Giant number" },
  { id: "split", label: "Split", blurb: "Panel + copy" },
  { id: "terminal", label: "Terminal", blurb: "Launch log" },
  { id: "poster", label: "Poster", blurb: "Huge type" },
  { id: "quiet", label: "Quiet", blurb: "Space and ink" },
  { id: "ledger", label: "Ledger", blurb: "Two columns" },
  { id: "frame", label: "Frame", blurb: "Screenshot hero" },
];

export const PRESETS: { id: string; label: string; doc: Partial<CardDoc> }[] = [
  {
    id: "launchcard",
    label: "LaunchCard",
    doc: {
      name: "LaunchCard",
      tagline: "Launch assets that look expensive. Typed in the browser. Nothing leaves the machine.",
      handle: "you",
      url: "launchcard.app",
      stats: [
        { id: "s1", label: "APIs", value: "0" },
        { id: "s2", label: "templates", value: "8" },
        { id: "s3", label: "sizes", value: "7" },
      ],
    },
  },
  {
    id: "hold",
    label: "Hold My Notes",
    doc: {
      name: "Hold My Notes",
      tagline: "Sticky notes that live on the edge of your Mac. Hover to peek.",
      handle: "nullbytes00",
      url: "holdmynotes.app",
      stats: [
        { id: "s1", label: "platform", value: "macOS" },
        { id: "s2", label: "price", value: "free" },
        { id: "s3", label: "notes", value: "∞" },
      ],
    },
  },
  {
    id: "boop",
    label: "Boop",
    doc: {
      name: "Boop",
      tagline: "An 8 MB Sentry. Errors go straight to your phone. No Slack. No subscription.",
      handle: "codestirring",
      url: "boop.dev",
      stats: [
        { id: "s1", label: "RAM", value: "8 MB" },
        { id: "s2", label: "price", value: "$0" },
        { id: "s3", label: "license", value: "OSS" },
      ],
    },
  },
];

export function defaultDoc(): CardDoc {
  return {
    name: "LaunchCard",
    tagline: "Launch assets that look expensive. Typed in the browser. Nothing leaves the machine.",
    handle: "you",
    url: "launchcard.app",
    stats: [
      { id: "s1", label: "APIs", value: "0" },
      { id: "s2", label: "templates", value: "8" },
      { id: "s3", label: "sizes", value: "7" },
    ],
    logoDataUrl: null,
    shotDataUrl: null,
    templateId: "editorial",
    paletteId: "ink",
    sizeId: "og",
  };
}

export function slugify(name: string) {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return s || "launchcard";
}

export function displayHandle(handle: string) {
  const h = handle.trim().replace(/^@+/, "");
  return h ? `@${h}` : "";
}

export function displayUrl(url: string) {
  return url.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}
