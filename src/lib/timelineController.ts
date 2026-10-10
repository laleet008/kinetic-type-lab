import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  createElement,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useLabStore } from '../store/lab';
import { PRESETS, getPresetById, type SplitUnit, type Preset } from '../presets';
import { killTimelineSafe, createRepeatConfig } from './timeline';
import {
  prefersReducedMotion,
  isReducedMotionExplicitlyEnabled,
} from './a11y';

export type Timeline = ReturnType<Preset['build']>;

export const GlobalTimelineContext = createContext<{
  tlRef: MutableRefObject<Timeline | null>;
  scrubbing: boolean;
  setScrubbing: (b: boolean) => void;
} | null>(null);

export function TimelineProvider({ children }: { children: ReactNode }) {
  const tlRef = useRef<Timeline | null>(null);
  const [scrubbing, setScrubbingState] = useState(false);
  const scrubbingRef = useRef(false);

  const setScrubbing = useCallback((b: boolean) => {
    scrubbingRef.current = b;
    setScrubbingState(b);
  }, []);

  const value = { tlRef, scrubbing, setScrubbing, scrubbingRef };
  return createElement(
    GlobalTimelineContext.Provider,
    { value: value as any },
    children
  );
}

type TimelineControllerOpts = {
  containerRef: React.RefObject<HTMLElement>;
  splitUnitsRef: React.MutableRefObject<SplitUnit[]>;
};

type TimelineControllerReturn = {
  tlRef: React.MutableRefObject<Timeline | null>;
  rebuild: () => void;
  setSplitReady: (units: SplitUnit[]) => void;
};

export function useTimelineController(
  opts: TimelineControllerOpts
): TimelineControllerReturn {
  const ctx = useContext(GlobalTimelineContext);
  if (!ctx) throw new Error('useTimelineController must be inside TimelineProvider');

  const { tlRef, scrubbingRef } = ctx as any;
  const { containerRef, splitUnitsRef } = opts;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splitReadyRef = useRef<SplitUnit[] | null>(null);
  const lastProgressRef = useRef<number>(0);
  const prevProgressStoreRef = useRef<number>(0);

  const state = useLabStore((s) => ({
    presetId: s.presetId,
    params: s.params,
    duration: s.duration,
    delay: s.delay,
    staggerAmount: s.staggerAmount,
    staggerOrigin: s.staggerOrigin,
    easing: s.easing,
    repeatMode: s.repeatMode,
    isPlaying: s.isPlaying,
    speed: s.speed,
    progress: s.progress,
    loopToggle: s.loopToggle,
    text: s.text,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    seek: s.seek,
  }));

  const preset = PRESETS.find((p) => p.id === state.presetId);
  const splitMode = preset?.splitMode ?? 'chars';

  const buildTimeline = useCallback(() => {
    const container = containerRef.current;
    const units = splitReadyRef.current ?? splitUnitsRef.current;

    if (!container || !units || units.length === 0) return;

    killTimelineSafe(tlRef.current);
    tlRef.current = null;

    const presetDef = getPresetById(state.presetId);
    if (!presetDef) return;

    const presetParams: Record<string, unknown> = {};
    for (const spec of presetDef.params) {
      presetParams[spec.id] =
        state.params[spec.id] !== undefined ? state.params[spec.id] : spec.default;
    }

    const ctx = {
      container,
      units,
      text: state.text,
      params: presetParams,
      timing: {
        duration: state.duration,
        delay: state.delay,
        staggerAmount: state.staggerAmount,
        staggerOrigin: state.staggerOrigin,
        easing: state.easing,
        repeatMode: state.repeatMode,
      },
    };

    try {
      const newTl = presetDef.build(ctx);
      tlRef.current = newTl;

      newTl.repeat(state.loopToggle ? -1 : 0);
      const { yoyo } = createRepeatConfig(state.repeatMode);
      newTl.yoyo(yoyo);

      newTl.timeScale(state.speed);

      newTl.eventCallback('onUpdate', () => {
        const p = newTl.progress();
        if (Math.abs(p - lastProgressRef.current) > 0.001) {
          lastProgressRef.current = p;
          if (!scrubbingRef.current) {
            state.seek(p);
          }
        }
      });

      const reduced = prefersReducedMotion();
      const explicit = isReducedMotionExplicitlyEnabled();
      const reduceTimeline = reduced && !explicit;

      if (reduceTimeline) {
        newTl.pause();
        newTl.progress(1);
      } else if (state.isPlaying) {
        newTl.play();
      } else {
        newTl.pause();
      }

      if (!reduceTimeline && state.progress > 0 && state.progress < 1) {
        newTl.progress(state.progress);
      }
    } catch (err) {
      console.error('[timelineController] build error:', err);
    }
  }, [
    containerRef,
    splitUnitsRef,
    state.presetId,
    state.params,
    state.duration,
    state.delay,
    state.staggerAmount,
    state.staggerOrigin,
    state.easing,
    state.repeatMode,
    state.speed,
    state.isPlaying,
    state.progress,
    state.loopToggle,
    state.text,
    state.seek,
    tlRef,
    scrubbingRef,
  ]);

  const rebuild = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buildTimeline();
    }, 120);
  }, [buildTimeline]);

  const setSplitReady = useCallback(
    (units: SplitUnit[]) => {
      splitReadyRef.current = units;
      splitUnitsRef.current = units;
      rebuild();
    },
    [splitUnitsRef, rebuild]
  );

  useEffect(() => {
    rebuild();
  }, [
    state.presetId,
    splitMode,
    state.text,
    state.fontFamily,
    state.fontSize,
    state.lineHeight,
    state.letterSpacing,
    state.duration,
    state.delay,
    state.staggerAmount,
    state.staggerOrigin,
    state.easing,
    state.repeatMode,
    state.params,
    state.loopToggle,
    rebuild,
  ]);

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    if (state.isPlaying) {
      scrubbingRef.current = false;
      tl.play();
    } else {
      tl.pause();
    }
  }, [state.isPlaying, tlRef, scrubbingRef]);

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    tl.timeScale(state.speed);
  }, [state.speed, tlRef]);

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    tl.repeat(state.loopToggle ? -1 : 0);
  }, [state.loopToggle, tlRef]);

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    const diff = Math.abs(state.progress - prevProgressStoreRef.current);
    if (diff > 0.001) {
      scrubbingRef.current = true;
      tl.progress(state.progress);
      tl.pause();
      lastProgressRef.current = state.progress;
    }
    prevProgressStoreRef.current = state.progress;
  }, [state.progress, tlRef, scrubbingRef]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      killTimelineSafe(tlRef.current);
      tlRef.current = null;
    };
  }, [tlRef]);

  return { tlRef, rebuild, setSplitReady };
}
