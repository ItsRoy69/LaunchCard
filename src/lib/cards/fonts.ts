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
];

let ready: Promise<void> | null = null;

export function ensureCardFonts(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!ready) {
    ready = Promise.all(
      SPECS.map((spec) => document.fonts.load(spec).catch(() => [])),
    ).then(() => document.fonts.ready).then(() => undefined);
  }
  return ready;
}

export const FONT = {
  sans: '"Figtree", ui-sans-serif, system-ui, sans-serif',
  serif: '"Instrument Serif", ui-serif, Georgia, serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
  poster: '"Syne", ui-sans-serif, system-ui, sans-serif',
};
