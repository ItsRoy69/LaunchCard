import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Check, Copy, Download, Layers } from "lucide-react";
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

export function Studio() {
  const doc = useCardStore(useShallow(selectDoc));
  const [busy, setBusy] = useState<"png" | "copy" | "pack" | null>(null);

  useEffect(() => {
    void useCardStore.persist.rehydrate();
  }, []);

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

      // Prefer modern ClipboardItem when available.
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

      // Fallback: download the PNG and tell the user why.
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
    try {
      const files = [];
      for (const size of SIZES) {
        files.push({ name: filename(size.id), blob: await exportOne(size.id) });
      }
      const pack = await zipBlobs(files);
      downloadBlob(pack, `${slugify(doc.name)}-launch-assets.zip`);
      toast.success("Launch asset pack saved");
    } catch {
      toast.error("Pack export failed");
    } finally {
      setBusy(null);
    }
  };

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
            className="hidden md:inline-flex"
          >
            <Layers className="size-3.5" />
            Pack
          </Button>
          <Button type="button" size="sm" onClick={onDownload} disabled={busy !== null}>
            <Download className="size-3.5" />
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
