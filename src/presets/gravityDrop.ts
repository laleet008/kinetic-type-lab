import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';
import { buildStaggerArray, createRepeatConfig } from '../lib/timeline';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'distance',
    label: 'Distance',
    min: 50,
    max: 1000,
    step: 20,
    default: 400,
    unit: 'px',
  },
  {
    type: 'range',
    id: 'stagger',
    label: 'Stagger',
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.06,
    unit: 's',
  },
  {
    type: 'range',
    id: 'bounce',
    label: 'Bounce',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.3,
  },
  {
    type: 'range',
    id: 'randomOffset',
    label: 'Random Offset',
    min: 0,
    max: 200,
    step: 5,
    default: 50,
    unit: 'px',
  },
  {
    type: 'range',
    id: 'fallRotation',
    label: 'Fall Rotation',
    min: -180,
    max: 180,
    step: 5,
    default: 20,
    unit: 'deg',
  },
];

type CharData = {
  unit: SplitUnit;
  el: HTMLElement;
  startX: number;
  startY: number;
  startRotate: number;
};

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { duration, delay, staggerOrigin, easing, repeatMode } = timing;

  const distance = (params.distance as number) ?? 400;
  const stagger = (params.stagger as number) ?? 0.06;
  const bounce = (params.bounce as number) ?? 0.3;
  const randomOffset = (params.randomOffset as number) ?? 50;
  const fallRotation = (params.fallRotation as number) ?? 20;

  const total = units.length;
  const staggers = buildStaggerArray(total, staggerOrigin, stagger);
  const { repeat, yoyo } = createRepeatConfig(repeatMode as 'loop' | 'once' | 'pingpong');

  const charData: CharData[] = units.map((unit) => {
    const el = unit.el;
    const yStart = -distance - Math.random() * randomOffset;
    const xStart = (Math.random() - 0.5) * randomOffset;
    const rotDir = Math.random() > 0.5 ? 1 : -1;
    const rotStart = fallRotation * rotDir * (0.5 + Math.random() * 0.5);

    gsap.set(el, {
      x: xStart,
      y: yStart,
      rotate: rotStart,
      opacity: 0,
    });

    return {
      unit,
      el,
      startX: xStart,
      startY: yStart,
      startRotate: rotStart,
    };
  });

  const tl = gsap.timeline();

  let fallEase: string | gsap.EaseFunction = easing;
  if (bounce > 0.01) {
    const bounceStrength = Math.min(1.7, 1 + bounce * 0.7);
    fallEase = `back.out(${bounceStrength})`;
  }

  for (let i = 0; i < charData.length; i++) {
    const cd = charData[i];
    const staggerDelay = staggers[i] ?? 0;
    const charDuration = duration * (0.6 + Math.random() * 0.4);

    tl.to(
      cd.el,
      {
        x: 0,
        y: 0,
        rotate: 0,
        opacity: 1,
        duration: charDuration,
        delay: delay + staggerDelay,
        ease: fallEase,
      },
      0
    );
  }

  if (repeat === -1) {
    tl.repeat(-1);
    tl.yoyo(yoyo);
  }

  tl.eventCallback('onInterrupt', () => {
    for (const cd of charData) {
      gsap.set(cd.el, { x: 0, y: 0, rotate: 0, opacity: 1 });
    }
  });

  tl.eventCallback('onComplete', () => {
    for (const cd of charData) {
      gsap.set(cd.el, { x: 0, y: 0, rotate: 0, opacity: 1 });
    }
  });

  return tl;
}

export const gravityDropPreset: Preset = {
  id: 'gravityDrop',
  name: 'Gravity Drop',
  category: 'Entrance',
  splitMode: 'chars',
  params,
  build,
  cssExport: true,
  description:
    'Characters fall in with easing and a small bounce, staggered.',
};

export default gravityDropPreset;
