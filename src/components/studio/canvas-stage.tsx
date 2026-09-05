import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { SIZES, slugify } from "@/lib/cards/catalog";
import { ensureCardFonts } from "@/lib/cards/fonts";
import { renderCard } from "@/lib/cards/render";
import { selectDoc, useCardStore } from "@/lib/cards/store";

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const doc = useCardStore(useShallow(selectDoc));
  const size = SIZES.find((s) => s.id === doc.sizeId) ?? SIZES[0];

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    (async () => {
      await ensureCardFonts();
      if (cancelled || !canvasRef.current) return;
      await renderCard(canvasRef.current, doc);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    const fit = () => {
      const maxW = Math.max(1, frame.clientWidth);
      const maxH = Math.max(1, frame.clientHeight);
      const scale = Math.min(maxW / size.w, maxH / size.h);
      canvas.style.width = `${Math.round(size.w * scale)}px`;
      canvas.style.height = `${Math.round(size.h * scale)}px`;
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
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full bg-surface"
          aria-label={`${doc.name || "Untitled"} ${size.label} preview`}
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
