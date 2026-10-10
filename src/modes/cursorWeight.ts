import gsap from 'gsap';
import type { SplitUnit } from '../lib/split';
import {
  getFontById,
  fontVariationString,
  type FontFamilyId,
} from '../lib/fonts';
import { useLabStore } from '../store/lab';

export type CursorWeightOptions = {
  radius: number;
  maxWeight: number;
  minWeight: number;
  falloff: 'linear' | 'ease' | 'gaussian';
  axis: 'wght' | 'wdth' | 'slnt' | 'opsz';
  invert: boolean;
};

export type CursorWeightAPI = {
  enable: (
    container: HTMLElement,
    getSplitUnits: () => SplitUnit[],
    options: CursorWeightOptions
  ) => void;
  disable: () => void;
  updateOptions: (options: Partial<CursorWeightOptions>) => void;
  setPointer: (x: number, y: number) => void;
};

type QuickSetter = (val: string) => void;

type CharCache = {
  cx: number;
  cy: number;
  baseParts: string[];
  axisTag: string;
  axisMin: number;
  axisMax: number;
};

const MAX_UNITS = 160;

let currentContainer: HTMLElement | null = null;
let currentGetSplitUnits: (() => SplitUnit[]) | null = null;
let currentOptions: CursorWeightOptions | null = null;
let quickSetters: Map<HTMLElement, QuickSetter> = new Map();
let charCaches: Map<HTMLElement, CharCache> = new Map();
let lastWrittenValues: Map<HTMLElement, number> = new Map();
let pointerX: number = Infinity;
let pointerY: number = Infinity;
let containerRectCache: DOMRect | null = null;
let lastRectCheck: number = 0;
let lastFontFamily: FontFamilyId | null = null;

function readFontFamily(): FontFamilyId {
  try {
    const state = useLabStore.getState?.();
    if (state && state.fontFamily) return state.fontFamily as FontFamilyId;
  } catch {
    /* noop */
  }
  return 'inter';
}

function buildBaseParts(
  fontFamily: FontFamilyId,
  drivenAxis: string
): string[] {
  const font = getFontById(fontFamily);
  const baseParts: string[] = [];
  if (!font) return baseParts;
  for (const ax of font.axes) {
    if (ax.tag === drivenAxis) continue;
    baseParts.push(`'${ax.tag}' ${ax.default}`);
  }
  return baseParts;
}

function buildFvs(
  baseParts: string[],
  drivenTag: string,
  drivenValue: number
): string {
  const driven = `'${drivenTag}' ${drivenValue}`;
  if (baseParts.length === 0) return driven;
  return `${baseParts.join(', ')}, ${driven}`;
}

function rebuildCharCaches() {
  if (!currentContainer || !currentOptions) return;
  const fontFamily = readFontFamily();
  lastFontFamily = fontFamily;
  const font = getFontById(fontFamily);
  const axisTag = currentOptions.axis;
  const axis =
    font?.axes.find((a) => a.tag === axisTag) ??
    font?.axes.find((a) => a.tag === 'wght') ??
    null;
  const axisMin = axis?.min ?? 100;
  const axisMax = axis?.max ?? 900;
  const baseParts = buildBaseParts(fontFamily, axisTag);

  const units = currentGetSplitUnits ? currentGetSplitUnits() : [];
  const limit = Math.min(units.length, MAX_UNITS);

  quickSetters.clear();
  charCaches.clear();
  lastWrittenValues.clear();

  for (let i = 0; i < limit; i++) {
    const unit = units[i];
    const el = unit.el;
    if (!el) continue;
    const qs = gsap.quickSetter(el, 'fontVariationSettings', 'css') as QuickSetter;
    quickSetters.set(el, qs);
    charCaches.set(el, {
      cx: -1,
      cy: -1,
      baseParts,
      axisTag,
      axisMin,
      axisMax,
    });
    lastWrittenValues.set(el, -Infinity);
  }
}

function invalidateRectCache() {
  containerRectCache = null;
  lastRectCheck = 0;
  for (const cache of charCaches.values()) {
    cache.cx = -1;
    cache.cy = -1;
  }
}

function getContainerRect(): DOMRect | null {
  if (!currentContainer) return null;
  const now = performance.now();
  if (containerRectCache && now - lastRectCheck < 250) {
    return containerRectCache;
  }
  containerRectCache = currentContainer.getBoundingClientRect();
  lastRectCheck = now;
  return containerRectCache;
}

function onPointerMove(e: PointerEvent) {
  const rect = getContainerRect();
  if (!rect) return;
  pointerX = e.clientX - rect.left;
  pointerY = e.clientY - rect.top;
}

function onPointerEnter(e: PointerEvent) {
  const rect = getContainerRect();
  if (!rect) return;
  pointerX = e.clientX - rect.left;
  pointerY = e.clientY - rect.top;
}

