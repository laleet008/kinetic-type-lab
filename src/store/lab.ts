import { create } from "zustand";
import type { FontFamilyId } from "../lib/fonts";
import { EXAMPLES } from "./examples";

export type Align = "left" | "center" | "right" | "justify";
export type AspectRatio = "free" | "1:1" | "16:9" | "9:16" | "4:5";
export type StaggerOrigin = "start" | "end" | "center" | "edges" | "random";
export type RepeatMode = "loop" | "once" | "pingpong";
export type Theme = "dark" | "light";
export type PresetCategory =
  | "Entrance"
  | "Loop"
  | "Effect"
  | "Physics"
  | "Path";

export type CursorWeightParams = {
  radius: number;
  maxWeight: number;
  minWeight: number;
  falloff: "linear" | "ease" | "gaussian";
  axis: "wght" | "wdth" | "slnt" | "opsz";
  invert: boolean;
};

export type PhysicsParams = {
  gravity: number;
  restitution: number;
  friction: number;
  airResistance: number;
  gravityDir: { x: number; y: number };
};

export type TextPathParams = {
  pathId: string;
  startOffset: number;
  spacing: number;
  flipSide: boolean;
  rotateWithPath: boolean;
  animSpeed: number;
};

export type CursorWeightModeState = {
  enabled: boolean;
  params: CursorWeightParams;
};

export type PhysicsModeState = {
  enabled: boolean;
  params: PhysicsParams;
};

export type TextPathModeState = {
  enabled: boolean;
  params: TextPathParams;
};

export type ModeStates = {
  cursorWeightMode: CursorWeightModeState;
  physicsMode: PhysicsModeState;
  textPathMode: TextPathModeState;
};

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
};

export type SavedPreset = {
  id: string;
  name: string;
  category: PresetCategory | string;
  presetId: string;
  params: Record<string, any>;
  createdAt: number;
};

export type TextState = {
  text: string;
  fontFamily: FontFamilyId;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  align: Align;
  textColor: string;
};

export type StageState = {
  stageBg: string;
  aspectRatio: AspectRatio;
  showGrid: boolean;
  showSafeArea: boolean;
};

export type PresetState = {
  presetId: string;
  params: Record<string, any>;
};

export type TimingState = {
  duration: number;
  delay: number;
  staggerAmount: number;
  staggerOrigin: StaggerOrigin;
  easing: string;
  repeatMode: RepeatMode;
};

export type PlaybackState = {
  isPlaying: boolean;
  speed: number;
  progress: number;
  loopToggle: boolean;
};

export type UIState = {
  presetSearch: string;
  activePresetCategory: PresetCategory | "all";
  activeParamTab: "preset" | "timing" | "modes" | "saved";
  savedPresets: SavedPreset[];
  showCommandPalette: boolean;
  theme: Theme;
  toasts: Toast[];
};

export type LabState = TextState &
  StageState &
  PresetState &
  TimingState &
  ModeStates &
  PlaybackState &
  UIState & {
    setText: (text: string) => void;
    setFont: (fontFamily: FontFamilyId) => void;
    setFontSize: (size: number) => void;
    setLineHeight: (lh: number) => void;
    setLetterSpacing: (ls: number) => void;
    setAlign: (align: Align) => void;
    setTextColor: (color: string) => void;
    setStageBg: (bg: string) => void;
    setAspectRatio: (ratio: AspectRatio) => void;
    setShowGrid: (show: boolean) => void;
    setShowSafeArea: (show: boolean) => void;
    setPreset: (presetId: string, params?: Record<string, any>) => void;
    setParam: (key: string, value: any) => void;
    setParams: (params: Record<string, any>) => void;
    setTiming: (timing: Partial<TimingState>) => void;
    toggleMode: (
      mode: keyof Pick<ModeStates, "cursorWeightMode" | "physicsMode" | "textPathMode">
    ) => void;
    setModeParams: (
      mode: keyof Pick<ModeStates, "cursorWeightMode" | "physicsMode" | "textPathMode">,
      params: Record<string, any>
    ) => void;
    play: () => void;
    pause: () => void;
    restart: () => void;
    seek: (progress: number) => void;
    setSpeed: (speed: number) => void;
    setLoopToggle: (loop: boolean) => void;
    savePreset: (name: string, category?: PresetCategory | string) => void;
    applyPreset: (savedPreset: SavedPreset) => void;
    deletePreset: (id: string) => void;
    setPresetSearch: (search: string) => void;
    setActivePresetCategory: (cat: PresetCategory | "all") => void;
    setActiveParamTab: (
      tab: "preset" | "timing" | "modes" | "saved"
    ) => void;
    toggleCommandPalette: () => void;
    setTheme: (theme: Theme) => void;
    showToast: (toast: Omit<Toast, "id">) => void;
    hideToast: (id: string) => void;
    loadExample: (id: string) => void;
    resetAll: () => void;
  };

