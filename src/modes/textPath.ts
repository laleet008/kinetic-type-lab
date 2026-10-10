import gsap from 'gsap';
import type { SplitUnit } from '../lib/split';

export type PathPresetId =
  | 'circle'
  | 'arc'
  | 'wave'
  | 'spiral'
  | 'figure8'
  | 'zigzag'
  | 'custom';

export type TextPathParams = {
  pathId: PathPresetId;
  startOffset: number;
  spacing: number;
  flipSide: boolean;
  rotateWithPath: boolean;
  animSpeed: number;
};

export type TextPathAPI = {
  enable: (container: HTMLElement, getSplitUnits: () => SplitUnit[]) => void;
  disable: () => void;
  updateParams: (p: Partial<TextPathParams>) => void;
  updateCustomPath: (d: string) => void;
  getCustomPath: () => string | null;
};

export type PresetPathFactory = (w: number, h: number) => string;

export const PATH_PRESETS: Record<
  Exclude<PathPresetId, 'custom'>,
  { name: string; factory: PresetPathFactory }
> = {
  circle: {
    name: 'Circle',
    factory: (w, h) => {
      const r = Math.min(w, h) * 0.4;
      const cx = w / 2;
      const cy = h / 2;
      return `M ${cx + r} ${cy} a ${r},${r} 0 1,1 ${-2 * r},0 a ${r},${r} 0 1,1 ${2 * r},0 Z`;
    },
  },
  arc: {
    name: 'Arc',
    factory: (w, h) => {
      const rw = w * 0.4;
      const rh = h * 0.3;
      const cx = w / 2;
      const cy = h * 0.7;
      return `M ${cx - rw} ${cy} A ${rw},${rh} 0 0 1 ${cx + rw},${cy}`;
    },
  },
  wave: {
    name: 'Wave',
    factory: (w, h) => {
      const amp = h * 0.15;
      const cy = h / 2;
      let d = `M 0 ${cy}`;
      for (let t = 0; t <= 1; t += 0.02) {
        const x = t * w;
        const y = cy + Math.sin(t * Math.PI * 4) * amp;
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      return d;
    },
  },
  spiral: {
    name: 'Spiral',
    factory: (w, h) => {
      const turns = 2;
      const maxR = Math.min(w, h) * 0.45;
      const cx = w / 2;
      const cy = h / 2;
      let d = '';
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ang = t * Math.PI * 2 * turns;
        const r = t * maxR;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        d +=
          i === 0
            ? `M ${x.toFixed(1)} ${y.toFixed(1)}`
            : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d;
    },
  },
  figure8: {
    name: 'Figure 8',
    factory: (w, h) => {
      const a = Math.min(w, h) * 0.4;
      const cx = w / 2;
      const cy = h / 2;
      let d = '';
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2 - Math.PI;
        const denom = 1 + Math.sin(t) ** 2;
        const x = cx + (a * Math.cos(t)) / denom;
        const y = cy + (a * Math.sin(t) * Math.cos(t)) / denom;
        d +=
          i === 0
            ? `M ${x.toFixed(1)} ${y.toFixed(1)}`
            : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d + ' Z';
    },
  },
  zigzag: {
    name: 'Zigzag',
    factory: (w, h) => {
      const peaks = 6;
      const amp = h * 0.2;
      const cy = h / 2;
      let d = `M 0 ${cy}`;
      for (let i = 1; i <= peaks * 2; i++) {
        const x = (i / (peaks * 2)) * w;
        const y = cy + (i % 2 === 0 ? -1 : 1) * amp;
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d;
    },
  },
};

let enabled = false;
let currentContainer: HTMLElement | null = null;
let getUnits: (() => SplitUnit[]) | null = null;
let svgLayer: SVGSVGElement | null = null;
let hiddenPathEl: SVGPathElement | null = null;
let guidePathEl: SVGPathElement | null = null;
let measureSvg: SVGSVGElement | null = null;
let measurePath: SVGPathElement | null = null;
let tickerAdded = false;
let customPathD: string | null = null;
let animT = 0;
let quickSetters: Map<number, (v: string) => void> = new Map();
let initialTransforms: Map<number, string> = new Map();
let trackedSpans: HTMLElement[] = [];

let currentParams: TextPathParams = {
  pathId: 'circle',
  startOffset: 0,
  spacing: 1,
  flipSide: false,
  rotateWithPath: true,
  animSpeed: 1,
};

function buildPathD(w: number, h: number): string {
  if (currentParams.pathId === 'custom') {
    return (
      customPathD ??
      PATH_PRESETS.wave.factory(w, h)
    );
  }
  const preset = PATH_PRESETS[currentParams.pathId];
  return preset.factory(w, h);
}

function createSvgNs(tag: string): SVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function ensureMeasureSvg() {
  if (!measureSvg) {
    measureSvg = createSvgNs('svg') as SVGSVGElement;
    measureSvg.style.position = 'absolute';
    measureSvg.style.left = '-9999px';
    measureSvg.style.top = '-9999px';
    measureSvg.style.width = '0';
    measureSvg.style.height = '0';
    measureSvg.style.visibility = 'hidden';
    measurePath = createSvgNs('path') as SVGPathElement;
    measureSvg.appendChild(measurePath);
    document.body.appendChild(measureSvg);
  }
}

function placeUnits(animOffsetT: number = 0) {
  if (!currentContainer || !getUnits) return;
  const w = currentContainer.clientWidth;
  const h = currentContainer.clientHeight;
  if (w <= 0 || h <= 0) return;

  ensureMeasureSvg();
  if (!measurePath) return;

  const d = buildPathD(w, h);
  measurePath.setAttribute('d', d);
  const totalLength = measurePath.getTotalLength();
  if (totalLength <= 0) return;

  if (hiddenPathEl) hiddenPathEl.setAttribute('d', d);
  if (guidePathEl) guidePathEl.setAttribute('d', d);

  const units = getUnits();
  const containerRect = currentContainer.getBoundingClientRect();

  let totalAdvance = 0;
  let countWithWidth = 0;
  for (const u of units) {
    const r = u.el.getBoundingClientRect();
    if (r.width > 0) {
      totalAdvance += r.width;
      countWithWidth++;
    }
  }
  const avgAdvance = countWithWidth > 0 ? totalAdvance / countWithWidth : 10;
  const spacingPx = avgAdvance * currentParams.spacing;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const span = unit.el;
    const spanRect = span.getBoundingClientRect();
    const spanH = spanRect.height || 1;

    let dist =
      currentParams.startOffset * totalLength + i * spacingPx + animOffsetT * totalLength;
    dist = ((dist % totalLength) + totalLength) % totalLength;

    const p = measurePath.getPointAtLength(dist);
    const eps = 0.5;
    const pA = measurePath.getPointAtLength(Math.max(0, dist - eps));
    const pB = measurePath.getPointAtLength(Math.min(totalLength, dist + eps));
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const angle = Math.atan2(dy, dx);

    const origCx = (spanRect.left + spanRect.right) / 2 - containerRect.left;
    const origCy = (spanRect.top + spanRect.bottom) / 2 - containerRect.top;

    const perpX = Math.sin(angle) * (currentParams.flipSide ? -1 : 1);
    const perpY = -Math.cos(angle) * (currentParams.flipSide ? -1 : 1);
    const targetX = p.x + perpX * (spanH / 2);
    const targetY = p.y + perpY * (spanH / 2);

    const translateX = targetX - origCx;
    const translateY = targetY - origCy;

    let transformStr: string;
    if (currentParams.rotateWithPath) {
      transformStr = `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px) rotate(${angle}rad)`;
    } else {
      transformStr = `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px)`;
    }

    let qs = quickSetters.get(unit.index);
    if (!qs) {
      qs = gsap.quickSetter(span, 'transform', 'px') as unknown as (v: string) => void;
      quickSetters.set(unit.index, qs);
    }
    if (qs) qs(transformStr);
  }
}

function tickerHandler(delta: number) {
  if (!enabled) return;
  if (currentParams.animSpeed > 0) {
    animT = (animT + delta * currentParams.animSpeed / 60) % 1;
  }
  placeUnits(animT);
}

function storeInitialTransforms() {
  if (!getUnits) return;
  const units = getUnits();
  for (const u of units) {
    initialTransforms.set(u.index, u.el.style.transform || '');
    trackedSpans.push(u.el);
  }
}

const textPath: TextPathAPI = {
  enable(container, getSplitUnits) {
    textPath.disable();
    currentContainer = container;
    getUnits = getSplitUnits;
    animT = 0;
    quickSetters.clear();
    initialTransforms.clear();
    trackedSpans = [];

    svgLayer = createSvgNs('svg') as SVGSVGElement;
    svgLayer.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none');
    svgLayer.style.overflow = 'visible';
    svgLayer.style.zIndex = '5';

    hiddenPathEl = createSvgNs('path') as SVGPathElement;
    hiddenPathEl.setAttribute('id', 'ktl-text-path');
    hiddenPathEl.setAttribute('visibility', 'hidden');
    svgLayer.appendChild(hiddenPathEl);

    guidePathEl = createSvgNs('path') as SVGPathElement;
    guidePathEl.setAttribute('fill', 'none');
    guidePathEl.setAttribute('stroke', 'var(--accent, #C6FF4F)');
    guidePathEl.setAttribute('stroke-width', '1');
    guidePathEl.setAttribute('opacity', '0.3');
    guidePathEl.style.pointerEvents = 'none';
    svgLayer.appendChild(guidePathEl);

    container.appendChild(svgLayer);

    storeInitialTransforms();

    requestAnimationFrame(() => {
      placeUnits(0);
    });

    if (!tickerAdded) {
      gsap.ticker.add(tickerHandler);
      tickerAdded = true;
    }

    enabled = true;
  },

  disable() {
    enabled = false;

    if (tickerAdded) {
      gsap.ticker.remove(tickerHandler);
      tickerAdded = false;
    }

    for (const span of trackedSpans) {
      span.style.transform = '';
      span.style.willChange = '';
    }

    if (svgLayer && currentContainer && svgLayer.parentNode === currentContainer) {
      currentContainer.removeChild(svgLayer);
    }
    if (measureSvg && measureSvg.parentNode === document.body) {
      document.body.removeChild(measureSvg);
    }

    svgLayer = null;
    hiddenPathEl = null;
    guidePathEl = null;
    measureSvg = null;
    measurePath = null;
    currentContainer = null;
    getUnits = null;
    quickSetters.clear();
    initialTransforms.clear();
    trackedSpans = [];
  },

  updateParams(p) {
    currentParams = { ...currentParams, ...p };
    if (enabled) {
      animT = 0;
      placeUnits(0);
    }
  },

  updateCustomPath(d) {
    customPathD = d;
    if (enabled && currentParams.pathId === 'custom') {
      placeUnits(animT);
    }
  },

  getCustomPath() {
    return customPathD;
  },
};

export { textPath };