function onPointerLeave() {
  pointerX = Infinity;
  pointerY = Infinity;
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 0) return;
  const t = e.touches[0];
  const rect = getContainerRect();
  if (!rect) return;
  pointerX = t.clientX - rect.left;
  pointerY = t.clientY - rect.top;
}

function onTouchEnd() {
  pointerX = Infinity;
  pointerY = Infinity;
}

function tickerLoop() {
  if (
    !currentContainer ||
    !currentOptions ||
    !currentGetSplitUnits ||
    pointerX === Infinity ||
    pointerY === Infinity
  ) {
    return;
  }

  const fontFamily = readFontFamily();
  if (fontFamily !== lastFontFamily) {
    rebuildCharCaches();
    if (!currentOptions) return;
  }

  const containerRect = getContainerRect();
  if (!containerRect) return;

  const opts = currentOptions;
  const radius = opts.radius;
  const radiusSq = radius * radius;
  const units = currentGetSplitUnits();
  const limit = Math.min(units.length, MAX_UNITS);

  for (let i = 0; i < limit; i++) {
    const unit = units[i];
    const el = unit.el;
    if (!el) continue;

    const cache = charCaches.get(el);
    const qs = quickSetters.get(el);
    if (!cache || !qs) continue;

    let cx = cache.cx;
    let cy = cache.cy;
    if (cx < 0 || cy < 0) {
      const splitUnitAny = el as any;
      const meta: any = splitUnitAny.__splitUnit;
      if (
        meta &&
        typeof meta.normX === 'number' &&
        typeof meta.normY === 'number'
      ) {
        cx = meta.normX * containerRect.width;
        cy = meta.normY * containerRect.height;
      }
      if (cx === undefined || cy === undefined || cx < 0 || cy < 0) {
        const r = el.getBoundingClientRect();
        cx = (r.left + r.right) / 2 - containerRect.left;
        cy = (r.top + r.bottom) / 2 - containerRect.top;
      }
      cache.cx = cx;
      cache.cy = cy;
    }

    const dx = cx - pointerX;
    const dy = cy - pointerY;
    const distSq = dx * dx + dy * dy;
    const dist = distSq > radiusSq ? radius : Math.sqrt(distSq);
    const tRaw = radius === 0 ? 1 : dist / radius;
    const t = Math.max(0, Math.min(1, tRaw));

    let falloff: number;
    switch (opts.falloff) {
      case 'linear':
        falloff = 1 - t;
        break;
      case 'ease':
        falloff = 1 - t * t * (3 - 2 * t);
        break;
      case 'gaussian':
        falloff = Math.exp(-(t * t) / 0.15);
        break;
    }

    if (opts.invert) {
      falloff = 1 - falloff;
    }

    const rawValue =
      opts.minWeight + falloff * (opts.maxWeight - opts.minWeight);
    const value = Math.max(cache.axisMin, Math.min(cache.axisMax, rawValue));

    const lastWritten = lastWrittenValues.get(el);
    if (lastWritten !== undefined && Math.abs(value - lastWritten) < 0.05) {
      continue;
    }

    lastWrittenValues.set(el, value);
    const fvs = buildFvs(cache.baseParts, cache.axisTag, value);
    qs(fvs);
  }
}

export const cursorWeight: CursorWeightAPI = {
  enable(container, getSplitUnits, options) {
    cursorWeight.disable();

    currentContainer = container;
    currentGetSplitUnits = getSplitUnits;
    currentOptions = { ...options };

    rebuildCharCaches();

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerenter', onPointerEnter);
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    gsap.ticker.add(tickerLoop);

    window.addEventListener('resize', invalidateRectCache);
    window.addEventListener('scroll', invalidateRectCache, true);
  },

  disable() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerenter', onPointerEnter);
    window.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', invalidateRectCache);
    window.removeEventListener('scroll', invalidateRectCache, true);

    gsap.ticker.remove(tickerLoop);

    const fontFamily = readFontFamily();
    for (const el of charCaches.keys()) {
      const defaultFvs = fontVariationString(fontFamily, {});
      try {
        if (defaultFvs) {
          (el as HTMLElement).style.fontVariationSettings = defaultFvs;
        } else {
          (el as HTMLElement).style.fontVariationSettings = '';
        }
      } catch {
        /* noop */
      }
    }

    quickSetters.clear();
    charCaches.clear();
    lastWrittenValues.clear();

    currentContainer = null;
    currentGetSplitUnits = null;
    currentOptions = null;
    containerRectCache = null;
    lastRectCheck = 0;
    lastFontFamily = null;
    pointerX = Infinity;
    pointerY = Infinity;
  },

  updateOptions(options) {
    if (!currentOptions) return;
    const prevAxis = currentOptions.axis;
    currentOptions = { ...currentOptions, ...options };
    if (options.axis && options.axis !== prevAxis) {
      rebuildCharCaches();
    }
  },

  setPointer(x, y) {
    pointerX = x;
    pointerY = y;
  },
};
