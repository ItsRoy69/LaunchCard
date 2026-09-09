import { FONT_PAIRS } from "./catalog";
import type { FontPair, FontPairId } from "./types";

const SPECS = [
  '400 64px "Figtree"',
  '500 64px "Figtree"',
  '600 64px "Figtree"',
  '700 64px "Figtree"',
  '400 64px "Instrument Serif"',
  'italic 400 64px "Instrument Serif"',
  '400 64px "IBM Plex Mono"',
  '500 64px "IBM Plex Mono"',
  '700 64px "Syne"',
  '800 64px "Syne"',
  '400 64px "DM Sans"',
  '500 64px "DM Sans"',
  '600 64px "DM Sans"',
  '700 64px "DM Sans"',
  '400 64px "Fraunces"',
  '600 64px "Fraunces"',
  '700 64px "Fraunces"',
  '500 64px "Space Grotesk"',
  '700 64px "Space Grotesk"',
  '400 64px "IBM Plex Sans"',
  '500 64px "IBM Plex Sans"',
  '600 64px "IBM Plex Sans"',
  '400 64px "IBM Plex Serif"',
  '600 64px "IBM Plex Serif"',
];

let ready: Promise<void> | null = null;

export function ensureCardFonts(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!ready) {
    ready = Promise.all(
      SPECS.map((spec) => document.fonts.load(spec).catch(() => [])),
    )
      .then(() => document.fonts.ready)
      .then(() => undefined);
  }
  return ready;
}

/** Active stacks for the current render (set in renderCard). */
export let FONT: Pick<FontPair, "sans" | "serif" | "mono" | "poster"> = {
  sans: FONT_PAIRS[0].sans,
  serif: FONT_PAIRS[0].serif,
  mono: FONT_PAIRS[0].mono,
  poster: FONT_PAIRS[0].poster,
};

export function setActiveFontPair(id: FontPairId | string) {
  const pair = FONT_PAIRS.find((p) => p.id === id) ?? FONT_PAIRS[0];
  FONT = {
    sans: pair.sans,
    serif: pair.serif,
    mono: pair.mono,
    poster: pair.poster,
  };
}
