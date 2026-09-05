import { PALETTES, SIZES, displayHandle, displayUrl } from "./catalog";
import { FONT } from "./fonts";
import { loadImage } from "./image";
import type { CardDoc, CardPalette, LayoutMode, Stat } from "./types";

export type RenderOpts = { scale?: number };

type Ctx = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  k: number;
  pad: number;
  pal: CardPalette;
  doc: CardDoc;
  logo: HTMLImageElement | null;
  shot: HTMLImageElement | null;
  mode: LayoutMode;
};

function palette(id: string) {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

function sizeOf(id: string) {
  return SIZES.find((s) => s.id === id) ?? SIZES[0];
}

function modeOf(w: number, h: number): LayoutMode {
  const r = h / w;
  if (r > 1.15) return "portrait";
  if (r < 0.42) return "banner";
  return "landscape";
}

function liveStats(stats: Stat[]) {
  return stats.filter((s) => s.value.trim() || s.label.trim());
}

function title(doc: CardDoc) {
  return doc.name.trim() || "Untitled";
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  breakWords = true,
): string[] {
  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
        continue;
      }
      if (current) lines.push(current);
      if (ctx.measureText(word).width <= maxWidth) {
        current = word;
      } else if (breakWords) {
        let chunk = "";
        for (const ch of word) {
          const next = chunk + ch;
          if (ctx.measureText(next).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk = next;
          }
        }
        current = chunk;
      } else {
        lines.push(ellipsize(ctx, word, maxWidth));
        current = "";
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return t ? `${t}…` : "";
}

function paragraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  maxLines: number,
  fontFn: (size: number) => string,
  keepWords = false,
  maxHeight?: number,
) {
  let size = maxSize;
  while (size >= minSize) {
    ctx.font = fontFn(size);
    const lines = wrap(ctx, text, maxWidth, !keepWords);
    const lh = lineStep(ctx, size);
    const fits =
      lines.length <= maxLines &&
      lines.every((line) => ctx.measureText(line).width <= maxWidth + 0.5) &&
      (maxHeight == null || lines.length * lh <= maxHeight);
    if (fits) return { lines, size, lh };
    size -= 2;
  }
  ctx.font = fontFn(minSize);
  const lh = lineStep(ctx, minSize);
  const budget = maxHeight != null ? Math.max(1, Math.floor(maxHeight / lh)) : maxLines;
  const lines = wrap(ctx, text, maxWidth, !keepWords).slice(0, Math.min(maxLines, budget));
  if (lines.length) {
    lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1], maxWidth);
  }
  return { lines, size: minSize, lh };
}

function fitOne(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  fontFn: (size: number) => string,
) {
  let size = maxSize;
  ctx.font = fontFn(size);
  while (size > minSize) {
    const width = ctx.measureText(text).width;
    if (width > 0 && width <= maxWidth) break;
    size -= 1;
    ctx.font = fontFn(size);
  }
  return size;
}

function lineStep(ctx: CanvasRenderingContext2D, size: number) {
  const m = ctx.measureText("Hg");
  const a = m.fontBoundingBoxAscent;
  const d = m.fontBoundingBoxDescent;
  if (a != null && d != null && a + d > 0) return a + d;
  return size * 0.94;
}

function inkDepth(ctx: CanvasRenderingContext2D, text: string, size: number) {
  const m = ctx.measureText(text);
  if (m.actualBoundingBoxDescent != null && m.actualBoundingBoxDescent > 0) {
    return m.actualBoundingBoxDescent;
  }
  return lineStep(ctx, size);
}

function typeReset(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

function fillRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, r));
  ctx.fill();
}

function coverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / Math.max(1, img.height);
  const r = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > r) {
    dw = h * ir;
    dx = x - (dw - w) / 2;
  } else {
    dh = w / ir;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function containImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / Math.max(1, img.height);
  const r = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > r) {
    dw = w;
    dh = w / ir;
    dy = y + (h - dh) / 2;
  } else {
    dh = h;
    dw = h * ir;
    dx = x + (w - dw) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function clipRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  paint: () => void,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, r));
  ctx.clip();
  paint();
  ctx.restore();
}

function drawMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pal: CardPalette,
  logo: HTMLImageElement | null,
  name: string,
) {
  const r = size * 0.22;
  ctx.fillStyle = pal.rule;
  fillRound(ctx, x, y, size, size, r);
  if (logo) {
    clipRound(ctx, x, y, size, size, r, () => {
      ctx.fillStyle = pal.bg;
      ctx.fillRect(x, y, size, size);
      const inset = Math.max(2, size * 0.08);
      containImage(ctx, logo, x + inset, y + inset, size - inset * 2, size - inset * 2);
    });
    return;
  }
  ctx.fillStyle = pal.fg;
  fillRound(ctx, x, y, size, size, r);
  ctx.fillStyle = pal.bg;
  ctx.font = `700 ${Math.round(size * 0.46)}px ${FONT.poster}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const letter = (name.trim()[0] || "L").toUpperCase();
  ctx.fillText(letter, x + size / 2, y + size / 2 + size * 0.02);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

function hairline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, pal: CardPalette) {
  ctx.fillStyle = pal.rule;
  ctx.fillRect(x, y, w, 1);
}

function drawStatsRow(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  size: number,
  stats = liveStats(c.doc.stats),
) {
  if (!stats.length) return;
  const col = w / stats.length;
  stats.forEach((st, i) => {
    const cx = x + i * col;
    if (i > 0) {
      c.ctx.fillStyle = c.pal.rule;
      c.ctx.fillRect(cx, y, 1, size * 2.2);
    }
    c.ctx.fillStyle = c.pal.fg;
    c.ctx.font = `600 ${size}px ${FONT.sans}`;
    c.ctx.textBaseline = "top";
    c.ctx.fillText(ellipsize(c.ctx, st.value.trim() || "—", col - size), cx + size * 0.6, y);
    c.ctx.fillStyle = c.pal.muted;
    c.ctx.font = `500 ${size * 0.42}px ${FONT.sans}`;
    c.ctx.fillText(
      ellipsize(c.ctx, (st.label || "stat").toUpperCase(), col - size),
      cx + size * 0.6,
      y + size * 1.2,
    );
  });
}

function drawStatsStack(c: Ctx, x: number, y: number, w: number, size: number) {
  const stats = liveStats(c.doc.stats);
  stats.forEach((st, i) => {
    const yy = y + i * size * 2.15;
    c.ctx.fillStyle = c.pal.fg;
    c.ctx.font = `600 ${size}px ${FONT.sans}`;
    c.ctx.fillText(ellipsize(c.ctx, st.value.trim() || "—", w * 0.45), x, yy);
    c.ctx.fillStyle = c.pal.muted;
    c.ctx.font = `500 ${size * 0.48}px ${FONT.sans}`;
    c.ctx.fillText(
      ellipsize(c.ctx, (st.label || "stat").toUpperCase(), w * 0.5),
      x + w * 0.48,
      yy + size * 0.2,
    );
  });
}

function kicker(c: Ctx, x: number, y: number, size: number) {
  c.ctx.fillStyle = c.pal.muted;
  c.ctx.font = `500 ${size}px ${FONT.sans}`;
  c.ctx.fillText("NEW  ·  LAUNCH", x, y);
}

function metaLine(c: Ctx) {
  const handle = displayHandle(c.doc.handle);
  const url = displayUrl(c.doc.url);
  return [handle, url].filter(Boolean).join("   ·   ");
}

function editorial(c: Ctx) {
  const { ctx, w, h, pad, pal, k } = c;
  const name = title(c.doc);
  const mark = Math.round(c.mode === "banner" ? Math.min(h * 0.62, w * 0.18) : 56 * k);
  const markGap = Math.round(20 * k);

  if (c.mode === "banner") {
    drawMark(ctx, pad, (h - mark) / 2, mark, pal, c.logo, name);
    const tx = pad + mark + pad * 0.7;
    const maxW = Math.max(48, w * 0.5 - tx);
    ctx.fillStyle = pal.fg;
    const ns = fitOne(ctx, name, maxW, h * 0.28, 16, (s) => `400 ${s}px ${FONT.serif}`);
    ctx.font = `400 ${ns}px ${FONT.serif}`;
    ctx.textBaseline = "middle";
    ctx.fillText(ellipsize(ctx, name, maxW), tx, h * 0.42);
    ctx.textBaseline = "top";
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${h * 0.1}px ${FONT.sans}`;
    const tag = c.doc.tagline.trim();
    if (tag) ctx.fillText(ellipsize(ctx, tag, maxW), tx, h * 0.58);
    drawStatsRow(c, w * 0.62, h * 0.32, w * 0.34, h * 0.16);
    return;
  }

  kicker(c, pad, pad, 11 * k);
  drawMark(ctx, w - pad - mark, pad, mark, pal, c.logo, name);

  const titleMaxW = Math.max(64, w - pad * 2 - mark - markGap);
  const maxNameSize = c.mode === "portrait" ? w * 0.16 : h * 0.18;
  const { lines, size } = paragraph(
    ctx,
    name,
    titleMaxW,
    maxNameSize,
    22 * k,
    c.mode === "portrait" ? 4 : 2,
    (s) => `400 ${s}px ${FONT.serif}`,
    true,
  );
  let y = pad + 36 * k;
  ctx.fillStyle = pal.fg;
  ctx.font = `400 ${size}px ${FONT.serif}`;
  const lh = size * 1.05;
  for (const line of lines) {
    ctx.fillText(ellipsize(ctx, line, titleMaxW), pad, y);
    y += lh;
  }

  y += 22 * k;
  hairline(ctx, pad, y, w - pad * 2, pal);
  y += 22 * k;

  const tag = c.doc.tagline.trim();
  if (tag) {
    const body = paragraph(
      ctx,
      tag,
      c.mode === "portrait" ? w - pad * 2 : (w - pad * 2) * 0.78,
      22 * k,
      14 * k,
      c.mode === "portrait" ? 6 : 3,
      (s) => `400 ${s}px ${FONT.sans}`,
    );
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${body.size}px ${FONT.sans}`;
    for (const line of body.lines) {
      ctx.fillText(line, pad, y);
      y += body.size * 1.4;
    }
  }

  const statsY = h - pad - 52 * k;
  drawStatsRow(c, pad, statsY, w - pad * 2, 22 * k);
  const meta = metaLine(c);
  if (meta) {
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${11 * k}px ${FONT.mono}`;
    ctx.fillText(ellipsize(ctx, meta, w - pad * 2), pad, h - pad);
  }
}

