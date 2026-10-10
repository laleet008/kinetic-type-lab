import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';
import { buildStaggerArray, createRepeatConfig } from '../lib/timeline';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'blurAmount',
    label: 'Blur Amount',
    min: 0,
    max: 40,
    step: 1,
    default: 20,
    unit: 'px',
  },
  {
    type: 'range',
    id: 'scaleFrom',
    label: 'Scale From',
    min: 0.1,
    max: 3,
    step: 0.05,
    default: 1.5,
  },
  {
    type: 'range',
    id: 'stagger',
    label: 'Stagger',
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.05,
    unit: 's',
  },
  {
    type: 'select',
    id: 'direction',
    label: 'Direction',
    options: [
      { value: 'none', label: 'None' },
      { value: 'up', label: 'From Above' },
      { value: 'down', label: 'From Below' },
      { value: 'left', label: 'From Left' },
      { value: 'right', label: 'From Right' },
      { value: 'random', label: 'Random Direction' },
    ],
    default: 'none',
  },
  {
    type: 'range',
    id: 'threshold',
    label: 'Threshold',
    min: 0,
    max: 2,
    step: 0.05,
    default: 1,
    unit: '×',
  },
];

type CharData = {
  unit: SplitUnit;
  el: HTMLElement;
  startX: number;
  startY: number;
};

function build(ctx: PresetContext): gsap.core.Timeline {
  const { container, units, params, timing } = ctx;
  const { duration, delay, staggerOrigin, easing, repeatMode } = timing;

  const blurAmount = (params.blurAmount as number) ?? 20;
  const scaleFrom = (params.scaleFrom as number) ?? 1.5;
  const stagger = (params.stagger as number) ?? 0.05;
  const direction = (params.direction as string) ?? 'none';
  const threshold = (params.threshold as number) ?? 1;

  const total = units.length;
  const staggers = buildStaggerArray(total, staggerOrigin, stagger);
  const { repeat, yoyo } = createRepeatConfig(repeatMode as 'loop' | 'once' | 'pingpong');

  const fontSizeStr = container
    ? window.getComputedStyle(container).fontSize
    : '16px';
  const fontSize = parseFloat(fontSizeStr) || 16;
  const distance = fontSize * threshold;

  const charData: CharData[] = units.map((unit) => {
    const el = unit.el;

    let startX = 0;
    let startY = 0;

    switch (direction) {
      case 'up':
        startY = -distance;
        break;
      case 'down':
        startY = distance;
        break;
      case 'left':
        startX = -distance;
        break;
      case 'right':
        startX = distance;
        break;
      case 'random': {
        const angle = Math.random() * Math.PI * 2;
        startX = Math.cos(angle) * distance;
        startY = Math.sin(angle) * distance;
        break;
      }
      case 'none':
      default:
        startX = 0;
        startY = 0;
        break;
    }

    gsap.set(el, {
      x: startX,
      y: startY,
      scale: scaleFrom,
      opacity: 0,
      filter: `blur(${blurAmount}px)`,
    });

    return {
      unit,
      el,
      startX,
      startY,
    };
  });

  const tl = gsap.timeline();
  const ease = easing || 'power3.out';

  for (let i = 0; i < charData.length; i++) {
    const cd = charData[i];
    const staggerDelay = staggers[i] ?? 0;

    tl.to(
      cd.el,
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration,
        delay: delay + staggerDelay,
        ease,
      },
      0
    );
  }

  if (repeat === -1) {
    tl.repeat(-1);
    tl.yoyo(yoyo);
  }

  const cleanup = () => {
    for (const cd of charData) {
      gsap.set(cd.el, {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        filter: 'none',
      });
    }
  };

  tl.eventCallback('onInterrupt', cleanup);
  tl.eventCallback('onComplete', cleanup);

  return tl;
}

export const blurFocusPreset: Preset = {
  id: 'blurFocus',
  name: 'Blur Focus',
  category: 'Entrance',
  splitMode: 'chars',
  params,
  build,
  cssExport: true,
  description:
    'Chars arrive from heavy blur with scale and opacity shift.',
};

export default blurFocusPreset;
