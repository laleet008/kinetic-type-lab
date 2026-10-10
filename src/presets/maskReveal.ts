import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';
import { buildStaggerArray, parseTimingEasing } from '../lib/timeline';

const params: ParamSpec[] = [
  {
    type: 'select',
    id: 'direction',
    label: 'Direction',
    options: [
      { value: 'up', label: 'Up' },
      { value: 'down', label: 'Down' },
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
    ],
    default: 'up',
  },
  {
    type: 'range',
    id: 'stagger',
    label: 'Stagger',
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.08,
    unit: 's',
  },
  {
    type: 'range',
    id: 'skew',
    label: 'Skew',
    min: -30,
    max: 30,
    step: 1,
    default: 0,
    unit: 'deg',
  },
  {
    type: 'range',
    id: 'duration',
    label: 'Duration',
    min: 0.2,
    max: 3,
    step: 0.1,
    default: 0.8,
    unit: 's',
  },
  {
    type: 'easing',
    id: 'easing',
    label: 'Easing',
    default: 'power3.out',
  },
];

type MaskWordData = {
  unit: SplitUnit;
  wrapper: HTMLSpanElement;
  inner: HTMLElement;
  startX: number;
  startY: number;
  startSkewX: number;
  startSkewY: number;
};

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { delay, staggerOrigin } = timing;

  const direction = (params.direction as string) ?? 'up';
  const stagger = (params.stagger as number) ?? 0.08;
  const skew = (params.skew as number) ?? 0;
  const duration = (params.duration as number) ?? 0.8;
  const easingStr = (params.easing as string) ?? 'power3.out';

  const total = units.length;
  const staggers = buildStaggerArray(total, staggerOrigin, stagger);
  const easing = parseTimingEasing(easingStr);

  const data: MaskWordData[] = units.map((unit) => {
    const el = unit.el;
    const parent = el.parentNode;

    const wrapper = document.createElement('span');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.display = 'inline-block';
    wrapper.style.overflow = 'hidden';
    wrapper.style.verticalAlign = 'baseline';
    wrapper.style.willChange = 'transform';

    const inner = el;
    const prevDisplay = inner.style.display;
    inner.style.display = 'inline-block';
    if (prevDisplay) {
      inner.style.display = prevDisplay === 'inline' ? 'inline-block' : prevDisplay;
    }

    if (parent) {
      parent.replaceChild(wrapper, el);
      wrapper.appendChild(inner);
    }

    const rect = inner.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    let startX = 0;
    let startY = 0;
    let startSkewX = skew;
    let startSkewY = 0;

    switch (direction) {
      case 'up':
        startY = height;
        break;
      case 'down':
        startY = -height;
        break;
      case 'left':
        startX = width;
        break;
      case 'right':
        startX = -width;
        break;
    }

    if (direction === 'left' || direction === 'right') {
      startSkewY = skew;
      startSkewX = 0;
    }

    gsap.set(inner, {
      x: startX,
      y: startY,
      skewX: startSkewX,
      skewY: startSkewY,
    });

    return {
      unit,
      wrapper,
      inner,
      startX,
      startY,
      startSkewX,
      startSkewY,
    };
  });

  const tl = gsap.timeline();

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const staggerDelay = staggers[i] ?? 0;

    tl.to(
      d.inner,
      {
        x: 0,
        y: 0,
        skewX: 0,
        skewY: 0,
        duration: duration,
        delay: delay + staggerDelay,
        ease: easing,
      },
      0
    );
  }

  const cleanup = () => {
    for (const d of data) {
      gsap.set(d.inner, { x: 0, y: 0, skewX: 0, skewY: 0 });
      const parent = d.wrapper.parentNode;
      if (parent) {
        parent.replaceChild(d.inner, d.wrapper);
      }
    }
  };

  tl.eventCallback('onInterrupt', cleanup);
  tl.eventCallback('onComplete', cleanup);

  return tl;
}

export const maskRevealPreset: Preset = {
  id: 'maskReveal',
  name: 'Mask Reveal',
  category: 'Entrance',
  splitMode: 'words',
  params,
  build,
  cssExport: true,
  description: 'Words slide up from behind overflow-hidden masks.',
};

export default maskRevealPreset;
