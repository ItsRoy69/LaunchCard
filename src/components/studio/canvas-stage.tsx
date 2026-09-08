import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { SIZES, slugify } from "@/lib/cards/catalog";
import { ensureCardFonts } from "@/lib/cards/fonts";
import { renderCard } from "@/lib/cards/render";
import { selectDoc, useCardStore } from "@/lib/cards/store";
import { cn } from "@/lib/utils";

function CanvasSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm border border-border bg-surface",
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface via-well to-surface" />
      <div className="absolute inset-0 flex flex-col justify-between p-[8%]">
        <div className="flex items-start justify-between gap-3">
          <div className="h-3 w-16 rounded-sm bg-border/80" />
          <div className="size-8 rounded-md bg-border/70" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/5 max-w-[70%] rounded-sm bg-border/80" />
          <div className="h-3 w-4/5 max-w-[85%] rounded-sm bg-border/60" />
          <div className="h-3 w-2/5 max-w-[45%] rounded-sm bg-border/50" />
        </div>
        <div className="flex gap-4">
          <div className="h-6 w-12 rounded-sm bg-border/70" />
          <div className="h-6 w-12 rounded-sm bg-border/60" />
          <div className="h-6 w-12 rounded-sm bg-border/50" />
        </div>
      </div>
    </div>
  );
}

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const renderTokenRef = useRef(0);
  const [ready, setReady] = useState(false);
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
        // Keep previous frame if any; skeleton will hide once ready flips or on next success.
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
      const w = Math.round(size.w * scale);
      const h = Math.round(size.h * scale);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [size.w, size.h]);

  return (
    <div className="flex h-64 shrink-0 flex-col lg:h-auto lg:min-h-0 lg:flex-1">
      <div
        ref={frameRef}
        className="studio-well relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden p-3 md:p-8"
      >
        {!ready && (
          <CanvasSkeleton
            className="absolute max-h-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] md:max-h-[calc(100%-4rem)] md:max-w-[calc(100%-4rem)]"
            style={
              {
                aspectRatio: `${size.w} / ${size.h}`,
                width: "min(100%, 720px)",
              } as React.CSSProperties
            }
          />
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
      <p className="border-t border-border px-4 py-2 text-center font-mono text-xs text-subtle">
        {slugify(doc.name)}-{size.id}-{doc.templateId}.png
        <span className="mx-2 text-border-strong">/</span>
        {size.w}×{size.h} @2x
      </p>
    </div>
  );
}