const generateId = () =>
  Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

export const useLabStore = create<LabState>((set, get) => ({
  text: "Kinetic Type",
  fontFamily: "inter",
  fontSize: 96,
  lineHeight: 1.1,
  letterSpacing: 0,
  align: "center",
  textColor: "#ECECEE",

  stageBg: "#0B0B0C",
  aspectRatio: "free",
  showGrid: false,
  showSafeArea: false,

  presetId: "wave",
  params: {},

  duration: 2,
  delay: 0,
  staggerAmount: 0.03,
  staggerOrigin: "center",
  easing: "power2.out",
  repeatMode: "loop",

  cursorWeightMode: {
    enabled: false,
    params: {
      radius: 150,
      maxWeight: 900,
      minWeight: 100,
      falloff: "ease",
      axis: "wght",
      invert: false,
    },
  },
  physicsMode: {
    enabled: false,
    params: {
      gravity: 1,
      restitution: 0.6,
      friction: 0.1,
      airResistance: 0.02,
      gravityDir: { x: 0, y: 1 },
    },
  },
  textPathMode: {
    enabled: false,
    params: {
      pathId: "circle",
      startOffset: 0,
      spacing: 1,
      flipSide: false,
      rotateWithPath: true,
      animSpeed: 1,
    },
  },

  isPlaying: true,
  speed: 1,
  progress: 0,
  loopToggle: true,

  presetSearch: "",
  activePresetCategory: "all",
  activeParamTab: "preset",
  savedPresets: [],
  showCommandPalette: false,
  theme: "dark",
  toasts: [],

  setText: (text) => set({ text }),
  setFont: (fontFamily) => set({ fontFamily }),
  setFontSize: (size) =>
    set({ fontSize: Math.max(24, Math.min(240, size)) }),
  setLineHeight: (lh) => set({ lineHeight: Math.max(0.8, Math.min(2, lh)) }),
  setLetterSpacing: (ls) =>
    set({ letterSpacing: Math.max(-0.1, Math.min(0.3, ls)) }),
  setAlign: (align) => set({ align }),
  setTextColor: (textColor) => set({ textColor }),
  setStageBg: (stageBg) => set({ stageBg }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowSafeArea: (showSafeArea) => set({ showSafeArea }),

  setPreset: (presetId, params) =>
    set({ presetId, params: params ?? get().params }),
  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),
  setParams: (newParams) =>
    set((state) => ({ params: { ...state.params, ...newParams } })),

  setTiming: (timing) =>
    set((state) => ({
      duration: timing.duration ?? state.duration,
      delay: timing.delay ?? state.delay,
      staggerAmount: timing.staggerAmount ?? state.staggerAmount,
      staggerOrigin: timing.staggerOrigin ?? state.staggerOrigin,
      easing: timing.easing ?? state.easing,
      repeatMode: timing.repeatMode ?? state.repeatMode,
    })),

  toggleMode: (mode) =>
    set((state) => ({
      [mode]: {
        ...state[mode],
        enabled: !state[mode].enabled,
      },
    })),
  setModeParams: (mode, params) =>
    set((state) => ({
      [mode]: {
        ...state[mode],
        params: { ...state[mode].params, ...params },
      },
    })),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  restart: () => set({ isPlaying: true, progress: 0 }),
  seek: (progress) =>
    set({ progress: Math.max(0, Math.min(1, progress)) }),
  setSpeed: (speed) => set({ speed: Math.max(0.1, Math.min(10, speed)) }),
  setLoopToggle: (loopToggle) => set({ loopToggle }),

  savePreset: (name, category) => {
    const state = get();
    const newPreset: SavedPreset = {
      id: generateId(),
      name,
      category: category ?? state.activePresetCategory,
      presetId: state.presetId,
      params: { ...state.params },
      createdAt: Date.now(),
    };
    set((s) => ({ savedPresets: [...s.savedPresets, newPreset] }));
    get().showToast({
      title: "Preset saved",
      description: name,
      variant: "success",
    });
  },
  applyPreset: (savedPreset) => {
    set({
      presetId: savedPreset.presetId,
      params: { ...savedPreset.params },
    });
    get().showToast({
      title: "Preset applied",
      description: savedPreset.name,
    });
  },
  deletePreset: (id) => {
    const state = get();
    const preset = state.savedPresets.find((p) => p.id === id);
    set((s) => ({ savedPresets: s.savedPresets.filter((p) => p.id !== id) }));
    if (preset) {
      get().showToast({
        title: "Preset deleted",
        description: preset.name,
        variant: "warning",
      });
    }
  },

  setPresetSearch: (presetSearch) => set({ presetSearch }),
  setActivePresetCategory: (activePresetCategory) =>
    set({ activePresetCategory }),
  setActiveParamTab: (activeParamTab) => set({ activeParamTab }),
  toggleCommandPalette: () =>
    set((state) => ({ showCommandPalette: !state.showCommandPalette })),
  setTheme: (theme) => set({ theme }),

  showToast: (toast) => {
    const id = generateId();
    const duration = toast.duration ?? 3000;
    const newToast: Toast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id);
      }, duration);
    }
  },
  hideToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  loadExample: (id) => {
    const example = EXAMPLES.find((e) => e.id === id);
    if (!example) return;
    const patch = example.patch();
    set((state) => {
      const modeStates: Partial<LabState> = {};
      if ("cursorWeightMode" in patch) {
        modeStates.cursorWeightMode = {
          ...state.cursorWeightMode,
          ...patch.cursorWeightMode,
          params: {
            ...state.cursorWeightMode.params,
            ...(patch.cursorWeightMode?.params ?? {}),
          },
        };
      }
      if ("physicsMode" in patch) {
        modeStates.physicsMode = {
          ...state.physicsMode,
          ...patch.physicsMode,
          params: {
            ...state.physicsMode.params,
            ...(patch.physicsMode?.params ?? {}),
          },
        };
      }
      if ("textPathMode" in patch) {
        modeStates.textPathMode = {
          ...state.textPathMode,
          ...patch.textPathMode,
          params: {
            ...state.textPathMode.params,
            ...(patch.textPathMode?.params ?? {}),
          },
        };
      }
      return {
        ...patch,
        ...modeStates,
        progress: 0,
      } as Partial<LabState>;
    });
    get().showToast({
      title: "Example loaded",
      description: example.name,
      variant: "success",
    });
  },

  resetAll: () => {
    set({
      text: "Kinetic Type",
      fontFamily: "inter",
      fontSize: 96,
      lineHeight: 1.1,
      letterSpacing: 0,
      align: "center",
      textColor: "#ECECEE",
      stageBg: "#0B0B0C",
      aspectRatio: "free",
      showGrid: false,
      showSafeArea: false,
      presetId: "wave",
      params: {},
      duration: 2,
      delay: 0,
      staggerAmount: 0.03,
      staggerOrigin: "center",
      easing: "power2.out",
      repeatMode: "loop",
      cursorWeightMode: {
        enabled: false,
        params: {
          radius: 150,
          maxWeight: 900,
          minWeight: 100,
          falloff: "ease",
          axis: "wght",
          invert: false,
        },
      },
      physicsMode: {
        enabled: false,
        params: {
          gravity: 1,
          restitution: 0.6,
          friction: 0.1,
          airResistance: 0.02,
          gravityDir: { x: 0, y: 1 },
        },
      },
      textPathMode: {
        enabled: false,
        params: {
          pathId: "circle",
          startOffset: 0,
          spacing: 1,
          flipSide: false,
          rotateWithPath: true,
          animSpeed: 1,
        },
      },
      speed: 1,
      loopToggle: true,
      progress: 0,
      isPlaying: true,
    });
    get().showToast({
      title: "Reset to defaults",
      variant: "warning",
    });
  },
}));