function flex(c: Ctx) {
  const { ctx, w, h, pad, pal, k } = c;
  const stats = liveStats(c.doc.stats);
  const hero = stats[0] ?? { label: "stat", value: "—" };
  const name = title(c.doc);
  const heroText = hero.value.trim() || "—";
  const heroLabel = (hero.label || "stat").toUpperCase();
  typeReset(ctx);

  if (c.mode === "banner") {
    const mark = h * 0.42;
    drawMark(ctx, pad, (h - mark) / 2, mark, pal, c.logo, name);
    typeReset(ctx);
    const nx = pad + mark + 14 * k;
    ctx.fillStyle = pal.fg;
    ctx.font = `600 ${h * 0.16}px ${FONT.sans}`;
    ctx.textBaseline = "middle";
    ctx.fillText(ellipsize(ctx, name, w * 0.28), nx, h * 0.38);
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${h * 0.1}px ${FONT.sans}`;
    ctx.fillText(ellipsize(ctx, displayHandle(c.doc.handle) || displayUrl(c.doc.url), w * 0.28), nx, h * 0.58);
    const hx = w * 0.52;
    const maxHeroW = w - hx - pad;
    const hs = fitOne(ctx, heroText, maxHeroW, h * 0.5, 18, (s) => `800 ${s}px ${FONT.poster}`);
    ctx.fillStyle = pal.fg;
    ctx.font = `800 ${hs}px ${FONT.poster}`;
    ctx.fillText(heroText, hx, h * 0.42);
    ctx.textBaseline = "top";
    return;
  }

  const mark = 44 * k;
  drawMark(ctx, pad, pad, mark, pal, c.logo, name);
  typeReset(ctx);
  const nx = pad + mark + 14 * k;
  const nameMax = Math.max(48, w - nx - pad);
  ctx.fillStyle = pal.fg;
  ctx.font = `600 ${16 * k}px ${FONT.sans}`;
  ctx.fillText(ellipsize(ctx, name, nameMax), nx, pad + 4 * k);
  ctx.fillStyle = pal.muted;
  ctx.font = `400 ${13 * k}px ${FONT.sans}`;
  ctx.fillText(
    ellipsize(ctx, displayHandle(c.doc.handle) || displayUrl(c.doc.url), nameMax),
    nx,
    pad + 26 * k,
  );

  const rest = stats.slice(1);
  const footerH = rest.length ? 56 * k : 28 * k;
  const hx = pad;
  const hy = pad + mark + 32 * k;
  const heroMaxW = c.mode === "portrait" ? w - pad * 2 : w * 0.5;
  const heroMaxH = Math.max(48, h - hy - footerH - pad);
  const want = Math.min(c.mode === "portrait" ? w * 0.28 : h * 0.38, heroMaxH);
  let hs = fitOne(ctx, heroText, heroMaxW, want, 28, (s) => `800 ${s}px ${FONT.poster}`);
  ctx.font = `800 ${hs}px ${FONT.poster}`;
  while (hs > 28 && inkDepth(ctx, heroText, hs) > heroMaxH) {
    hs -= 2;
    ctx.font = `800 ${hs}px ${FONT.poster}`;
  }
  ctx.fillStyle = pal.fg;
  ctx.font = `800 ${hs}px ${FONT.poster}`;
  ctx.fillText(heroText, hx, hy);
  const labelY = hy + inkDepth(ctx, heroText, hs) + 10 * k;
  ctx.fillStyle = pal.muted;
  ctx.font = `500 ${13 * k}px ${FONT.sans}`;
  ctx.fillText(ellipsize(ctx, heroLabel, heroMaxW), hx, labelY);

  const tag = c.doc.tagline.trim();
  if (tag && c.mode !== "portrait") {
    const colX = w * 0.52;
    const colW = w - colX - pad;
    const body = paragraph(ctx, tag, colW, 20 * k, 13 * k, 5, (s) => `400 ${s}px ${FONT.sans}`);
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${body.size}px ${FONT.sans}`;
    let ty = hy + hs * 0.12;
    for (const line of body.lines) {
      ctx.fillText(line, colX, ty);
      ty += body.lh;
    }
  } else if (tag && c.mode === "portrait") {
    const body = paragraph(ctx, tag, w - pad * 2, 18 * k, 13 * k, 4, (s) => `400 ${s}px ${FONT.sans}`);
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${body.size}px ${FONT.sans}`;
    let ty = labelY + 28 * k;
    for (const line of body.lines) {
      ctx.fillText(line, pad, ty);
      ty += body.lh;
    }
  }

  if (rest.length) {
    drawStatsRow(c, pad, h - pad - 48 * k, w - pad * 2, 18 * k, rest);
  }
}

function split(c: Ctx) {
  const { ctx, w, h, pad, pal, k } = c;
  const name = title(c.doc);
  if (c.mode === "banner") {
    ctx.fillStyle = pal.fg;
    ctx.fillRect(0, 0, w * 0.34, h);
    drawMark(ctx, pad * 0.8, (h - h * 0.5) / 2, h * 0.5, { ...pal, fg: pal.bg, bg: pal.fg }, c.logo, name);
    ctx.fillStyle = pal.bg;
    ctx.font = `400 ${h * 0.22}px ${FONT.serif}`;
    ctx.textBaseline = "middle";
    ctx.fillText(ellipsize(ctx, name, w * 0.28), pad * 0.8 + h * 0.55, h / 2);
    ctx.textBaseline = "top";
    ctx.fillStyle = pal.fg;
    const tag = c.doc.tagline.trim();
    if (tag) {
      ctx.font = `400 ${h * 0.12}px ${FONT.sans}`;
      ctx.fillText(ellipsize(ctx, tag, w * 0.36), w * 0.38, h * 0.28);
    }
    drawStatsRow(c, w * 0.38, h * 0.52, w * 0.56, h * 0.14);
    return;
  }

  if (c.mode === "portrait") {
    ctx.fillStyle = pal.fg;
    ctx.fillRect(0, 0, w, h * 0.38);
    const mark = 72 * k;
    drawMark(ctx, pad, pad, mark, { ...pal, fg: pal.bg, bg: pal.fg }, c.logo, name);
    ctx.fillStyle = pal.bg;
    const { lines, size } = paragraph(
      ctx,
      name,
      w - pad * 2,
      48 * k,
      22 * k,
      3,
      (s) => `400 ${s}px ${FONT.serif}`,
    );
    let y = pad + mark + 20 * k;
    ctx.font = `400 ${size}px ${FONT.serif}`;
    for (const line of lines) {
      ctx.fillText(line, pad, y);
      y += size * 1.08;
    }
    const bodyTop = h * 0.42;
    const tag = c.doc.tagline.trim();
    if (tag) {
      const body = paragraph(ctx, tag, w - pad * 2, 22 * k, 14 * k, 6, (s) => `400 ${s}px ${FONT.sans}`);
      ctx.fillStyle = pal.muted;
      ctx.font = `400 ${body.size}px ${FONT.sans}`;
      let ty = bodyTop;
      for (const line of body.lines) {
        ctx.fillText(line, pad, ty);
        ty += body.size * 1.4;
      }
    }
    drawStatsStack(c, pad, h - pad - liveStats(c.doc.stats).length * 44 * k, w - pad * 2, 20 * k);
    return;
  }

  const left = w * 0.38;
  ctx.fillStyle = pal.fg;
  ctx.fillRect(0, 0, left, h);
  const mark = 64 * k;
  drawMark(ctx, pad, pad, mark, { ...pal, fg: pal.bg, bg: pal.fg }, c.logo, name);
  ctx.fillStyle = pal.bg;
  const { lines, size } = paragraph(
    ctx,
    name,
    left - pad * 2,
    44 * k,
    22 * k,
    4,
    (s) => `400 ${s}px ${FONT.serif}`,
  );
  let y = pad + mark + 28 * k;
  ctx.font = `400 ${size}px ${FONT.serif}`;
  for (const line of lines) {
    ctx.fillText(line, pad, y);
    y += size * 1.08;
  }
  const meta = metaLine(c);
  if (meta) {
    ctx.fillStyle = pal.bg;
    ctx.globalAlpha = 0.7;
    ctx.font = `400 ${12 * k}px ${FONT.mono}`;
    ctx.fillText(ellipsize(ctx, meta, left - pad * 2), pad, h - pad);
    ctx.globalAlpha = 1;
  }

  const rx = left + pad;
  const rw = w - left - pad * 2;
  const tag = c.doc.tagline.trim();
  let ty = pad;
  if (tag) {
    const body = paragraph(ctx, tag, rw, 28 * k, 16 * k, 5, (s) => `400 ${s}px ${FONT.sans}`);
    ctx.fillStyle = pal.fg;
    ctx.font = `400 ${body.size}px ${FONT.sans}`;
    for (const line of body.lines) {
      ctx.fillText(line, rx, ty);
      ty += body.size * 1.35;
    }
  }
  ty += 28 * k;
  hairline(ctx, rx, ty, rw, pal);
  ty += 28 * k;
  drawStatsStack(c, rx, ty, rw, 22 * k);
}

function terminal(c: Ctx) {
  const { ctx, w, h, pad, pal, k } = c;
  const inset = c.mode === "banner" ? pad * 0.5 : pad * 0.7;
  const r = 14 * k;
  ctx.fillStyle = pal.rule;
  fillRound(ctx, inset, inset, w - inset * 2, h - inset * 2, r);
  ctx.fillStyle = pal.bg;
  fillRound(ctx, inset + 1, inset + 1, w - inset * 2 - 2, h - inset * 2 - 2, r - 1);

  const barH = c.mode === "banner" ? h * 0.28 : 36 * k;
  const dots = c.mode === "banner" ? h * 0.1 : 8 * k;
  const dy = inset + (barH - dots) / 2;
  const colors = [pal.muted, pal.muted, pal.fg];
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(inset + 22 * k + i * 16 * k, dy + dots / 2, dots / 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = pal.muted;
  ctx.font = `400 ${c.mode === "banner" ? h * 0.12 : 12 * k}px ${FONT.mono}`;
  ctx.textBaseline = "middle";
  ctx.fillText(`${slugName(c.doc.name)}.sh`, inset + 70 * k, inset + barH / 2);
  ctx.textBaseline = "top";

  const lines: { color: string; text: string }[] = [
    { color: pal.muted, text: `$ launch --product` },
    { color: pal.fg, text: title(c.doc) },
  ];
  const tag = c.doc.tagline.trim();
  if (tag) lines.push({ color: pal.muted, text: `# ${tag}` });
  for (const st of liveStats(c.doc.stats)) {
    lines.push({
      color: pal.fg,
      text: `${(st.label || "stat").toLowerCase()}: ${st.value || "—"}`,
    });
  }
  const meta = metaLine(c);
  if (meta) lines.push({ color: pal.muted, text: meta });

  const fontSize = c.mode === "banner" ? h * 0.14 : c.mode === "portrait" ? 22 * k : 18 * k;
  let y = inset + barH + (c.mode === "banner" ? 8 : 22 * k);
  const maxW = w - inset * 2 - 28 * k;
  for (const line of lines) {
    ctx.fillStyle = line.color;
    ctx.font = `${line.text.startsWith("$") || line.text.startsWith("#") ? "400" : "500"} ${fontSize}px ${FONT.mono}`;
    const wrapped = wrap(ctx, line.text, maxW).slice(0, c.mode === "portrait" ? 4 : 2);
    for (const wl of wrapped) {
      ctx.fillText(wl, inset + 22 * k, y);
      y += fontSize * 1.45;
      if (y > h - inset - fontSize) return;
    }
  }
}

function slugName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "product";
}

