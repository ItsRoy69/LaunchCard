import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { SIZES, slugify } from "@/lib/cards/catalog";
import { ensureCardFonts } from "@/lib/cards/fonts";
import { renderCard } from "@/lib/cards/render";
import { selectDoc, useCardStore } from "@/lib/cards/store";
import { cn } from "@/lib/utils";

function CanvasSkeleton({ landscape }: { landscape: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-surface" aria-hidden="true">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface via-well to-surface" />
      <div
        className={cn(
          "absolute inset-0 flex p-[6%]",
          landscape ? "flex-row items-center gap-[3%]" : "flex-col justify-between",
        )}
      >
        {landscape ? (
          <>
            <div className="size-[12%] max-h-14 max-w-14 shrink-0 rounded-md bg-border/70" />
            <div className="flex min-w-0 flex-1 flex-col gap-[2%]">
              <div className="h-[18%] max-h-4 w-[40%] rounded-sm bg-border/80" />
              <div className="h-[12%] max-h-3 w-[55%] rounded-sm bg-border/55" />
            </div>
            <div className="flex shrink-0 gap-[4%]">
              <div className="h-5 w-8 rounded-sm bg-border/65" />
              <div className="h-5 w-8 rounded-sm bg-border/50" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="h-2.5 w-[18%] rounded-sm bg-border/75" />
              <div className="size-8 rounded-md bg-border/70" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-[55%] rounded-sm bg-border/80" />
              <div className="h-3 w-[75%] rounded-sm bg-border/60" />
              <div className="h-3 w-[40%] rounded-sm bg-border/50" />
            </div>
            <div className="flex gap-4">
              <div className="h-5 w-10 rounded-sm bg-border/70" />
              <div className="h-5 w-10 rounded-sm bg-border/60" />
              <div className="h-5 w-10 rounded-sm bg-border/50" />
            </div>
          </>
        )}
      </div>
    </div>
  );
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

  const landscape = size.w >= size.h;

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
            {!ready && <CanvasSkeleton landscape={landscape} />}
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
