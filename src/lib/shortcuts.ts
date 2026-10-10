import { useEffect, useContext } from 'react';
import { useLabStore } from '../store/lab';
import { useUIStore } from '../store/ui';
import { PRESETS, getPresetDefaults } from '../presets';
import { GlobalTimelineContext } from './timelineController';

type LabStore = typeof useLabStore;
type UIStore = typeof useUIStore;

function isEditingTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  return !!target.closest?.(
    'input, textarea, [contenteditable="true"], [role="textbox"]'
  );
}

export function useShortcuts(
  _store: LabStore,
  _uiStore: UIStore,
  copyCSS: () => Promise<void>,
  copyShare: () => Promise<void>
): void {
  const tlCtx = useContext(GlobalTimelineContext);

  useEffect(() => {
    const labGet = useLabStore.getState;
    const labSet = useLabStore.setState;
    const uiGet = useUIStore.getState;
    const uiSet = useUIStore.setState;

    function onKeyDown(e: KeyboardEvent) {
      if (isEditingTarget(e)) return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;

      const tl = tlCtx?.tlRef.current ?? null;

      if (e.code === 'Space' && !mod && !shift) {
        e.preventDefault();
        const s = labGet();
        if (s.isPlaying) s.pause();
        else s.play();
        return;
      }

      if (e.code === 'KeyR' && !mod && !shift) {
        e.preventDefault();
        labGet().restart();
        return;
      }

      if (e.code === 'ArrowLeft' && !mod && !shift) {
        e.preventDefault();
        if (tl) {
          labGet().pause();
          tl.pause();
          const dur = Math.max(0.001, tl.duration() || 1);
          const step = 1 / 60;
          const newTime = Math.max(0, tl.time() - step);
          tl.seek(newTime);
          const prog = Math.max(0, Math.min(1, newTime / dur));
          labGet().seek(prog);
        }
        return;
      }

      if (e.code === 'ArrowRight' && !mod && !shift) {
        e.preventDefault();
        if (tl) {
          labGet().pause();
          tl.pause();
          const dur = Math.max(0.001, tl.duration() || 1);
          const step = 1 / 60;
          const newTime = Math.min(dur, tl.time() + step);
          tl.seek(newTime);
          const prog = Math.max(0, Math.min(1, newTime / dur));
          labGet().seek(prog);
        }
        return;
      }

      if (/^Digit[1-9]$/.test(e.code) && !mod && !shift) {
        const idx = Number(e.code.replace('Digit', '')) - 1;
        const preset = PRESETS[idx];
        if (preset) {
          e.preventDefault();
          labGet().setPreset(preset.id, getPresetDefaults(preset));
        }
        return;
      }

      if (e.code === 'KeyK' && mod && !shift) {
        e.preventDefault();
        labGet().toggleCommandPalette();
        return;
      }

      if (e.code === 'KeyC' && mod && !shift) {
        const sel = window.getSelection()?.toString() ?? '';
        if (sel.length === 0) {
          e.preventDefault();
          void copyCSS();
        }
        return;
      }

      if (e.code === 'KeyS' && mod && !shift) {
        e.preventDefault();
        const name = window.prompt('Save preset as…');
        if (name && name.trim()) {
          labGet().savePreset(name.trim());
        }
        return;
      }

      if (e.code === 'KeyE' && mod && shift) {
        e.preventDefault();
        uiSet({ exportDialogOpen: true });
        return;
      }

      void labGet;
      void labSet;
      void uiGet;
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [tlCtx, copyCSS, copyShare]);
}