function poster(c: Ctx) {
  const { ctx, w, h, pad, pal, k } = c;
  const name = title(c.doc);
  typeReset(ctx);

  if (c.mode === "banner") {
    const size = fitOne(ctx, name, w - pad * 2, h * 0.55, 22, (s) => `800 ${s}px ${FONT.poster}`);
    ctx.fillStyle = pal.fg;
    ctx.font = `800 ${size}px ${FONT.poster}`;
    ctx.textBaseline = "middle";
    ctx.fillText(ellipsize(ctx, name, w - pad * 2), pad, h * 0.46);
    typeReset(ctx);
    return;
  }

  const footer = 64 * k;
  const titleMaxW = w - pad * 2;
  const titleMaxH = Math.max(48, h - pad - footer);
  const { lines, size, lh } = paragraph(
    ctx,
    name,
    titleMaxW,
    c.mode === "portrait" ? w * 0.2 : h * 0.22,
    28 * k,
    c.mode === "portrait" ? 5 : 3,
    (s) => `800 ${s}px ${FONT.poster}`,
    true,
    titleMaxH,
  );
  ctx.fillStyle = pal.fg;
  ctx.font = `800 ${size}px ${FONT.poster}`;
  let y = pad;
  for (const line of lines) {
    ctx.fillText(ellipsize(ctx, line, titleMaxW), pad, y);
    y += lh;
  }

  const tag = c.doc.tagline.trim();
  const stats = liveStats(c.doc.stats);
  ctx.fillStyle = pal.muted;
  ctx.font = `400 ${14 * k}px ${FONT.sans}`;
  if (tag) ctx.fillText(ellipsize(ctx, tag, w * 0.62), pad, h - pad - (stats[0] ? 4 * k : 0));
  if (stats[0]) {
    ctx.textAlign = "right";
    ctx.fillStyle = pal.fg;
    ctx.font = `700 ${22 * k}px ${FONT.sans}`;
    ctx.fillText(ellipsize(ctx, stats[0].value, w * 0.3), w - pad, h - pad - 22 * k);
    ctx.fillStyle = pal.muted;
    ctx.font = `500 ${11 * k}px ${FONT.sans}`;
    ctx.fillText(ellipsize(ctx, (stats[0].label || "").toUpperCase(), w * 0.3), w - pad, h - pad);
    typeReset(ctx);
  }
}

