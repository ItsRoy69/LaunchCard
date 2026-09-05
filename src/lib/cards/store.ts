import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultDoc, PRESETS } from "./catalog";
import type { CardDoc, Stat, TemplateId } from "./types";

type Actions = {
  patch: (partial: Partial<CardDoc>) => void;
  setStat: (id: string, partial: Partial<Stat>) => void;
  addStat: () => void;
  removeStat: (id: string) => void;
  loadPreset: (id: string) => void;
  reset: () => void;
};

type Store = CardDoc & Actions;

function newStat(): Stat {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}`;
  return { id, label: "", value: "" };
}

export const useCardStore = create<Store>()(
  persist(
    (set) => ({
      ...defaultDoc(),
      patch: (partial) => set(partial),
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
        set({
          ...preset.doc,
          logoDataUrl: null,
          shotDataUrl: null,
        });
      },
      reset: () => set({ ...defaultDoc() }),
    }),
    {
      name: "launchcard-v1",
      skipHydration: true,
      partialize: (s) => ({
        name: s.name,
        tagline: s.tagline,
        handle: s.handle,
        url: s.url,
        stats: s.stats,
        logoDataUrl: s.logoDataUrl,
        shotDataUrl: s.shotDataUrl,
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
