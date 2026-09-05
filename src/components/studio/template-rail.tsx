import { PALETTES, SIZES, TEMPLATES } from "@/lib/cards/catalog";
import { useCardStore } from "@/lib/cards/store";
import { cn } from "@/lib/utils";
import type { CardPalette, TemplateId } from "@/lib/cards/types";

function Mini({
  id,
  pal,
}: {
  id: TemplateId;
  pal: CardPalette;
}) {
  const fg = pal.fg;
  const bg = pal.bg;
  const muted = pal.muted;
  const rule = pal.rule;
  return (
    <div className="relative h-14 w-full overflow-hidden rounded-sm" style={{ background: bg }}>
      {id === "editorial" && (
        <div className="flex h-full flex-col justify-end gap-1 p-1.5">
          <div className="h-2 w-8 rounded-sm" style={{ background: fg }} />
          <div className="h-px w-full" style={{ background: rule }} />
          <div className="flex gap-1">
            <div className="h-1 flex-1" style={{ background: muted }} />
            <div className="h-1 flex-1" style={{ background: muted }} />
            <div className="h-1 flex-1" style={{ background: muted }} />
          </div>
        </div>
      )}
      {id === "flex" && (
        <div className="flex h-full items-end p-1.5">
          <div className="h-8 w-10 rounded-sm" style={{ background: fg }} />
        </div>
      )}
      {id === "split" && (
        <div className="flex h-full">
          <div className="h-full w-2/5" style={{ background: fg }} />
          <div className="flex flex-1 flex-col justify-center gap-1 p-1.5">
            <div className="h-1 w-full" style={{ background: muted }} />
            <div className="h-1 w-2/3" style={{ background: rule }} />
          </div>
        </div>
      )}
      {id === "terminal" && (
        <div className="flex h-full flex-col p-1">
          <div className="mb-1 flex gap-0.5">
            <span className="size-1 rounded-full" style={{ background: muted }} />
            <span className="size-1 rounded-full" style={{ background: muted }} />
            <span className="size-1 rounded-full" style={{ background: fg }} />
          </div>
          <div className="h-1 w-3/4" style={{ background: muted }} />
          <div className="mt-1 h-1 w-1/2" style={{ background: fg }} />
        </div>
      )}
      {id === "poster" && (
        <div className="flex h-full items-center p-1.5">
          <div className="h-6 w-full rounded-sm" style={{ background: fg }} />
        </div>
      )}
      {id === "quiet" && (
        <div className="flex h-full flex-col justify-center gap-1 p-2">
          <div className="h-0.5 w-6" style={{ background: muted }} />
          <div className="h-2 w-10" style={{ background: fg }} />
        </div>
      )}
      {id === "ledger" && (
        <div className="flex h-full gap-1 p-1.5 pt-3">
          <div className="flex-1 space-y-1">
            <div className="h-1 w-full" style={{ background: muted }} />
            <div className="h-1 w-2/3" style={{ background: muted }} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-1 w-full" style={{ background: fg }} />
            <div className="h-1 w-full" style={{ background: fg }} />
          </div>
        </div>
      )}
      {id === "frame" && (
        <div className="flex h-full flex-col">
          <div className="flex-1" style={{ background: rule }} />
          <div className="flex h-4 items-center gap-1 px-1" style={{ background: bg }}>
            <div className="size-2 rounded-sm" style={{ background: fg }} />
            <div className="h-1 flex-1" style={{ background: muted }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function TemplateRail() {
  const templateId = useCardStore((s) => s.templateId);
  const paletteId = useCardStore((s) => s.paletteId);
  const sizeId = useCardStore((s) => s.sizeId);
  const patch = useCardStore((s) => s.patch);
  const pal = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];

  return (
    <div className="border-t border-border bg-bg">
      <div className="studio-scroll flex gap-2 overflow-x-auto px-3 py-3 md:px-4">
        {TEMPLATES.map((t) => {
          const on = t.id === templateId;
          return (
            <button
              key={t.id}
                type="button"
                onClick={() => patch({ templateId: t.id })}
                aria-pressed={on}
              className={cn(
                "w-28 shrink-0 rounded-md border p-1.5 text-left transition-[border-color,opacity] duration-quick",
                on ? "border-primary" : "border-border hover:border-border-strong",
              )}
            >
              <Mini id={t.id} pal={pal} />
              <p className="mt-1.5 truncate text-xs font-medium text-fg">{t.label}</p>
              <p className="truncate text-xs text-subtle">{t.blurb}</p>
            </button>
          );
        })}
      </div>
      <div className="studio-scroll flex gap-2 overflow-x-auto border-t border-border px-3 py-2 md:px-4">
        {SIZES.map((s) => {
          const on = s.id === sizeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ sizeId: s.id })}
              aria-pressed={on}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-[border-color,background-color,color] duration-quick",
                on
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-transparent text-muted hover:text-fg",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
