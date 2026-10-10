import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext } from './index';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'amplitude',
    label: 'Amplitude',
    min: 0,
    max: 200,
    step: 1,
    default: 40,
    unit: 'px',
  },
  {
    type: 'range',
    id: 'wavelength',
    label: 'Wavelength',
    min: 1,
    max: 30,
    step: 0.5,
    default: 6,
    unit: 'chars',
  },
  {
    type: 'range',
    id: 'speed',
    label: 'Speed',
    min: 0.5,
    max: 5,
    step: 0.1,
    default: 1.5,
    unit: '×',
  },
  {
    type: 'select',
    id: 'direction',
    label: 'Direction',
    options: [
      { value: 'horizontal', label: 'Horizontal' },
      { value: 'vertical', label: 'Vertical' },
      { value: 'both', label: 'Both' },
    ],
    default: 'vertical',
  },
  {
    type: 'range',
    id: 'rotateCouple',
    label: 'Rotate',
    min: -30,
    max: 30,
    step: 1,
    default: 0,
    unit: 'deg',
  },
];

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { duration } = timing;

  const amplitude = (params.amplitude as number) ?? 40;
  const wavelength = (params.wavelength as number) ?? 6;
  const speed = (params.speed as number) ?? 1.5;
  const direction = (params.direction as string) ?? 'vertical';
  const rotateCouple = (params.rotateCouple as number) ?? 0;

  const tl = gsap.timeline();

  const phases = units.map((u, i) => {
    const wavefrontPhase = u.normX * Math.PI * 2;
    const indexPhase = (i / wavelength) * Math.PI * 2;
    return indexPhase + wavefrontPhase * 0.3;
  });

  const timeVars = { t: 0 };

  const setters = units.map((unit, i) => {
    const el = unit.el;
    const setX = gsap.quickSetter(el, 'x', 'px');
    const setY = gsap.quickSetter(el, 'y', 'px');
    const setRotate = gsap.quickSetter(el, 'rotate', 'deg');
    return { el, setX, setY, setRotate, phase: phases[i] };
  });

  tl.to(timeVars, {
    t: Math.PI * 2,
    duration,
    ease: 'none',
    repeat: -1,
    onUpdate: () => {
      const t = timeVars.t * speed;
      for (let i = 0; i < setters.length; i++) {
        const s = setters[i];
        const sin = Math.sin(s.phase + t);
        if (direction === 'vertical' || direction === 'both') {
          s.setY(sin * amplitude);
        }
        if (direction === 'horizontal' || direction === 'both') {
          s.setX(sin * amplitude * (direction === 'both' ? 0.5 : 1));
        }
        if (rotateCouple !== 0) {
          const cos = Math.cos(s.phase + t);
          s.setRotate(cos * rotateCouple);
        }
      }
    },
  });

  return tl;
}

export const wavePreset: Preset = {
  id: 'wave',
  name: 'Wave',
  category: 'Loop',
  splitMode: 'chars',
  params,
  build,
  cssExport: false,
  description:
    'Characters rise and fall on a sine wave offset by index.',
};

export default wavePreset;
