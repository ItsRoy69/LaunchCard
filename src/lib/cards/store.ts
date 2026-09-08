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
        // Prefer IDB; fall back to any legacy images still sitting in the persist snapshot.
        const [logo, shot] = await Promise.all([getAsset("logo"), getAsset("shot")]);
        const cur = get();
        const next: Partial<CardDoc> = {};

        if (!cur.logoDataUrl) {
          if (logo) next.logoDataUrl = logo;
        } else {
          // Legacy LS image → IDB, then it will stop being re-written to LS.
          void putAsset("logo", cur.logoDataUrl);
        }

        if (!cur.shotDataUrl) {
          if (shot) next.shotDataUrl = shot;
        } else {
          void putAsset("shot", cur.shotDataUrl);
        }

        if (Object.keys(next).length) set(next);
      },
    }),
    {
      name: "launchcard-v1",
      skipHydration: true,
      // Text-only in localStorage. Images live in IndexedDB.
      partialize: (s) => ({
        name: s.name,
        tagline: s.tagline,
        handle: s.handle,
        url: s.url,
        stats: s.stats,
        templateId: s.templateId,
        paletteId: s.paletteId,
        sizeId: s.sizeId,
      }),
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