function quiet(c: Ctx) {
  const { ctx, w, h, pad, pal, k } = c;
  const name = title(c.doc);
  const inner = c.mode === "banner" ? pad : pad * 1.15;
  kicker(c, inner, c.mode === "banner" ? h * 0.22 : inner, c.mode === "banner" ? h * 0.1 : 11 * k);
  const ns = fitOne(
    ctx,
    name,
    w - inner * 2,
    c.mode === "banner" ? h * 0.32 : c.mode === "portrait" ? 56 * k : 52 * k,
    20,
    (s) => `400 ${s}px ${FONT.serif}`,
  );
  ctx.fillStyle = pal.fg;
  ctx.font = `400 ${ns}px ${FONT.serif}`;
  ctx.fillText(name, inner, c.mode === "banner" ? h * 0.4 : inner + 36 * k);
  const tag = c.doc.tagline.trim();
  if (tag && c.mode !== "banner") {
    const body = paragraph(ctx, tag, w * 0.62, 18 * k, 13 * k, 4, (s) => `400 ${s}px ${FONT.sans}`);
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${body.size}px ${FONT.sans}`;
    let y = inner + 36 * k + ns + 20 * k;
    for (const line of body.lines) {
      ctx.fillText(line, inner, y);
      y += body.size * 1.4;
    }
  }
  const meta = metaLine(c);
  ctx.fillStyle = pal.muted;
  ctx.font = `400 ${12 * k}px ${FONT.mono}`;
  ctx.fillText(meta || displayUrl(c.doc.url), inner, h - inner);
}

function ledger(c: Ctx) {
  const { ctx, w, h, pad, pal, k } = c;
  const name = title(c.doc);
  ctx.fillStyle = pal.muted;
  ctx.font = `500 ${c.mode === "banner" ? h * 0.1 : 11 * k}px ${FONT.sans}`;
  ctx.fillText("VOL. 01    ·    LAUNCH", pad, c.mode === "banner" ? h * 0.18 : pad);
  hairline(ctx, pad, c.mode === "banner" ? h * 0.36 : pad + 22 * k, w - pad * 2, pal);

  if (c.mode === "banner") {
    ctx.fillStyle = pal.fg;
    ctx.font = `400 ${h * 0.28}px ${FONT.serif}`;
    ctx.textBaseline = "middle";
    ctx.fillText(ellipsize(ctx, name, w * 0.5), pad, h * 0.62);
    ctx.textBaseline = "top";
    drawStatsRow(c, w * 0.55, h * 0.4, w * 0.4, h * 0.16);
    return;
  }

  const { lines, size } = paragraph(
    ctx,
    name,
    w - pad * 2,
    c.mode === "portrait" ? 48 * k : 44 * k,
    22 * k,
    3,
    (s) => `400 ${s}px ${FONT.serif}`,
  );
  let y = pad + 40 * k;
  ctx.fillStyle = pal.fg;
  ctx.font = `400 ${size}px ${FONT.serif}`;
  for (const line of lines) {
    ctx.fillText(line, pad, y);
    y += size * 1.08;
  }
  y += 18 * k;
  hairline(ctx, pad, y, w - pad * 2, pal);
  y += 24 * k;

  const colW = (w - pad * 2 - 24 * k) / 2;
  const tag = c.doc.tagline.trim();
  if (tag) {
    const body = paragraph(ctx, tag, colW, 16 * k, 12 * k, 8, (s) => `400 ${s}px ${FONT.sans}`);
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${body.size}px ${FONT.sans}`;
    let ty = y;
    for (const line of body.lines) {
      ctx.fillText(line, pad, ty);
      ty += body.size * 1.4;
    }
  }
  drawStatsStack(c, pad + colW + 24 * k, y, colW, 18 * k);
  const meta = metaLine(c);
  if (meta) {
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${11 * k}px ${FONT.mono}`;
    ctx.fillText(meta, pad, h - pad);
  }
}

function frame(c: Ctx) {
  const { ctx, w, h, pad, pal, k } = c;
  const name = title(c.doc);

  if (c.mode === "banner") {
    if (c.shot) coverImage(ctx, c.shot, 0, 0, w, h);
    else ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = pal.bg;
    ctx.globalAlpha = c.shot ? 0.72 : 1;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    const mark = h * 0.46;
    drawMark(ctx, pad, (h - mark) / 2, mark, pal, c.logo, name);
    ctx.fillStyle = pal.fg;
    ctx.font = `600 ${h * 0.2}px ${FONT.sans}`;
    ctx.textBaseline = "middle";
    ctx.fillText(ellipsize(ctx, name, w * 0.5), pad + mark + pad * 0.6, h * 0.42);
    ctx.textBaseline = "top";
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${h * 0.1}px ${FONT.sans}`;
    ctx.fillText(ellipsize(ctx, c.doc.tagline.trim(), w * 0.5), pad + mark + pad * 0.6, h * 0.58);
    return;
  }

  const caption = c.mode === "portrait" ? h * 0.32 : h * 0.3;
  const imgH = h - caption;

  if (c.shot) {
    clipRound(ctx, 0, 0, w, imgH, 0, () => coverImage(ctx, c.shot!, 0, 0, w, imgH));
  } else {
    ctx.fillStyle = pal.rule;
    ctx.fillRect(0, 0, w, imgH);
    const mark = 64 * k;
    drawMark(ctx, (w - mark) / 2, imgH / 2 - mark * 0.7, mark, pal, c.logo, name);
    ctx.fillStyle = pal.muted;
    ctx.font = `400 ${14 * k}px ${FONT.sans}`;
    ctx.textAlign = "center";
    ctx.fillText("Add a screenshot", w / 2, imgH / 2 + mark * 0.55);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, imgH, w, caption);
  const cy = imgH + 22 * k;
  const mark = 36 * k;
  if (c.mode !== "portrait") {
    drawMark(ctx, pad, imgH + (caption - mark) / 2, mark, pal, c.logo, name);
  }
  const tx = c.mode === "portrait" ? pad : pad + mark + 14 * k;
  ctx.fillStyle = pal.fg;
  ctx.font = `600 ${18 * k}px ${FONT.sans}`;
  ctx.fillText(ellipsize(ctx, name, w * 0.4), tx, cy);
  ctx.fillStyle = pal.muted;
  ctx.font = `400 ${13 * k}px ${FONT.sans}`;
  ctx.fillText(ellipsize(ctx, c.doc.tagline.trim(), w * 0.4), tx, cy + 22 * k);
  drawStatsRow(c, w * 0.52, imgH + 22 * k, w * 0.44, 16 * k);
}

