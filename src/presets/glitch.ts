import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'intensity',
    label: 'Intensity',
    min: 0,
    max: 100,
    step: 1,
    default: 50,
    unit: '%',
  },
  {
    type: 'range',
    id: 'sliceCount',
    label: 'Slices',
    min: 1,
    max: 20,
    step: 1,
    default: 6,
  },
  {
    type: 'range',
    id: 'frequency',
    label: 'Frequency',
    min: 0.1,
    max: 1,
    step: 0.05,
    default: 0.4,
    unit: 'Hz',
  },
  {
    type: 'range',
    id: 'channelOffset',
    label: 'Channel Offset',
    min: 0,
    max: 30,
    step: 1,
    default: 8,
    unit: 'px',
  },
  {
    type: 'select',
    id: 'colorMode',
    label: 'Color Mode',
    options: [
      { value: 'color', label: 'Color' },
      { value: 'mono', label: 'Mono' },
    ],
    default: 'color',
  },
];

type GlitchUnitData = {
  unit: SplitUnit;
  origContent: string;
  origDisplay: string;
  layerR: HTMLElement;
  layerG: HTMLElement;
  layerB: HTMLElement;
  setParentX: Function;
  setParentY: Function;
  setRX: Function;
  setBX: Function;
  setRClip: Function;
  setGClip: Function;
  setBClip: Function;
  setRBlur: Function;
  setGBlur: Function;
  setBBlur: Function;
};

function buildLayers(units: SplitUnit[], channelOffset: number, colorMode: string): GlitchUnitData[] {
  const result: GlitchUnitData[] = [];

  for (const unit of units) {
    const el = unit.el;
    const origContent = el.textContent || '';
    const origDisplay = el.style.display || 'inline-block';

    el.style.position = 'relative';
    el.style.display = origDisplay;
    el.textContent = '';

    const layerR = document.createElement('span');
    const layerG = document.createElement('span');
    const layerB = document.createElement('span');

    for (const layer of [layerR, layerG, layerB]) {
      layer.textContent = origContent;
      layer.style.position = 'absolute';
      layer.style.left = '0';
      layer.style.top = '0';
      layer.style.whiteSpace = 'nowrap';
      layer.style.pointerEvents = 'none';
      layer.style.willChange = 'transform, clip-path, filter';
    }

    if (colorMode === 'color') {
      layerR.style.color = '#FF3355';
      layerG.style.color = '#33FF88';
      layerB.style.color = '#3388FF';
      layerR.style.mixBlendMode = 'screen';
      layerG.style.mixBlendMode = 'screen';
      layerB.style.mixBlendMode = 'screen';
    } else {
      layerR.style.color = 'inherit';
      layerG.style.color = 'inherit';
      layerB.style.color = 'inherit';
    }

    el.appendChild(layerR);
    el.appendChild(layerG);
    el.appendChild(layerB);

    result.push({
      unit,
      origContent,
      origDisplay,
      layerR,
      layerG,
      layerB,
      setParentX: gsap.quickSetter(el, 'x', 'px'),
      setParentY: gsap.quickSetter(el, 'y', 'px'),
      setRX: gsap.quickSetter(layerR, 'x', 'px'),
      setBX: gsap.quickSetter(layerB, 'x', 'px'),
      setRClip: gsap.quickSetter(layerR, 'clipPath'),
      setGClip: gsap.quickSetter(layerG, 'clipPath'),
      setBClip: gsap.quickSetter(layerB, 'clipPath'),
      setRBlur: gsap.quickSetter(layerR, 'filter'),
      setGBlur: gsap.quickSetter(layerG, 'filter'),
      setBBlur: gsap.quickSetter(layerB, 'filter'),
    });
  }

  for (const d of result) {
    d.setRX(-channelOffset);
    d.setBX(channelOffset);
    d.setRClip('none');
    d.setGClip('none');
    d.setBClip('none');
    d.setRBlur('none');
    d.setGBlur('none');
    d.setBBlur('none');
  }

  return result;
}

