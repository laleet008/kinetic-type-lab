import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';
import { buildStaggerArray, createRepeatConfig } from '../lib/timeline';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'stretchAmount',
    label: 'Stretch Amount',
    min: 0,
    max: 2,
    step: 0.05,
    default: 0.8,
  },
  {
    type: 'select',
    id: 'pivot',
    label: 'Pivot',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ],
    default: 'center',
  },
  {
    type: 'range',
    id: 'stagger',
    label: 'Stagger',
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.04,
    unit: 's',
  },
  {
    type: 'range',
    id: 'springStiffness',
    label: 'Spring Stiffness',
    min: 1,
    max: 10,
    step: 0.1,
    default: 4,
  },
];

type CharData = {
  unit: SplitUnit;
  el: HTMLElement;
  useWdth: boolean;
  baseWdth: number;
};

function detectWdthSupport(el: HTMLElement): { supported: boolean; baseWdth: number } {
  const computed = window.getComputedStyle(el).fontVariationSettings || '';
  const wdthMatch = computed.match(/'wdth'\s*([\d.]+)/);
  const baseWdth = wdthMatch ? parseFloat(wdthMatch[1]) : 100;

  const prev = el.style.fontVariationSettings;
  el.style.fontVariationSettings = prev ? `${prev}, 'wdth' 125` : `'wdth' 125`;
  const after = window.getComputedStyle(el).fontVariationSettings || '';
  el.style.fontVariationSettings = prev;

  const hasWdth = after.includes("'wdth'") || after.includes('"wdth"');
  return { supported: hasWdth, baseWdth };
}

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { duration, delay, staggerOrigin, repeatMode } = timing;

  const stretchAmount = (params.stretchAmount as number) ?? 0.8;
  const pivot = (params.pivot as string) ?? 'center';
  const stagger = (params.stagger as number) ?? 0.04;
  const springStiffness = (params.springStiffness as number) ?? 4;

  const total = units.length;
  const staggers = buildStaggerArray(total, staggerOrigin, stagger);
  const { repeat, yoyo } = createRepeatConfig(repeatMode as 'loop' | 'once' | 'pingpong');

  const transformOriginMap: Record<string, string> = {
    left: '0% 50%',
    center: '50% 50%',
    right: '100% 50%',
  };
  const transformOrigin = transformOriginMap[pivot] || '50% 50%';

  const sampleEl = units[0]?.el;
  const globalWdthInfo = sampleEl
    ? detectWdthSupport(sampleEl)
    : { supported: false, baseWdth: 100 };

  const charData: CharData[] = units.map((unit) => {
    const el = unit.el;
    const info = globalWdthInfo;
    el.style.transformOrigin = transformOrigin;

    return {
      unit,
      el,
      useWdth: info.supported,
      baseWdth: info.baseWdth,
    };
  });

  for (const cd of charData) {
    const scaleMult = 1 + stretchAmount;
    const wdthVal = cd.baseWdth * scaleMult;

    if (cd.useWdth) {
      const current = window.getComputedStyle(cd.el).fontVariationSettings || '';
      const withoutWdth = current.replace(/['"]wdth['"]\s*[\d.]+\s*,?\s*/g, '').replace(/,\s*$/, '').trim();
      const base = withoutWdth ? `${withoutWdth}, ` : '';
      gsap.set(cd.el, {
        fontVariationSettings: `${base}'wdth' ${wdthVal}`,
        opacity: 0.6,
      });
    } else {
      gsap.set(cd.el, {
        scaleX: scaleMult,
        opacity: 0.6,
      });
    }
  }

  const tl = gsap.timeline();
  const ease = `elastic.out(${springStiffness}, 0.5)`;

  for (let i = 0; i < charData.length; i++) {
    const cd = charData[i];
    const staggerDelay = staggers[i] ?? 0;

    if (cd.useWdth) {
      const current = window.getComputedStyle(cd.el).fontVariationSettings || '';
      const withoutWdth = current.replace(/['"]wdth['"]\s*[\d.]+\s*,?\s*/g, '').replace(/,\s*$/, '').trim();
      const base = withoutWdth ? withoutWdth : 'normal';
      tl.to(
        cd.el,
        {
          fontVariationSettings: base,
          opacity: 1,
          duration,
          delay: delay + staggerDelay,
          ease,
        },
        0
      );
    } else {
      tl.to(
        cd.el,
        {
          scaleX: 1,
          opacity: 1,
          duration,
          delay: delay + staggerDelay,
          ease,
        },
        0
      );
    }
  }

  if (repeat === -1) {
    tl.repeat(-1);
    tl.yoyo(yoyo);
  }

  const cleanup = () => {
    for (const cd of charData) {
      const currentFvs = window.getComputedStyle(cd.el).fontVariationSettings || '';
      const withoutWdth = currentFvs.replace(/['"]wdth['"]\s*[\d.]+\s*,?\s*/g, '').replace(/,\s*$/, '').trim();
      gsap.set(cd.el, {
        fontVariationSettings: withoutWdth || 'normal',
        scaleX: 1,
        opacity: 1,
      });
      cd.el.style.transformOrigin = '';
    }
  };

  tl.eventCallback('onInterrupt', cleanup);
  tl.eventCallback('onComplete', cleanup);

  return tl;
}

export const elasticStretchPreset: Preset = {
  id: 'elasticStretch',
  name: 'Elastic Stretch',
  category: 'Effect',
  splitMode: 'chars',
  params,
  build,
  cssExport: false,
  description:
    'Chars stretch on wdth/scaleX from a pivot and snap back with spring physics.',
};

export default elasticStretchPreset;
