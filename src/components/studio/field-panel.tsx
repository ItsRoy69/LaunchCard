import { useRef, useState, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ImagePlus,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  EXPORT_SCALES,
  FONT_PAIRS,
  PALETTES,
  PRESETS,
} from "@/lib/cards/catalog";
import { fileToDataUrl } from "@/lib/cards/image";
import { useCardStore } from "@/lib/cards/store";
import type { ExportScale, FontPairId } from "@/lib/cards/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function DropSlot({
  label,
  hint,
  value,
  onFile,
  onClear,
  emphasize,
}: {
  label: string;
  hint: string;
  value: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  emphasize?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (file?: File) => {
    if (file && file.type.startsWith("image/")) onFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label>{label}</Label>
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-8 items-center gap-1 text-xs text-muted hover:text-fg"
          >
            <X className="size-3.5" />
            Remove
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-dashed transition-[border-color,background-color] duration-quick",
          over
            ? "border-primary bg-surface"
            : emphasize && !value
              ? "border-primary/50 bg-surface/60 hover:border-primary"
              : "border-border bg-well hover:border-border-strong",
        )}
        aria-label={label + ": " + (value ? "replace image" : hint)}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-subtle">
            <ImagePlus className="size-4" />
            <span className="text-xs">{hint}</span>
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label={label}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function SectionHeader({
  title,
  onReset,
}: {
  title: string;
  onReset?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium tracking-wide text-muted">{title}</p>
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-7 items-center gap-1 text-[11px] text-subtle hover:text-fg"
          title={`Reset ${title.toLowerCase()}`}
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      ) : null}
    </div>
  );
}

