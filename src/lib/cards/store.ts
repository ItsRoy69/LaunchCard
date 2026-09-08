import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAssets, getAsset, putAsset } from "./asset-db";
import { defaultDoc, PRESETS } from "./catalog";
import type { CardDoc, Stat, TemplateId } from "./types";

const HISTORY_LIMIT = 40;

type Actions = {
  patch: (partial: Partial<CardDoc>) => void;
  setStat: (id: string, partial: Partial<Stat>) => void;
  addStat: () => void;
  removeStat: (id: string) => void;
  loadPreset: (id: string) => void;
  reset: () => void;
  /** Apply a shared draft (from URL hash). Clears images. */
  applyShare: (partial: Partial<CardDoc>) => void;
  /** Wipe localStorage + IndexedDB and reset to defaults. */
  clearAllData: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  hydrateAssets: () => Promise<void>;
};

type HistoryState = {
  past: CardDoc[];
  future: CardDoc[];
};

type Store = CardDoc & Actions & HistoryState;

function newStat(): Stat {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}`;
  return { id, label: "", value: "" };
}

function snapshotDoc(s: CardDoc): CardDoc {
  return {
    name: s.name,
    tagline: s.tagline,
    handle: s.handle,
    url: s.url,
    stats: s.stats.map((st) => ({ ...st })),
    logoDataUrl: s.logoDataUrl,
    shotDataUrl: s.shotDataUrl,
    templateId: s.templateId,
    paletteId: s.paletteId,
    sizeId: s.sizeId,
  };
}

function persistImages(partial: Partial<CardDoc>) {
  if ("logoDataUrl" in partial) void putAsset("logo", partial.logoDataUrl ?? null);
  if ("shotDataUrl" in partial) void putAsset("shot", partial.shotDataUrl ?? null);
}

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

let textHistoryTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTextSnapshot: CardDoc | null = null;

const TEXT_KEYS: (keyof CardDoc)[] = ["name", "tagline", "handle", "url"];

function isTextOnlyPatch(partial: Partial<CardDoc>) {
  const keys = Object.keys(partial) as (keyof CardDoc)[];
  return keys.length > 0 && keys.every((k) => TEXT_KEYS.includes(k));
}

function isStatTextPatch(partial: Partial<Stat>) {
  const keys = Object.keys(partial);
  return keys.every((k) => k === "label" || k === "value");
}

export const useCardStore = create<Store>()(
  persist(
    (set, get) => {
      const pushPast = (doc: CardDoc) => {
        set((s) => {
          const past = [...s.past, snapshotDoc(doc)].slice(-HISTORY_LIMIT);
          return { past, future: [] };
        });
      };

      const commitTextHistory = () => {
        if (pendingTextSnapshot) {
          pushPast(pendingTextSnapshot);
          pendingTextSnapshot = null;
        }
        if (textHistoryTimer) {
          clearTimeout(textHistoryTimer);
          textHistoryTimer = null;
        }
      };

      const scheduleTextHistory = () => {
        if (!pendingTextSnapshot) {
          pendingTextSnapshot = snapshotDoc(get());
        }
        if (textHistoryTimer) clearTimeout(textHistoryTimer);
        textHistoryTimer = setTimeout(() => {
          commitTextHistory();
        }, 400);
      };

      const applyDoc = (doc: CardDoc) => {
        persistImages({
          logoDataUrl: doc.logoDataUrl,
          shotDataUrl: doc.shotDataUrl,
        });
        set({
          name: doc.name,
          tagline: doc.tagline,
          handle: doc.handle,
          url: doc.url,
          stats: doc.stats.map((st) => ({ ...st })),
          logoDataUrl: doc.logoDataUrl,
          shotDataUrl: doc.shotDataUrl,
          templateId: doc.templateId,
          paletteId: doc.paletteId,
          sizeId: doc.sizeId,
        });
      };

      return {
        ...defaultDoc(),
        past: [],
        future: [],

        patch: (partial) => {
          if (isTextOnlyPatch(partial)) {
            scheduleTextHistory();
          } else {
            commitTextHistory();
            pushPast(snapshotDoc(get()));
          }
          persistImages(partial);
          set(partial);
        },

        setStat: (id, partial) => {
          if (isStatTextPatch(partial)) {
            scheduleTextHistory();
          } else {
            commitTextHistory();
            pushPast(snapshotDoc(get()));
          }
          set((s) => ({
            stats: s.stats.map((st) => (st.id === id ? { ...st, ...partial } : st)),
          }));
        },

        addStat: () => {
          commitTextHistory();
          const s = get();
          if (s.stats.length >= 4) return;
          pushPast(snapshotDoc(s));
          set({ stats: [...s.stats, newStat()] });
        },

        removeStat: (id) => {
          commitTextHistory();
          const s = get();
          if (s.stats.length <= 1) return;
          pushPast(snapshotDoc(s));
          set({ stats: s.stats.filter((st) => st.id !== id) });
        },

        loadPreset: (id) => {
          const preset = PRESETS.find((p) => p.id === id);
          if (!preset) return;
          commitTextHistory();
          pushPast(snapshotDoc(get()));
          void putAsset("logo", null);
          void putAsset("shot", null);
          set({
            ...preset.doc,
            logoDataUrl: null,
            shotDataUrl: null,
          });
        },

        reset: () => {
          commitTextHistory();
          pushPast(snapshotDoc(get()));
          void clearAssets();
          set({ ...defaultDoc() });
        },

        applyShare: (partial) => {
          commitTextHistory();
          pushPast(snapshotDoc(get()));
          void putAsset("logo", null);
          void putAsset("shot", null);
          set({
            ...partial,
            logoDataUrl: null,
            shotDataUrl: null,
            past: get().past,
            future: [],
          });
        },

        clearAllData: () => {
          commitTextHistory();
          void clearAssets();
          try {
            localStorage.removeItem("launchcard-v1");
          } catch {
            // ignore
          }
          set({ ...defaultDoc(), past: [], future: [] });
        },

        undo: () => {
          commitTextHistory();
          const s = get();
          if (!s.past.length) return;
          const previous = s.past[s.past.length - 1];
          const past = s.past.slice(0, -1);
          const future = [snapshotDoc(s), ...s.future].slice(0, HISTORY_LIMIT);
          set({ past, future });
          applyDoc(previous);
        },

        redo: () => {
          commitTextHistory();
          const s = get();
          if (!s.future.length) return;
          const next = s.future[0];
          const future = s.future.slice(1);
          const past = [...s.past, snapshotDoc(s)].slice(-HISTORY_LIMIT);
          set({ past, future });
          applyDoc(next);
        },

        canUndo: () => get().past.length > 0 || pendingTextSnapshot != null,
        canRedo: () => get().future.length > 0,

        hydrateAssets: async () => {
          const [idbLogo, idbShot] = await Promise.all([getAsset("logo"), getAsset("shot")]);
          const legacy = readLegacyImagesFromLocalStorage();

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
      };
    },
    {
      name: "launchcard-v1",
      skipHydration: true,
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