function randomClip(): string {
  const top = Math.floor(Math.random() * 70) + 5;
  const bottom = top + Math.floor(Math.random() * 25) + 5;
  return `inset(${top}% 0 ${100 - Math.min(bottom, 95)}% 0)`;
}

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { duration, delay } = timing;

  const intensityPct = ((params.intensity as number) ?? 50) / 100;
  const sliceCount = (params.sliceCount as number) ?? 6;
  const frequency = (params.frequency as number) ?? 0.4;
  const channelOffset = (params.channelOffset as number) ?? 8;
  const colorMode = (params.colorMode as string) ?? 'color';

  const glitchIntervalMs = Math.max(50, 1000 / (frequency * 10));

  const data = buildLayers(units, channelOffset, colorMode);

  const tl = gsap.timeline();

  let glitchAccum = 0;
  let sliceAccum = 0;
  const timeVars = { t: 0 };

  tl.to(timeVars, {
    t: duration + delay,
    duration: duration + delay,
    ease: 'none',
    onUpdate: () => {
      const dt = 1 / 60;
      glitchAccum += dt;
      sliceAccum += dt;

      const jitterStrength = intensityPct * 4;
      const glitchActive = glitchAccum * 1000 > glitchIntervalMs;

      if (glitchActive) {
        glitchAccum = 0;
        for (let i = 0; i < data.length; i++) {
          const d = data[i];
          const roll = Math.random();
          if (roll < 0.4 * intensityPct + 0.05) {
            d.setParentX((Math.random() - 0.5) * jitterStrength * 3);
          } else {
            d.setParentX(0);
          }
          if (Math.random() < 0.15 * intensityPct) {
            d.setParentY((Math.random() - 0.5) * jitterStrength);
          } else {
            d.setParentY(0);
          }

          if (roll < 0.35 * intensityPct + 0.1) {
            const offsetVar = channelOffset * intensityPct;
            d.setRX(-channelOffset + (Math.random() - 0.5) * offsetVar * 1.5);
            d.setBX(channelOffset + (Math.random() - 0.5) * offsetVar * 1.5);
          } else {
            d.setRX(-channelOffset);
            d.setBX(channelOffset);
          }
        }
      }

      if (sliceAccum * 1000 > 100) {
        sliceAccum = 0;
        const sliceThreshold = 1 - (sliceCount / 25) * intensityPct;
        for (let i = 0; i < data.length; i++) {
          const d = data[i];

          if (colorMode === 'mono') {
            if (Math.random() > sliceThreshold + 0.2) {
              const blur = Math.random() * 3 * intensityPct;
              d.setRBlur(`blur(${blur.toFixed(2)}px)`);
              d.setGBlur(`blur(${(blur * 0.5).toFixed(2)}px)`);
              d.setBBlur(`blur(${blur.toFixed(2)}px)`);
            } else {
              d.setRBlur('none');
              d.setGBlur('none');
              d.setBBlur('none');
            }
          }

          if (Math.random() > sliceThreshold) {
            if (Math.random() < 0.5) {
              d.setRClip(randomClip());
            } else {
              d.setRClip('none');
            }
          } else {
            d.setRClip('none');
          }

          if (Math.random() > sliceThreshold + 0.05) {
            if (Math.random() < 0.5) {
              d.setGClip(randomClip());
            } else {
              d.setGClip('none');
            }
          } else {
            d.setGClip('none');
          }

          if (Math.random() > sliceThreshold) {
            if (Math.random() < 0.5) {
              d.setBClip(randomClip());
            } else {
              d.setBClip('none');
            }
          } else {
            d.setBClip('none');
          }
        }
      }
    },
  });

  tl.eventCallback('onInterrupt', () => {
    for (const d of data) {
      d.setParentX(0);
      d.setParentY(0);
      d.setRX(-channelOffset);
      d.setBX(channelOffset);
      d.setRClip('none');
      d.setGClip('none');
      d.setBClip('none');
      d.setRBlur('none');
      d.setGBlur('none');
      d.setBBlur('none');
    }
  });

  tl.eventCallback('onComplete', () => {
    for (const d of data) {
      d.setParentX(0);
      d.setParentY(0);
      d.setRX(-channelOffset);
      d.setBX(channelOffset);
      d.setRClip('none');
      d.setGClip('none');
      d.setBClip('none');
      d.setRBlur('none');
      d.setGBlur('none');
      d.setBBlur('none');
    }
  });

  return tl;
}

export const glitchPreset: Preset = {
  id: 'glitch',
  name: 'Glitch',
  category: 'Effect',
  splitMode: 'chars',
  params,
  build,
  cssExport: false,
  description:
    'RGB channel split with random slice offsets and horizontal jitter.',
};

export default glitchPreset;
