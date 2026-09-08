import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Check,
  Copy,
  Download,
  Layers,
  Link2,
  Loader2,
  Redo2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { SIZES, slugify } from "@/lib/cards/catalog";
import { ensureCardFonts } from "@/lib/cards/fonts";
import { cardToBlob, downloadBlob, renderCard } from "@/lib/cards/render";
import { buildShareUrl, readShareFromLocation } from "@/lib/cards/share";
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

export function Studio() {
  const doc = useCardStore(useShallow(selectDoc));
  const hydrateAssets = useCardStore((s) => s.hydrateAssets);
  const applyShare = useCardStore((s) => s.applyShare);
  const undo = useCardStore((s) => s.undo);
  const redo = useCardStore((s) => s.redo);
  const pastLen = useCardStore((s) => s.past.length);
  const futureLen = useCardStore((s) => s.future.length);
  const [busy, setBusy] = useState<"png" | "copy" | "pack" | "share" | null>(null);
  const [packProgress, setPackProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void (async () => {
      await useCardStore.persist.rehydrate();
      const shared = readShareFromLocation();
      if (shared) {
        applyShare(shared);
        toast.message("Shared draft loaded", {
          description: "Text and layout only — add your own logo or screenshot.",
        });
      } else {
        await hydrateAssets();
      }
    })();
  }, [applyShare, hydrateAssets]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === "z" && !e.shiftKey) {
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

  const onShare = async () => {
    setBusy("share");
    try {
      const url = buildShareUrl(doc);
      // Keep hash in the bar for moderate-length links only.
      if (typeof history !== "undefined" && url.length <= 2000) {
        history.replaceState(null, "", url);
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied", {
          description: "Text and layout only — images stay on each device.",
        });
      } else {
        toast.message("Share link ready", { description: url });
      }
    } catch {
      toast.error("Could not copy share link");
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
            onClick={onShare}
            disabled={busy !== null}
            aria-label="Copy share link"
            title="Copy share link"
          >
            {busy === "share" ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
          </Button>
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
            size="icon-sm"
            onClick={onPack}
            disabled={busy !== null}
            className="md:hidden"
            aria-label="Export asset pack"
            title="Export all sizes as ZIP"
          >
            {busy === "pack" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Layers className="size-3.5" />
            )}
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
