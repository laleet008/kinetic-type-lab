import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext } from './index';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'weightRange',
    label: 'Weight Range',
    min: 0,
    max: 800,
    step: 10,
    default: 600,
    unit: 'Δwght',
  },
  {
    type: 'range',
    id: 'waveSpeed',
    label: 'Wave Speed',
    min: 0.5,
    max: 5,
    step: 0.1,
    default: 2,
    unit: '×',
  },
  {
    type: 'range',
    id: 'wavelength',
    label: 'Wavelength',
    min: 1,
    max: 30,
    step: 0.5,
    default: 8,
    unit: 'chars',
  },
  {
    type: 'select',
    id: 'axis',
    label: 'Axis',
    options: [
      { value: 'wght', label: 'Weight' },
      { value: 'wdth', label: 'Width' },
      { value: 'wghtwdth', label: 'Weight + Width' },
      { value: 'opsz', label: 'Optical Size' },
      { value: 'slnt', label: 'Slant' },
    ],
    default: 'wght',
  },
  {
    type: 'range',
    id: 'baseWeight',
    label: 'Base Weight',
    min: 100,
    max: 900,
    step: 10,
    default: 400,
  },
];

type QuickSetterFn = ReturnType<typeof gsap.quickSetter>;

type CharSetter = {
  el: HTMLElement;
  setFVS: QuickSetterFn;
  phase: number;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { duration } = timing;

  const weightRange = (params.weightRange as number) ?? 600;
  const waveSpeed = (params.waveSpeed as number) ?? 2;
  const wavelength = (params.wavelength as number) ?? 8;
  const axis = (params.axis as string) ?? 'wght';
  const baseWeight = (params.baseWeight as number) ?? 400;

  const tl = gsap.timeline();

  const baseFVS =
    units.length > 0
      ? window.getComputedStyle(units[0].el).fontVariationSettings || ''
      : '';

  const charSetters: CharSetter[] = units.map((unit, i) => {
    const el = unit.el;
    const phase = i * ((Math.PI * 2) / wavelength);
    return {
      el,
      setFVS: gsap.quickSetter(el, 'fontVariationSettings'),
      phase,
    };
  });

  const timeVars = { t: 0 };

  const useWght = axis === 'wght' || axis === 'wghtwdth';
  const useWdth = axis === 'wdth' || axis === 'wghtwdth';
  const useOpsz = axis === 'opsz';
  const useSlnt = axis === 'slnt';

  tl.to(timeVars, {
    t: Math.PI * 2,
    duration,
    ease: 'none',
    repeat: -1,
    onUpdate: () => {
      const t = timeVars.t * waveSpeed;
      for (let i = 0; i < charSetters.length; i++) {
        const cs = charSetters[i];
        const sin = Math.sin(cs.phase + t);
        const mapped = (sin + 1) / 2;

        const parts: string[] = [];

        if (useWght) {
          const halfRange = weightRange / 2;
          const wght = clamp(baseWeight - halfRange + weightRange * mapped, 100, 900);
          parts.push(`'wght' ${wght}`);
        }
        if (useWdth) {
          const halfRange = 50;
          const baseWdth = 100;
          const wdth = clamp(baseWdth - halfRange + 100 * mapped, 25, 151);
          parts.push(`'wdth' ${wdth.toFixed(1)}`);
        }
        if (useOpsz) {
          const halfRange = 42;
          const baseOpsz = 54;
          const opsz = clamp(baseOpsz - halfRange + 84 * mapped, 12, 96);
          parts.push(`'opsz' ${opsz.toFixed(1)}`);
        }
        if (useSlnt) {
          const slnt = clamp(-5 + 5 * mapped, -10, 0);
          parts.push(`'slnt' ${slnt.toFixed(2)}`);
        }

        if (parts.length > 0) {
          cs.setFVS(parts.join(', '));
        }
      }
    },
  });

  const cleanup = () => {
    for (const cs of charSetters) {
      cs.setFVS(baseFVS || 'normal');
    }
  };

  tl.eventCallback('onInterrupt', cleanup);
  tl.eventCallback('onComplete', cleanup);

  return tl;
}

export const variableWavePreset: Preset = {
  id: 'variableWave',
  name: 'Variable Wave',
  category: 'Loop',
  splitMode: 'chars',
  params,
  build,
  cssExport: false,
  description:
    'Animates the wght axis (and wdth where available) as a travelling wave. No position movement.',
};

export default variableWavePreset;
