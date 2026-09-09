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
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SIZES, slugify } from "@/lib/cards/catalog";
import { ensureCardFonts } from "@/lib/cards/fonts";
import { cardToBlob, downloadBlob, renderCard } from "@/lib/cards/render";
import { buildShareUrl, readShareFromLocation } from "@/lib/cards/share";
import { trackEvent } from "@/lib/cards/telemetry";
import { zipBlobs } from "@/lib/cards/zip";
import { selectDoc, useCardStore } from "@/lib/cards/store";
import { Button } from "@/components/ui/button";
import { CanvasStage } from "./canvas-stage";
import { FieldPanel } from "./field-panel";
import { TemplateRail } from "./template-rail";
import { cn } from "@/lib/utils";

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

const ALL_SIZE_IDS = SIZES.map((s) => s.id);

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
  const [packOpen, setPackOpen] = useState(false);
  const [packSelected, setPackSelected] = useState<string[]>(() => [...ALL_SIZE_IDS]);
  const booted = useRef(false);
  const packDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void (async () => {
      await useCardStore.persist.rehydrate();
      const shared = readShareFromLocation();
      if (shared) {
        applyShare(shared);
        trackEvent("load_share");
        toast.message("Shared draft loaded", {
          description: "Text and layout only — add your own logo or screenshot.",
        });
      } else {
        await hydrateAssets();
      }
    })();
  }, [applyShare, hydrateAssets]);

  useEffect(() => {
    if (!packOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && busy !== "pack") {
        e.preventDefault();
        setPackOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [packOpen, busy]);

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

  const filename = (sizeId = doc.sizeId) => {
    const scale = doc.exportScale === 1 || doc.exportScale === 3 ? doc.exportScale : 2;
    const scaleSuffix = scale === 2 ? "" : `@${scale}x`;
    return `${slugify(doc.name)}-${sizeId}-${doc.templateId}${scaleSuffix}.png`;
  };

  const exportOne = async (sizeId?: string) => {
    await ensureCardFonts();
    return cardToBlob(doc, sizeId);
  };

  const onDownload = async () => {
    setBusy("png");
    try {
      const blob = await exportOne();
      downloadBlob(blob, filename());
      trackEvent("export_png", {
        size: doc.sizeId,
        template: doc.templateId,
        scale: doc.exportScale,
      });
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
          trackEvent("copy_image", {
            size: doc.sizeId,
            template: doc.templateId,
            scale: doc.exportScale,
          });
          toast.success("Copied to clipboard");
          return;
        } catch {
          // Fall through to download fallback.
        }
      }

      downloadBlob(blob, filename());
      trackEvent("copy_image", {
        size: doc.sizeId,
        template: doc.templateId,
        scale: doc.exportScale,
        fallback: true,
      });
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
      if (typeof history !== "undefined" && url.length <= 2000) {
        history.replaceState(null, "", url);
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        trackEvent("share_link", { template: doc.templateId });
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

  const openPack = () => {
    if (busy !== null) return;
    setPackSelected([...ALL_SIZE_IDS]);
    setPackOpen(true);
  };

  const togglePackSize = (id: string) => {
    setPackSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllPack = () => setPackSelected([...ALL_SIZE_IDS]);
  const selectNonePack = () => setPackSelected([]);

  const runPack = async () => {
    const selected = SIZES.filter((s) => packSelected.includes(s.id));
    if (!selected.length) {
      toast.error("Select at least one size");
      return;
    }
    setBusy("pack");
    const total = selected.length;
    setPackProgress({ done: 0, total });
    const toastId = toast.loading(`Exporting 0/${total}…`);
    try {
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < selected.length; i++) {
        const size = selected[i];
        files.push({ name: filename(size.id), blob: await exportOne(size.id) });
        const done = i + 1;
        setPackProgress({ done, total });
        toast.loading(`Exporting ${done}/${total}…`, { id: toastId });
      }
      const pack = await zipBlobs(files);
      downloadBlob(pack, `${slugify(doc.name)}-launch-assets.zip`);
      trackEvent("export_pack", {
        template: doc.templateId,
        count: total,
        scale: doc.exportScale,
        sizes: selected.map((s) => s.id).join(","),
      });
      toast.success(
        total === 1 ? "1 asset saved" : `Launch asset pack saved (${total})`,
        { id: toastId },
      );
      setPackOpen(false);
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
  const selectedCount = packSelected.length;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
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
            onClick={openPack}
            disabled={busy !== null}
            className="md:hidden"
            aria-label="Export asset pack"
            title="Choose sizes and export ZIP"
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
            onClick={openPack}
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

      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-hidden lg:flex-row">
        <FieldPanel />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CanvasStage />
          <TemplateRail />
        </div>
      </div>

      {packOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && busy !== "pack") setPackOpen(false);
          }}
        >
          <div
            ref={packDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pack-dialog-title"
            className="flex max-h-[min(90dvh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-bg shadow-lg"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 id="pack-dialog-title" className="text-sm font-medium text-fg">
                  Export pack
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Choose sizes for the ZIP. Scale follows Style ({doc.exportScale}×).
                </p>
              </div>
              <button
                type="button"
                onClick={() => busy !== "pack" && setPackOpen(false)}
                disabled={busy === "pack"}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-fg disabled:opacity-40"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
              <p className="text-xs text-subtle">
                {selectedCount} of {SIZES.length} selected
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selectAllPack}
                  disabled={busy === "pack"}
                  className="h-7 rounded-md px-2 text-xs text-muted hover:bg-surface hover:text-fg disabled:opacity-40"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={selectNonePack}
                  disabled={busy === "pack"}
                  className="h-7 rounded-md px-2 text-xs text-muted hover:bg-surface hover:text-fg disabled:opacity-40"
                >
                  None
                </button>
              </div>
            </div>

            <ul className="studio-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {SIZES.map((s) => {
                const on = packSelected.includes(s.id);
                const max = 36;
                const scale = max / Math.max(s.w, s.h);
                const bw = Math.max(10, Math.round(s.w * scale));
                const bh = Math.max(10, Math.round(s.h * scale));
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => togglePackSize(s.id)}
                      disabled={busy === "pack"}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors disabled:opacity-50",
                        on ? "bg-surface" : "hover:bg-well",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border",
                          on
                            ? "border-primary bg-primary text-primary-fg"
                            : "border-border bg-bg",
                        )}
                        aria-hidden="true"
                      >
                        {on ? <Check className="size-3" strokeWidth={3} /> : null}
                      </span>
                      <span
                        className="flex shrink-0 items-center justify-center rounded border border-border bg-well"
                        style={{ width: 40, height: 40 }}
                        aria-hidden="true"
                      >
                        <span
                          className="block rounded-[2px] border border-border-strong bg-surface"
                          style={{ width: bw, height: bh }}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {s.label}
                        </span>
                        <span className="block truncate text-xs text-subtle">
                          {s.w}×{s.h} · {s.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPackOpen(false)}
                disabled={busy === "pack"}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void runPack()}
                disabled={busy === "pack" || selectedCount === 0}
              >
                {busy === "pack" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {packProgress
                      ? `${packProgress.done}/${packProgress.total}`
                      : "Exporting…"}
                  </>
                ) : (
                  <>
                    <Download className="size-3.5" />
                    Download {selectedCount || ""} ZIP
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