export function FieldPanel() {
  const name = useCardStore((s) => s.name);
  const tagline = useCardStore((s) => s.tagline);
  const handle = useCardStore((s) => s.handle);
  const url = useCardStore((s) => s.url);
  const stats = useCardStore((s) => s.stats);
  const paletteId = useCardStore((s) => s.paletteId);
  const templateId = useCardStore((s) => s.templateId);
  const logoDataUrl = useCardStore((s) => s.logoDataUrl);
  const shotDataUrl = useCardStore((s) => s.shotDataUrl);
  const accent = useCardStore((s) => s.accent);
  const fontPairId = useCardStore((s) => s.fontPairId);
  const exportScale = useCardStore((s) => s.exportScale);
  const patch = useCardStore((s) => s.patch);
  const setStat = useCardStore((s) => s.setStat);
  const addStat = useCardStore((s) => s.addStat);
  const removeStat = useCardStore((s) => s.removeStat);
  const moveStat = useCardStore((s) => s.moveStat);
  const duplicateStat = useCardStore((s) => s.duplicateStat);
  const resetSection = useCardStore((s) => s.resetSection);
  const loadPreset = useCardStore((s) => s.loadPreset);
  const reset = useCardStore((s) => s.reset);
  const clearAllData = useCardStore((s) => s.clearAllData);

  const frameNeedsShot = templateId === "frame" && !shotDataUrl;
  const accentValue = accent ?? "";

  const onClearData = () => {
    const ok = window.confirm(
      "Clear all local LaunchCard data? This removes drafts, logos, and screenshots from this browser.",
    );
    if (!ok) return;
    clearAllData();
    if (typeof history !== "undefined") {
      history.replaceState(null, "", window.location.pathname);
    }
    toast.success("Local data cleared");
  };

  return (
    <aside className="studio-scroll flex max-h-[42dvh] w-full shrink-0 flex-col gap-6 overflow-y-auto overscroll-contain border-t border-border bg-bg p-4 lg:max-h-none lg:h-full lg:w-80 lg:border-r lg:border-t-0 lg:p-5">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wide text-muted">Example</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 items-center gap-1 text-xs text-muted hover:text-fg"
          >
            <RotateCcw className="size-3.5" />
            Reset all
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => loadPreset(p.id)}
              className="h-8 rounded-full border border-border px-3 text-xs text-muted hover:border-border-strong hover:text-fg"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <SectionHeader title="Product" onReset={() => resetSection("product")} />
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            maxLength={48}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Product name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tagline">Tagline</Label>
          <Textarea
            id="tagline"
            value={tagline}
            maxLength={180}
            onChange={(e) => patch({ tagline: e.target.value })}
            placeholder="One line that makes someone stop scrolling"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => patch({ handle: e.target.value })}
              placeholder="you"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="your.app"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionHeader title="Stats" onReset={() => resetSection("stats")} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addStat}
            disabled={stats.length >= 4}
            className="h-8 shrink-0 px-2 text-xs"
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {stats.map((st, index) => (
            <div key={st.id} className="flex gap-1.5">
              <div className="flex shrink-0 flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveStat(st.id, -1)}
                  disabled={index === 0}
                  aria-label="Move stat up"
                  className="h-7 w-7"
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveStat(st.id, 1)}
                  disabled={index === stats.length - 1}
                  aria-label="Move stat down"
                  className="h-7 w-7"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </div>
              <Input
                value={st.value}
                onChange={(e) => setStat(st.id, { value: e.target.value })}
                placeholder="12k"
                aria-label="Stat value"
                className="min-w-0"
              />
              <Input
                value={st.label}
                onChange={(e) => setStat(st.id, { label: e.target.value })}
                placeholder="users"
                aria-label="Stat label"
                className="min-w-0"
              />
              <div className="flex shrink-0 flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => duplicateStat(st.id)}
                  disabled={stats.length >= 4}
                  aria-label="Duplicate stat"
                  className="h-7 w-7"
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeStat(st.id)}
                  disabled={stats.length <= 1}
                  aria-label="Remove stat"
                  className="h-7 w-7"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Marks" onReset={() => resetSection("marks")} />
        {frameNeedsShot ? (
          <p className="rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-muted">
            Frame works best with a screenshot — drop one below.
          </p>
        ) : null}
        <DropSlot
          label="Logo"
          hint="Drop logo"
          value={logoDataUrl}
          onFile={async (file) => {
            try {
              const data = await fileToDataUrl(file, 256, true);
              patch({ logoDataUrl: data });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not add logo");
            }
          }}
          onClear={() => patch({ logoDataUrl: null })}
        />
        <DropSlot
          label="Screenshot"
          hint={frameNeedsShot ? "Required for Frame" : "Drop screenshot"}
          value={shotDataUrl}
          emphasize={frameNeedsShot}
          onFile={async (file) => {
            try {
              const data = await fileToDataUrl(file, 1600, false);
              patch({ shotDataUrl: data });
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Could not add screenshot",
              );
            }
          }}
          onClear={() => patch({ shotDataUrl: null })}
        />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Style" onReset={() => resetSection("style")} />

        <div className="space-y-1.5">
          <Label>Ink</Label>
          <div className="grid grid-cols-3 gap-2">
            {PALETTES.map((p) => {
              const on = p.id === paletteId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => patch({ paletteId: p.id })}
                  className={cn(
                    "flex h-14 flex-col items-stretch overflow-hidden rounded-md border transition-[border-color] duration-quick",
                    on ? "border-primary" : "border-border hover:border-border-strong",
                  )}
                  aria-label={p.label}
                  aria-pressed={on}
                >
                  <span className="flex-1" style={{ background: p.bg }} />
                  <span className="flex h-5 items-center justify-between px-1.5 text-xs text-muted">
                    <span>{p.label}</span>
                    <span className="size-2 rounded-full" style={{ background: p.fg }} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="accent">Accent</Label>
            {accent ? (
              <button
                type="button"
                onClick={() => patch({ accent: null })}
                className="text-[11px] text-subtle hover:text-fg"
              >
                Use palette
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="accent"
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(accentValue) ? accentValue : "#f3f0e8"}
              onChange={(e) => patch({ accent: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-well p-0.5"
              aria-label="Custom accent color"
            />
            <Input
              value={accentValue}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (!v) {
                  patch({ accent: null });
                  return;
                }
                patch({ accent: v.startsWith("#") ? v : `#${v}` });
              }}
              placeholder="#f3f0e8"
              maxLength={7}
              className="font-mono text-xs"
              aria-label="Accent hex"
            />
          </div>
          <p className="text-[11px] text-subtle">
            Overrides the palette accent for bars, kickers, and highlights.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {FONT_PAIRS.map((fp) => {
              const on = fp.id === fontPairId;
              return (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => patch({ fontPairId: fp.id as FontPairId })}
                  className={cn(
                    "flex flex-col items-start rounded-md border px-3 py-2 text-left transition-[border-color] duration-quick",
                    on ? "border-primary bg-surface" : "border-border hover:border-border-strong",
                  )}
                  aria-pressed={on}
                >
                  <span className="text-xs font-medium text-fg">{fp.label}</span>
                  <span className="text-[11px] text-subtle">{fp.blurb}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Export scale</Label>
          <div className="flex gap-1.5">
            {EXPORT_SCALES.map((s) => {
              const on = s.id === exportScale;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => patch({ exportScale: s.id as ExportScale })}
                  title={s.hint}
                  className={cn(
                    "h-9 flex-1 rounded-md border text-xs font-medium transition-[border-color,background-color,color] duration-quick",
                    on
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border text-muted hover:text-fg",
                  )}
                  aria-pressed={on}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-subtle">
            Multiplier for PNG pixel density. Preview stays 1×; export uses this scale.
          </p>
        </div>
      </section>

      <Separator />

      <section className="space-y-3 pb-4">
        <p className="text-xs font-medium tracking-wide text-muted">Privacy</p>
        <p className="text-xs leading-relaxed text-subtle">
          Drafts stay on this device. Card content is never uploaded. Anonymous usage analytics run
          for product improvement only (dashboards, not shown here).
        </p>
        <button
          type="button"
          onClick={onClearData}
          className="inline-flex h-8 items-center gap-1.5 text-xs text-muted hover:text-fg"
        >
          <Trash2 className="size-3.5" />
          Clear local data
        </button>
      </section>
    </aside>
  );
}
