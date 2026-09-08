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
  /** Load logo/shot from IndexedDB (and migrate legacy LS images once). */
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

/** Read legacy images that were previously stored inside the zustand LS blob. */
function readLegacyImagesFromLocalStorage(): {
  logo: string | null;
  shot: string | null;
} {
  try {
    const raw = localStorage.getItem("launchcard-v1");
    if (!raw) return { logo: null, shot: null };
    const parsed = JSON.parse(raw) as {
      state?: { logoDataUrl?: string | null; shotDataUrl?: string | null };
    };
    const logo =
      typeof parsed?.state?.logoDataUrl === "string" ? parsed.state.logoDataUrl : null;
    const shot =
      typeof parsed?.state?.shotDataUrl === "string" ? parsed.state.shotDataUrl : null;
    return { logo, shot };
  } catch {
    return { logo: null, shot: null };
  }
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
        const [idbLogo, idbShot] = await Promise.all([getAsset("logo"), getAsset("shot")]);
        const legacy = readLegacyImagesFromLocalStorage();

        // Prefer IDB; fall back to legacy localStorage images once.
        const logo = idbLogo ?? legacy.logo;
        const shot = idbShot ?? legacy.shot;

        if (logo && !idbLogo) void putAsset("logo", logo);
        if (shot && !idbShot) void putAsset("shot", shot);

        const cur = get();
        const next: Partial<CardDoc> = {};
        if (!cur.logoDataUrl && logo) next.logoDataUrl = logo;
        if (!cur.shotDataUrl && shot) next.shotDataUrl = shot;
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
