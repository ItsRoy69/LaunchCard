export type TemplateId =
  | "editorial"
  | "flex"
  | "split"
  | "terminal"
  | "poster"
  | "quiet"
  | "ledger"
  | "frame"
  | "signal"
  | "marquee";

export type FontPairId = "classic" | "geometric" | "mono";

export type ExportScale = 1 | 2 | 3;

export type Stat = {
  id: string;
  label: string;
  value: string;
};

export type CardSize = {
  id: string;
  label: string;
  w: number;
  h: number;
  hint: string;
};

export type CardPalette = {
  id: string;
  label: string;
  bg: string;
  fg: string;
  muted: string;
  rule: string;
  accent: string;
};

export type FontPair = {
  id: FontPairId;
  label: string;
  blurb: string;
  sans: string;
  serif: string;
  mono: string;
  poster: string;
};

export type TemplateMeta = {
  id: TemplateId;
  label: string;
  blurb: string;
};

export type CardDoc = {
  name: string;
  tagline: string;
  handle: string;
  url: string;
  stats: Stat[];
  logoDataUrl: string | null;
  shotDataUrl: string | null;
  templateId: TemplateId;
  paletteId: string;
  sizeId: string;
  /** null = use palette accent */
  accent: string | null;
  fontPairId: FontPairId;
  exportScale: ExportScale;
};

export type LayoutMode = "banner" | "landscape" | "portrait";
