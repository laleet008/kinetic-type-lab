import { create } from 'zustand';

export type UIStoreState = {
  hoveredPresetId: string | null;
  draggingParamId: string | null;
  exportDialogOpen: boolean;
  aboutDialogOpen: boolean;
  setHoveredPresetId: (id: string | null) => void;
  setDraggingParamId: (id: string | null) => void;
  setExportDialogOpen: (open: boolean) => void;
  setAboutDialogOpen: (open: boolean) => void;
};

export const useUIStore = create<UIStoreState>((set) => ({
  hoveredPresetId: null,
  draggingParamId: null,
  exportDialogOpen: false,
  aboutDialogOpen: false,

  setHoveredPresetId: (hoveredPresetId) => set({ hoveredPresetId }),
  setDraggingParamId: (draggingParamId) => set({ draggingParamId }),
  setExportDialogOpen: (exportDialogOpen) => set({ exportDialogOpen }),
  setAboutDialogOpen: (aboutDialogOpen) => set({ aboutDialogOpen }),
}));