const TEMPLATES: Record<CardDoc["templateId"], (c: Ctx) => void> = {
  editorial,
  flex,
  split,
  terminal,
  poster,
  quiet,
  ledger,
  frame,
};

function paint(c: Ctx) {
  const { ctx, w, h } = c;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.fillStyle = c.pal.bg;
  ctx.fillRect(0, 0, w, h);
  typeReset(ctx);
  TEMPLATES[c.doc.templateId](c);
  ctx.restore();
  ctx.strokeStyle = c.pal.rule;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

export async function renderCard(
  canvas: HTMLCanvasElement,
  doc: CardDoc,
  opts: RenderOpts = {},
) {
  const size = sizeOf(doc.sizeId);
  const pal = palette(doc.paletteId);
  const scale = opts.scale ?? 2;
  const w = size.w;
  const h = size.h;
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let logo: HTMLImageElement | null = null;
  let shot: HTMLImageElement | null = null;
  if (doc.logoDataUrl) {
    try {
      logo = await loadImage(doc.logoDataUrl);
    } catch {
      logo = null;
    }
  }
  if (doc.shotDataUrl) {
    try {
      shot = await loadImage(doc.shotDataUrl);
    } catch {
      shot = null;
    }
  }

  const k = Math.min(w / 1200, h / 630);
  const pad = Math.round(Math.min(w, h) * (modeOf(w, h) === "banner" ? 0.08 : 0.075));
  const c: Ctx = {
    ctx,
    w,
    h,
    k,
    pad,
    pal,
    doc,
    logo,
    shot,
    mode: modeOf(w, h),
  };
  paint(c);
}

export async function cardToBlob(doc: CardDoc, sizeId?: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await renderCard(canvas, { ...doc, sizeId: sizeId ?? doc.sizeId }, { scale: 2 });
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Could not export PNG");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
