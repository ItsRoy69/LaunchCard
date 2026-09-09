import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { SIZES, slugify } from "@/lib/cards/catalog";
import { ensureCardFonts } from "@/lib/cards/fonts";
import { renderCard } from "@/lib/cards/render";
import { selectDoc, useCardStore } from "@/lib/cards/store";
import { cn } from "@/lib/utils";

/** Placeholder chrome that mirrors a typical card: mark, title, body, stats. */
function CanvasSkeleton({ mode }: { mode: "banner" | "landscape" | "portrait" }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-surface" aria-hidden="true">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface via-well to-surface" />

      {mode === "banner" && (
        <>
          {/* Mark */}
          <div
            className="absolute rounded-md bg-border/70"
            style={{ left: "4%", top: "22%", width: "10%", height: "56%" }}
          />
          {/* Title + tagline */}
          <div
            className="absolute rounded-sm bg-border/80"
            style={{ left: "18%", top: "30%", width: "28%", height: "18%" }}
          />
          <div
            className="absolute rounded-sm bg-border/55"
            style={{ left: "18%", top: "55%", width: "22%", height: "12%" }}
          />
          {/* Stats */}
          <div
            className="absolute rounded-sm bg-border/65"
            style={{ left: "58%", top: "32%", width: "10%", height: "36%" }}
          />
          <div
            className="absolute rounded-sm bg-border/55"
            style={{ left: "72%", top: "32%", width: "10%", height: "36%" }}
          />
          <div
            className="absolute rounded-sm bg-border/45"
            style={{ left: "86%", top: "32%", width: "10%", height: "36%" }}
          />
        </>
      )}

      {mode === "landscape" && (
        <>
          {/* Kicker */}
          <div
            className="absolute rounded-sm bg-border/60"
            style={{ left: "5%", top: "8%", width: "14%", height: "3.5%" }}
          />
          {/* Mark top-right */}
          <div
            className="absolute rounded-md bg-border/70"
            style={{ right: "5%", top: "7%", width: "7%", aspectRatio: "1" }}
          />
          {/* Title block */}
          <div
            className="absolute rounded-sm bg-border/85"
            style={{ left: "5%", top: "18%", width: "48%", height: "10%" }}
          />
          <div
            className="absolute rounded-sm bg-border/75"
            style={{ left: "5%", top: "31%", width: "36%", height: "10%" }}
          />
          {/* Rule */}
          <div
            className="absolute bg-border/40"
            style={{ left: "5%", top: "48%", width: "90%", height: "1px" }}
          />
          {/* Tagline */}
          <div
            className="absolute rounded-sm bg-border/55"
            style={{ left: "5%", top: "54%", width: "62%", height: "5%" }}
          />
          <div
            className="absolute rounded-sm bg-border/45"
            style={{ left: "5%", top: "62%", width: "48%", height: "5%" }}
          />
          {/* Stats row */}
          <div
            className="absolute rounded-sm bg-border/70"
            style={{ left: "5%", top: "78%", width: "12%", height: "10%" }}
          />
          <div
            className="absolute rounded-sm bg-border/60"
            style={{ left: "22%", top: "78%", width: "12%", height: "10%" }}
          />
          <div
            className="absolute rounded-sm bg-border/50"
            style={{ left: "39%", top: "78%", width: "12%", height: "10%" }}
          />
          {/* Meta */}
          <div
            className="absolute rounded-sm bg-border/40"
            style={{ left: "5%", top: "92%", width: "24%", height: "3%" }}
          />
        </>
      )}

      {mode === "portrait" && (
        <>
          <div
            className="absolute rounded-sm bg-border/60"
            style={{ left: "7%", top: "5%", width: "22%", height: "2.5%" }}
          />
          <div
            className="absolute rounded-md bg-border/70"
            style={{ right: "7%", top: "4%", width: "12%", aspectRatio: "1" }}
          />
          <div
            className="absolute rounded-sm bg-border/85"
            style={{ left: "7%", top: "14%", width: "70%", height: "6%" }}
          />
          <div
            className="absolute rounded-sm bg-border/75"
            style={{ left: "7%", top: "22%", width: "55%", height: "6%" }}
          />
          <div
            className="absolute bg-border/40"
            style={{ left: "7%", top: "32%", width: "86%", height: "1px" }}
          />
          <div
            className="absolute rounded-sm bg-border/55"
            style={{ left: "7%", top: "36%", width: "80%", height: "3.5%" }}
          />
          <div
            className="absolute rounded-sm bg-border/45"
            style={{ left: "7%", top: "42%", width: "65%", height: "3.5%" }}
          />
          <div
            className="absolute rounded-sm bg-border/40"
            style={{ left: "7%", top: "48%", width: "50%", height: "3.5%" }}
          />
          <div
            className="absolute rounded-sm bg-border/70"
            style={{ left: "7%", top: "78%", width: "22%", height: "7%" }}
          />
          <div
            className="absolute rounded-sm bg-border/60"
            style={{ left: "36%", top: "78%", width: "22%", height: "7%" }}
          />
          <div
            className="absolute rounded-sm bg-border/50"
            style={{ left: "65%", top: "78%", width: "22%", height: "7%" }}
          />
          <div
            className="absolute rounded-sm bg-border/40"
            style={{ left: "7%", top: "92%", width: "40%", height: "2.5%" }}
          />
        </>
      )}
    </div>
  );
}

