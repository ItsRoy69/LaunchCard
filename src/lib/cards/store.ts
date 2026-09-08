import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAssets, getAsset, putAsset } from "./asset-db";
import { defaultDoc, PRESETS } from "./catalog";
import type { CardDoc, Stat, TemplateId } from "./types";

type Actions = {
  patch: (partial: Partial<CardDoc>) => void;
  setStat: (id: string, partial: Partial<Stat>) => void;
  addStat: () => void;
  removeStat: (id: string) => void;
  loadPreset: (id: string) => void;
  reset: () => void;
  /** Load logo/shot from IndexedDB after text fields rehydrate. */
  hydrateAssets: () => Promise<void>;
};

type Store = CardDoc & Actions;

function newStat(): Stat {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}`;
  return { id, label: "", value: "" };
}

function persistImages(partial: Partial<CardDoc>) {
  if ("logoDataUrl" in partial) void putAsset("logo", partial.logoDataUrl ?? null);
  if ("shotDataUrl" in partial) void putAsset("shot", partial.shotDataUrl ?? null);
}

export const useCardStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaultDoc(),
      patch: (partial) => {
        persistImages(partial);
        set(partial);
      },
      setStat: (id, partial) =>
        set((s) => ({
          stats: s.stats.map((st) => (st.id === id ? { ...st, ...partial } : st)),
        })),
      addStat: () =>
        set((s) => (s.stats.length >= 4 ? s : { stats: [...s.stats, newStat()] })),
      removeStat: (id) =>
        set((s) => ({
          stats: s.stats.length <= 1 ? s.stats : s.stats.filter((st) => st.id !== id),
        })),
      loadPreset: (id) => {
        const preset = PRESETS.find((p) => p.id === id);
        if (!preset) return;
        void putAsset("logo", null);
        void putAsset("shot", null);
        set({
          ...preset.doc,
          logoDataUrl: null,
          shotDataUrl: null,
        });
      },
      reset: () => {
        void clearAssets();
        set({ ...defaultDoc() });
      },
      hydrateAssets: async () => {
        const [logo, shot] = await Promise.all([getAsset("logo"), getAsset("shot")]);
        const cur = get();
        // Only apply if still empty (avoid clobbering a concurrent upload).
        const next: Partial<CardDoc> = {};
        if (!cur.logoDataUrl && logo) next.logoDataUrl = logo;
        if (!cur.shotDataUrl && shot) next.shotDataUrl = shot;
        if (Object.keys(next).length) set(next);
      },
    }),
    {
      name: "launchcard-v1",
      skipHydration: true,
      // Keep localStorage small — heavy images live in IndexedDB.
      partialize: (s) => ({
        name: s.name,
        tagline: s.tagline,
        handle: s.handle,
        url: s.url,
        stats: s.stats,
        templateId: s.templateId,
        paletteId: s.paletteId,
        sizeId: s.sizeId,
        // Migrate: if old localStorage still has images, keep them once;
        // new writes go to IDB only.
        logoDataUrl: s.logoDataUrl,
        shotDataUrl: s.shotDataUrl,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Move any legacy localStorage images into IDB, then drop them from LS on next save.
        if (state.logoDataUrl) void putAsset("logo", state.logoDataUrl);
        if (state.shotDataUrl) void putAsset("shot", state.shotDataUrl);
      },
    },
  ),
);

export function selectDoc(s: Store): CardDoc {
  return {
    name: s.name,
    tagline: s.tagline,
    handle: s.handle,
    url: s.url,
    stats: s.stats,
    logoDataUrl: s.logoDataUrl,
    shotDataUrl: s.shotDataUrl,
    templateId: s.templateId as TemplateId,
    paletteId: s.paletteId,
    sizeId: s.sizeId,
  };
}
