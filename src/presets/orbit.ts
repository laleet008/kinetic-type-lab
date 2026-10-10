import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';
import { buildStaggerArray, createRepeatConfig } from '../lib/timeline';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'radius',
    label: 'Radius',
    min: 50,
    max: 800,
    step: 10,
    default: 300,
    unit: 'px',
  },
  {
    type: 'range',
    id: 'arcDeg',
    label: 'Arc Degrees',
    min: 30,
    max: 720,
    step: 10,
    default: 360,
    unit: 'deg',
  },
  {
    type: 'select',
    id: 'direction',
    label: 'Direction',
    options: [
      { value: 'cw', label: 'Clockwise' },
      { value: 'ccw', label: 'Counterclockwise' },
    ],
    default: 'cw',
  },
  {
    type: 'range',
    id: 'stagger',
    label: 'Stagger',
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.03,
    unit: 's',
  },
  {
    type: 'toggle',
    id: 'rotateWithPath',
    label: 'Rotate With Path',
    default: true,
  },
];

type QuickSetterFn = ReturnType<typeof gsap.quickSetter>;

type CharData = {
  unit: SplitUnit;
  el: HTMLElement;
  setX: QuickSetterFn;
  setY: QuickSetterFn;
  setRotate: QuickSetterFn;
  startAngle: number;
};

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { duration, delay, staggerOrigin, easing, repeatMode } = timing;

  const radius = (params.radius as number) ?? 300;
  const arcDeg = (params.arcDeg as number) ?? 360;
  const direction = (params.direction as string) ?? 'cw';
  const stagger = (params.stagger as number) ?? 0.03;
  const rotateWithPath = (params.rotateWithPath as boolean) ?? true;

  const total = units.length;
  const staggers = buildStaggerArray(total, staggerOrigin, stagger);
  const { repeat, yoyo } = createRepeatConfig(repeatMode as 'loop' | 'once' | 'pingpong');

  const arcRad = (arcDeg * Math.PI) / 180;
  const dirSign = direction === 'ccw' ? -1 : 1;

  const charData: CharData[] = units.map((unit) => {
    const el = unit.el;
    const startAngle = Math.random() * Math.PI * 2;

    gsap.set(el, { x: 0, y: 0, rotate: 0 });

    return {
      unit,
      el,
      setX: gsap.quickSetter(el, 'x', 'px'),
      setY: gsap.quickSetter(el, 'y', 'px'),
      setRotate: gsap.quickSetter(el, 'rotate', 'deg'),
      startAngle,
    };
  });

  const tl = gsap.timeline();
  const timeVars = { t: 0 };

  tl.to(timeVars, {
    t: 1,
    duration,
    delay,
    ease: easing || 'power3.out',
    onUpdate: () => {
      const globalT = timeVars.t;
      for (let i = 0; i < charData.length; i++) {
        const cd = charData[i];
        const staggerT = staggers[i] ?? 0;
        const localT = Math.max(0, Math.min(1, (globalT - staggerT) / Math.max(0.0001, 1 - staggerT)));

        const eased = gsap.parseEase(easing || 'power3.out')(localT);

        const currentRadius = radius * (1 - eased);
        const angleTraveled = arcRad * eased * dirSign;
        const currentAngle = cd.startAngle + angleTraveled;

        const x = currentRadius * Math.cos(currentAngle);
        const y = currentRadius * Math.sin(currentAngle);

        cd.setX(x);
        cd.setY(y);

        if (rotateWithPath) {
          const tangentAngle = currentAngle + (dirSign > 0 ? Math.PI / 2 : -Math.PI / 2);
          const tangentDeg = (tangentAngle * 180) / Math.PI;
          cd.setRotate(tangentDeg);
        }
      }
    },
  });

  if (repeat === -1) {
    tl.repeat(-1);
    tl.yoyo(yoyo);
  }

  const cleanup = () => {
    for (const cd of charData) {
      cd.setX(0);
      cd.setY(0);
      cd.setRotate(0);
    }
  };

  tl.eventCallback('onInterrupt', cleanup);
  tl.eventCallback('onComplete', cleanup);

  return tl;
}

export const orbitPreset: Preset = {
  id: 'orbit',
  name: 'Orbit',
  category: 'Entrance',
  splitMode: 'chars',
  params,
  build,
  cssExport: false,
  description:
    'Chars travel along a circular MotionPath into their final positions.',
};

export default orbitPreset;