function layoutMode(w: number, h: number): "banner" | "landscape" | "portrait" {
  const r = h / Math.max(w, 1);
  if (r > 1.15) return "portrait";
  if (r < 0.42) return "banner";
  return "landscape";
}

function availableSize(el: HTMLElement) {
  const style = getComputedStyle(el);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  return {
    w: Math.max(1, el.clientWidth - padX),
    h: Math.max(1, el.clientHeight - padY),
  };
}

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const renderTokenRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const doc = useCardStore(useShallow(selectDoc));
  const size = SIZES.find((s) => s.id === doc.sizeId) ?? SIZES[0];

  useEffect(() => {
    const token = ++renderTokenRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setReady(false);

    (async () => {
      try {
        await ensureCardFonts();
        if (token !== renderTokenRef.current) return;

        const next = document.createElement("canvas");
        await renderCard(next, doc);
        if (token !== renderTokenRef.current || !canvasRef.current) return;

        canvas.width = next.width;
        canvas.height = next.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(next, 0, 0);
        setReady(true);
      } catch (err) {
        console.error("[LaunchCard] canvas render failed", err);
        if (token === renderTokenRef.current) setReady(true);
      }
    })();
  }, [doc]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const fit = () => {
      const { w: maxW, h: maxH } = availableSize(frame);
      const scale = Math.min(maxW / size.w, maxH / size.h);
      const w = Math.max(1, Math.round(size.w * scale));
      const h = Math.max(1, Math.round(size.h * scale));
      setBox({ w, h });
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [size.w, size.h]);

  const mode = layoutMode(size.w, size.h);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={frameRef}
        className="studio-well relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 md:p-8"
      >
        {box.w > 0 && box.h > 0 ? (
          <div
            className="relative shrink-0 overflow-hidden rounded-sm border border-border"
            style={{ width: box.w, height: box.h }}
          >
            {!ready && <CanvasSkeleton mode={mode} />}
            <canvas
              ref={canvasRef}
              className={cn(
                "block h-full w-full bg-surface transition-opacity duration-fast",
                ready ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-label={`${doc.name || "Untitled"} ${size.label} preview`}
              aria-busy={!ready}
            />
          </div>
        ) : (
          <canvas ref={canvasRef} className="pointer-events-none absolute opacity-0" aria-hidden />
        )}
      </div>
      <p className="shrink-0 border-t border-border px-4 py-2 text-center font-mono text-xs text-subtle">
        {slugify(doc.name)}-{size.id}-{doc.templateId}.png
        <span className="mx-2 text-border-strong">/</span>
        {size.w}×{size.h} @2x
      </p>
    </div>
  );
}
