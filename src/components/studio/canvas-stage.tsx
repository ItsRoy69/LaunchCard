import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { SIZES, slugify } from "@/lib/cards/catalog";
import { ensureCardFonts } from "@/lib/cards/fonts";
import { renderCard } from "@/lib/cards/render";
import { selectDoc, useCardStore } from "@/lib/cards/store";
import { cn } from "@/lib/utils";

function CanvasSkeleton({
  width,
  height,
  sizeId,
}: {
  width: number;
  height: number;
  sizeId: string;
}) {
  // Layout hints scale with the fitted box so bars match the card proportions.
  const k = Math.min(width / 400, height / 220, 1.4);
  const isBanner = height / Math.max(width, 1) < 0.42;
  const isPortrait = height / Math.max(width, 1) > 1.15;

  return (
    <div
      className="relative overflow-hidden rounded-sm border border-border bg-surface"
      style={{ width, height }}
      aria-hidden="true"
      data-size={sizeId}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface via-well to-surface" />
      <div
        className={cn(
          "absolute inset-0 flex",
          isBanner ? "flex-row items-center" : "flex-col justify-between",
        )}
        style={{
          padding: Math.max(10, 18 * k),
          gap: Math.max(8, 12 * k),
        }}
      >
        {isBanner ? (
          <>
            <div
              className="shrink-0 rounded-md bg-border/70"
              style={{ width: 28 * k, height: 28 * k }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div
                className="rounded-sm bg-border/80"
                style={{ height: 10 * k, width: "45%" }}
              />
              <div
                className="rounded-sm bg-border/55"
                style={{ height: 7 * k, width: "60%" }}
              />
            </div>
            <div className="flex shrink-0 gap-3">
              <div
                className="rounded-sm bg-border/65"
                style={{ height: 16 * k, width: 28 * k }}
              />
              <div
                className="rounded-sm bg-border/55"
                style={{ height: 16 * k, width: 28 * k }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div
                className="rounded-sm bg-border/75"
                style={{ height: 8 * k, width: 48 * k }}
              />
              <div
                className="rounded-md bg-border/70"
                style={{ width: 28 * k, height: 28 * k }}
              />
            </div>
            <div className="space-y-2">
              <div
                className="rounded-sm bg-border/80"
                style={{
                  height: isPortrait ? 14 * k : 18 * k,
                  width: isPortrait ? "70%" : "55%",
                }}
              />
              <div
                className="rounded-sm bg-border/60"
                style={{ height: 9 * k, width: "78%" }}
              />
              <div
                className="rounded-sm bg-border/50"
                style={{ height: 9 * k, width: "42%" }}
              />
            </div>
            <div className="flex gap-4">
              <div
                className="rounded-sm bg-border/70"
                style={{ height: 18 * k, width: 36 * k }}
              />
              <div
                className="rounded-sm bg-border/60"
                style={{ height: 18 * k, width: 36 * k }}
              />
              <div
                className="rounded-sm bg-border/50"
                style={{ height: 18 * k, width: 36 * k }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const renderTokenRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [display, setDisplay] = useState({ w: 0, h: 0 });
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
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    const fit = () => {
      const maxW = Math.max(1, frame.clientWidth);
      const maxH = Math.max(1, frame.clientHeight);
      const scale = Math.min(maxW / size.w, maxH / size.h);
      const w = Math.max(1, Math.round(size.w * scale));
      const h = Math.max(1, Math.round(size.h * scale));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      setDisplay({ w, h });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [size.w, size.h]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={frameRef}
        className="studio-well relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 md:p-8"
      >
        {!ready && display.w > 0 && display.h > 0 && (
          <CanvasSkeleton width={display.w} height={display.h} sizeId={size.id} />
        )}
        <canvas
          ref={canvasRef}
          className={cn(
            "max-h-full max-w-full bg-surface transition-opacity duration-fast",
            ready ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-label={`${doc.name || "Untitled"} ${size.label} preview`}
          aria-busy={!ready}
        />
      </div>
      <p className="shrink-0 border-t border-border px-4 py-2 text-center font-mono text-xs text-subtle">
        {slugify(doc.name)}-{size.id}-{doc.templateId}.png
        <span className="mx-2 text-border-strong">/</span>
        {size.w}×{size.h} @2x
      </p>
    </div>
  );
}
