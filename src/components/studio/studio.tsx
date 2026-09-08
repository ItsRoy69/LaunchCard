import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Check, Copy, Download, Layers, Loader2, Redo2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { SIZES, slugify } from "@/lib/cards/catalog";
import { ensureCardFonts } from "@/lib/cards/fonts";
import { cardToBlob, downloadBlob, renderCard } from "@/lib/cards/render";
import { zipBlobs } from "@/lib/cards/zip";
import { selectDoc, useCardStore } from "@/lib/cards/store";
import { Button } from "@/components/ui/button";
import { CanvasStage } from "./canvas-stage";
import { FieldPanel } from "./field-panel";
import { TemplateRail } from "./template-rail";

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect
        x="2.5"
        y="5.5"
        width="13"
        height="9"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="8.5" y="9.5" width="13" height="9" rx="1.6" fill="currentColor" />
    </svg>
  );
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export function Studio() {
  const doc = useCardStore(useShallow(selectDoc));
  const hydrateAssets = useCardStore((s) => s.hydrateAssets);
  const undo = useCardStore((s) => s.undo);
  const redo = useCardStore((s) => s.redo);
  const pastLen = useCardStore((s) => s.past.length);
  const futureLen = useCardStore((s) => s.future.length);
  const [busy, setBusy] = useState<"png" | "copy" | "pack" | null>(null);
  const [packProgress, setPackProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    void (async () => {
      await useCardStore.persist.rehydrate();
      await hydrateAssets();
    })();
  }, [hydrateAssets]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      // Let the browser handle native text undo inside inputs when possible,
      // but still support app-level undo when not mid-composition.
      if (key === "z" && !e.shiftKey) {
        if (isTypingTarget(e.target) && !e.altKey) {
          // App history still useful for non-text edits; allow both.
        }
        e.preventDefault();
        undo();
        return;
      }

      if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (key === "s") {
        e.preventDefault();
        void onDownload();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // onDownload is stable enough via closure over latest doc/busy; rebind each render is fine.
  });

  const filename = (sizeId = doc.sizeId) =>
    `${slugify(doc.name)}-${sizeId}-${doc.templateId}.png`;

  const exportOne = async (sizeId?: string) => {
    await ensureCardFonts();
    return cardToBlob(doc, sizeId);
  };

  const onDownload = async () => {
    setBusy("png");
    try {
      const blob = await exportOne();
      downloadBlob(blob, filename());
      toast.success("PNG saved");
    } catch {
      toast.error("Could not export PNG");
    } finally {
      setBusy(null);
    }
  };

  const onCopy = async () => {
    setBusy("copy");
    try {
      await ensureCardFonts();
      const canvas = document.createElement("canvas");
      await renderCard(canvas, doc);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("blob");

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          toast.success("Copied to clipboard");
          return;
        } catch {
          // Fall through to download fallback.
        }
      }

      downloadBlob(blob, filename());
      toast.message("Clipboard blocked", {
        description: "PNG downloaded instead. You can paste from Downloads.",
      });
    } catch {
      try {
        const blob = await exportOne();
        downloadBlob(blob, filename());
        toast.message("Clipboard blocked", {
          description: "PNG downloaded instead.",
        });
      } catch {
        toast.error("Could not copy or download");
      }
    } finally {
      setBusy(null);
    }
  };

  const onPack = async () => {
    setBusy("pack");
    const total = SIZES.length;
    setPackProgress({ done: 0, total });
    const toastId = toast.loading(`Exporting 0/${total}…`);
    try {
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < SIZES.length; i++) {
        const size = SIZES[i];
        files.push({ name: filename(size.id), blob: await exportOne(size.id) });
        const done = i + 1;
        setPackProgress({ done, total });
        toast.loading(`Exporting ${done}/${total}…`, { id: toastId });
      }
      const pack = await zipBlobs(files);
      downloadBlob(pack, `${slugify(doc.name)}-launch-assets.zip`);
      toast.success("Launch asset pack saved", { id: toastId });
    } catch {
      toast.error("Pack export failed", { id: toastId });
    } finally {
      setBusy(null);
      setPackProgress(null);
    }
  };

  const packLabel =
    busy === "pack" && packProgress
      ? `${packProgress.done}/${packProgress.total}`
      : "Pack";

  const canUndo = pastLen > 0;
  const canRedo = futureLen > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg lg:h-dvh lg:overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 md:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Mark className="size-6 text-primary" />
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight tracking-tight text-fg">
              LaunchCard
            </p>
            <p className="truncate text-xs text-subtle">On-device drafts. No account required.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            disabled={!canUndo || busy !== null}
            aria-label="Undo"
            title="Undo (⌘Z)"
          >
            <Undo2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={redo}
            disabled={!canRedo || busy !== null}
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="size-3.5" />
          </Button>
          <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onCopy}
            disabled={busy !== null}
            className="sm:hidden"
            aria-label="Copy image"
          >
            {busy === "copy" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCopy}
            disabled={busy !== null}
            className="hidden sm:inline-flex"
          >
            {busy === "copy" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Copy
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onPack}
            disabled={busy !== null}
            className="hidden min-w-[5.5rem] md:inline-flex"
            aria-live="polite"
          >
            {busy === "pack" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Layers className="size-3.5" />
            )}
            {packLabel}
          </Button>
          <Button type="button" size="sm" onClick={onDownload} disabled={busy !== null}>
            {busy === "png" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            PNG
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
        <FieldPanel />
        <div className="flex min-w-0 flex-none flex-col lg:min-h-0 lg:flex-1">
          <CanvasStage />
          <TemplateRail />
        </div>
      </div>
    </div>
  );
}
