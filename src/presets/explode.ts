import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';
import { buildStaggerArray, createRepeatConfig } from '../lib/timeline';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'force',
    label: 'Force',
    min: 50,
    max: 800,
    step: 10,
    default: 300,
    unit: 'px',
  },
  {
    type: 'range',
    id: 'spread',
    label: 'Spread',
    min: 0,
    max: 360,
    step: 10,
    default: 360,
    unit: 'deg',
  },
  {
    type: 'range',
    id: 'rotation',
    label: 'Rotation',
    min: 0,
    max: 720,
    step: 5,
    default: 180,
    unit: 'deg',
  },
  {
    type: 'range',
    id: 'gravity',
    label: 'Gravity',
    min: 0,
    max: 2,
    step: 0.1,
    default: 0.5,
  },
  {
    type: 'select',
    id: 'origin',
    label: 'Origin',
    options: [
      { value: 'center', label: 'Center' },
      { value: 'cursor', label: 'Cursor' },
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
      { value: 'random', label: 'Random' },
    ],
    default: 'center',
  },
  {
    type: 'toggle',
    id: 'reassemble',
    label: 'Reassemble',
    default: true,
  },
];

type QuickSetterFn = ReturnType<typeof gsap.quickSetter>;

type CharData = {
  unit: SplitUnit;
  angle: number;
  explodeX: number;
  explodeY: number;
  rotStart: number;
  setX: QuickSetterFn;
  setY: QuickSetterFn;
  setRotate: QuickSetterFn;
  baseX: number;
  baseY: number;
  baseRotate: number;
};

function computeAngle(
  unit: SplitUnit,
  origin: string,
  _idx: number,
  _total: number
): number {
  const rand = Math.random();
  switch (origin) {
    case 'center': {
      const dx = unit.normX - 0.5;
      const dy = unit.normY - 0.5;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        return rand * Math.PI * 2;
      }
      return Math.atan2(dy, dx);
    }
    case 'left': {
      return rand * Math.PI - Math.PI / 2;
    }
    case 'right': {
      return rand * Math.PI + Math.PI / 2;
    }
    case 'cursor': {
      const dx = unit.normX - 0.5;
      const dy = unit.normY - 0.5;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        return rand * Math.PI * 2;
      }
      return Math.atan2(dy, dx);
    }
    case 'random':
    default:
      return rand * Math.PI * 2;
  }
}

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { duration, delay, staggerAmount, staggerOrigin, easing, repeatMode } = timing;

  const force = (params.force as number) ?? 300;
  const spread = (params.spread as number) ?? 360;
  const rotation = (params.rotation as number) ?? 180;
  const gravity = (params.gravity as number) ?? 0.5;
  const origin = (params.origin as string) ?? 'center';
  const reassemble = (params.reassemble as boolean) ?? true;

  const total = units.length;
  const staggers = buildStaggerArray(total, staggerOrigin, staggerAmount);
  const { repeat, yoyo } = createRepeatConfig(repeatMode as 'loop' | 'once' | 'pingpong');

  const charData: CharData[] = units.map((unit, i) => {
    const angle = computeAngle(unit, origin, i, total);
    const spreadRad = (spread / 360) * Math.PI * 2;
    const angleWithSpread = angle + (Math.random() - 0.5) * spreadRad;
    const randomG = Math.random();
    const explodeX = Math.cos(angleWithSpread) * force + randomG * (spread / 360);
    const explodeY = Math.sin(angleWithSpread) * force;
    const rotDir = Math.random() > 0.5 ? 1 : -1;
    const rotStart = rotation * rotDir * (0.5 + Math.random() * 0.5);

    const el = unit.el;
    gsap.set(el, { x: 0, y: 0, rotate: 0 });

    return {
      unit,
      angle: angleWithSpread,
      explodeX,
      explodeY,
      rotStart,
      setX: gsap.quickSetter(el, 'x', 'px'),
      setY: gsap.quickSetter(el, 'y', 'px'),
      setRotate: gsap.quickSetter(el, 'rotate', 'deg'),
      baseX: 0,
      baseY: 0,
      baseRotate: 0,
    };
  });

  const tl = gsap.timeline();
  const timeVars = { t: 0 };
  const explodePhase = reassemble ? 0.5 : 1.0;
  const explodeDuration = duration * explodePhase;
  const reassembleDuration = reassemble ? duration * (1 - explodePhase) : 0;

  const state = { exploded: false };

  tl.to(timeVars, {
    t: 1,
    duration: explodeDuration,
    delay,
    ease: easing,
    onUpdate: () => {
      const p = timeVars.t;
      for (let i = 0; i < charData.length; i++) {
        const cd = charData[i];
        const staggerT = Math.max(0, Math.min(1, (p - staggers[i]) / Math.max(0.0001, 1 - staggers[i])));
        const eased = gsap.parseEase(easing)(staggerT);
        const g = gravity * 800 * Math.pow(eased * explodeDuration, 2) * 0.01;
        cd.setX(cd.explodeX * eased);
        cd.setY(cd.explodeY * eased + g);
        cd.setRotate(cd.rotStart * eased);
      }
    },
  });

  if (reassemble) {
    tl.call(() => {
      state.exploded = true;
      timeVars.t = 0;
    });
    tl.to(timeVars, {
      t: 1,
      duration: reassembleDuration,
      ease: 'power3.inOut',
      onUpdate: () => {
        const p = timeVars.t;
        for (let i = charData.length - 1; i >= 0; i--) {
          const cd = charData[i];
          const revIdx = total - 1 - i;
          const staggerT = Math.max(0, Math.min(1, (p - (staggers[revIdx] ?? 0)) / Math.max(0.0001, 1 - (staggers[revIdx] ?? 0))));
          const eased = 1 - gsap.parseEase('power3.inOut')(staggerT);
          const g = gravity * 800 * Math.pow(explodeDuration, 2) * 0.01;
          cd.setX(cd.explodeX * eased);
          cd.setY(cd.explodeY * eased + g * eased);
          cd.setRotate(cd.rotStart * eased);
        }
      },
    });
  }

  if (repeat === -1) {
    tl.repeat(-1);
    tl.yoyo(yoyo);
  }

  tl.eventCallback('onInterrupt', () => {
    for (const cd of charData) {
      cd.setX(0);
      cd.setY(0);
      cd.setRotate(0);
    }
  });

  tl.eventCallback('onComplete', () => {
    for (const cd of charData) {
      cd.setX(0);
      cd.setY(0);
      cd.setRotate(0);
    }
  });

  return tl;
}

export const explodePreset: Preset = {
  id: 'explode',
  name: 'Explode',
  category: 'Entrance',
  splitMode: 'chars',
  params,
  build,
  cssExport: false,
  description: 'Chars blast outward from origin then optionally reassemble.',
};

export default explodePreset;
