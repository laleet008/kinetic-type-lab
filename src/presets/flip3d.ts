import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';
import { buildStaggerArray } from '../lib/timeline';

const params: ParamSpec[] = [
  {
    type: 'select',
    id: 'axis',
    label: 'Axis',
    options: [
      { value: 'x', label: 'X' },
      { value: 'y', label: 'Y' },
    ],
    default: 'y',
  },
  {
    type: 'range',
    id: 'perspective',
    label: 'Perspective',
    min: 100,
    max: 2000,
    step: 25,
    default: 800,
    unit: 'px',
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
      { value: 'forward', label: 'Forward' },
      { value: 'backward', label: 'Backward' },
      { value: 'random', label: 'Random' },
    ],
    default: 'forward',
  },
  {
    type: 'range',
    id: 'overshoot',
    label: 'Overshoot',
    min: 0,
    max: 5,
    step: 0.1,
    default: 1.2,
  },
];

type CharData = {
  unit: SplitUnit;
  el: HTMLElement;
  rotStart: number;
  translateZ: number;
  setRotateX: Function;
  setRotateY: Function;
  setFilter: Function;
  setZ: Function;
};

function build(ctx: PresetContext): gsap.core.Timeline {
  const { container, units, params, timing } = ctx;
  const { duration, delay, staggerOrigin } = timing;

  const axis = (params.axis as string) ?? 'y';
  const perspective = (params.perspective as number) ?? 800;
  const stagger = (params.stagger as number) ?? 0.05;
  const direction = (params.direction as string) ?? 'forward';
  const overshoot = (params.overshoot as number) ?? 1.2;

  const total = units.length;
  const staggers = buildStaggerArray(total, staggerOrigin, stagger);

  container.style.perspective = perspective + 'px';
  container.style.perspectiveOrigin = '50% 50%';

  const charData: CharData[] = units.map((unit) => {
    const el = unit.el;
    el.style.backfaceVisibility = 'hidden';

    let rotStart: number;
    const baseAngle = axis === 'x' ? 90 : 90;
    if (direction === 'backward') {
      rotStart = -baseAngle;
    } else if (direction === 'random') {
      rotStart = Math.random() > 0.5 ? baseAngle : -baseAngle;
    } else {
      rotStart = baseAngle;
    }

    gsap.set(el, {
      rotateX: axis === 'x' ? rotStart : 0,
      rotateY: axis === 'y' ? rotStart : 0,
      filter: 'brightness(0.3)',
      z: 0,
    });

    return {
      unit,
      el,
      rotStart,
      translateZ: axis === 'y' ? 30 : 0,
      setRotateX: gsap.quickSetter(el, 'rotateX', 'deg'),
      setRotateY: gsap.quickSetter(el, 'rotateY', 'deg'),
      setFilter: gsap.quickSetter(el, 'filter'),
      setZ: gsap.quickSetter(el, 'z', 'px'),
    };
  });

  const tl = gsap.timeline();

  const ease = overshoot > 0.01 ? `back.out(${overshoot})` : 'power2.out';

  for (let i = 0; i < charData.length; i++) {
    const cd = charData[i];
    const staggerDelay = staggers[i] ?? 0;

    if (axis === 'y') {
      tl.to(
        cd.el,
        {
          rotateY: 0,
          filter: 'brightness(1)',
          duration: duration,
          delay: delay + staggerDelay,
          ease: ease,
        },
        0
      );
      tl.to(
        cd.el,
        {
          z: cd.translateZ,
          duration: duration * 0.5,
          delay: delay + staggerDelay,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        },
        0
      );
    } else {
      tl.to(
        cd.el,
        {
          rotateX: 0,
          filter: 'brightness(1)',
          duration: duration,
          delay: delay + staggerDelay,
          ease: ease,
        },
        0
      );
    }
  }

  const cleanup = () => {
    container.style.perspective = '';
    container.style.perspectiveOrigin = '';
    for (const cd of charData) {
      gsap.set(cd.el, { rotateX: 0, rotateY: 0, filter: 'none', z: 0 });
    }
  };

  tl.eventCallback('onInterrupt', cleanup);
  tl.eventCallback('onComplete', cleanup);

  return tl;
}

export const flip3dPreset: Preset = {
  id: 'flip3d',
  name: '3D Flip',
  category: 'Entrance',
  splitMode: 'chars',
  params,
  build,
  cssExport: false,
  description: 'Chars rotate in on X or Y axis with perspective and brightness shift.',
};

export default flip3dPreset;
