import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'duration',
    label: 'Duration',
    min: 0.2,
    max: 5,
    step: 0.1,
    default: 1.2,
    unit: 's',
  },
  {
    type: 'range',
    id: 'speed',
    label: 'Speed',
    min: 1,
    max: 200,
    step: 1,
    default: 60,
    unit: 'Hz',
  },
  {
    type: 'select',
    id: 'charSet',
    label: 'Char Set',
    options: [
      { value: 'alphanumeric', label: 'Alphanumeric' },
      { value: 'symbols', label: 'Symbols' },
      { value: 'katakana', label: 'Katakana' },
      { value: 'binary', label: 'Binary' },
      { value: 'custom', label: 'Custom' },
    ],
    default: 'alphanumeric',
  },
  {
    type: 'string',
    id: 'customChars',
    label: 'Custom Chars',
    default: '',
  },
  {
    type: 'select',
    id: 'revealDirection',
    label: 'Reveal Direction',
    options: [
      { value: 'ltr', label: 'Left→Right' },
      { value: 'rtl', label: 'Right→Left' },
      { value: 'center', label: 'Out from Center' },
      { value: 'random', label: 'Random' },
    ],
    default: 'ltr',
  },
  {
    type: 'range',
    id: 'perCharHold',
    label: 'Per-Char Hold',
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.05,
    unit: 's',
  },
];

type ScrambleData = {
  unit: SplitUnit;
  el: HTMLElement;
  originalChar: string;
  revealTime: number;
  revealed: boolean;
};

const CHAR_SETS: Record<string, string> = {
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`',
  katakana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
  binary: '01',
};

function randomChar(set: string): string {
  if (set.length === 0) return ' ';
  return set[Math.floor(Math.random() * set.length)];
}

function build(ctx: PresetContext): gsap.core.Timeline {
  const { units, params, timing } = ctx;
  const { delay } = timing;

  const presetDuration = (params.duration as number) ?? 1.2;
  const speed = (params.speed as number) ?? 60;
  const charSetKey = (params.charSet as string) ?? 'alphanumeric';
  const customChars = (params.customChars as string) ?? '';
  const revealDirection = (params.revealDirection as string) ?? 'ltr';
  const perCharHold = (params.perCharHold as number) ?? 0.05;

  const charset = charSetKey === 'custom' ? customChars : CHAR_SETS[charSetKey] || CHAR_SETS.alphanumeric;
  const scrambleInterval = speed > 0 ? 1 / speed : 0.016;

  const total = units.length;
  const sortedIndices: number[] = [];
  for (let i = 0; i < total; i++) sortedIndices.push(i);

  switch (revealDirection) {
    case 'rtl':
      sortedIndices.reverse();
      break;
    case 'center': {
      const center = (total - 1) / 2;
      sortedIndices.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
      break;
    }
    case 'random':
      sortedIndices.sort(() => Math.random() - 0.5);
      break;
    case 'ltr':
    default:
      break;
  }

  const perCharWindow = total > 1 ? (presetDuration - perCharHold * total) / (total - 1) : 0;

  const revealTimes: number[] = new Array(total).fill(0);
  for (let revealOrder = 0; revealOrder < total; revealOrder++) {
    const charIdx = sortedIndices[revealOrder];
    revealTimes[charIdx] = perCharWindow * revealOrder + delay;
  }

  const data: ScrambleData[] = units.map((unit, i) => {
    const el = unit.el;
    const originalChar = el.textContent || '';
    return {
      unit,
      el,
      originalChar,
      revealTime: revealTimes[i] ?? 0,
      revealed: false,
    };
  });

  const tl = gsap.timeline();
  const timeVars = { t: 0 };
  let lastScrambleTick = -Infinity;

  tl.to(timeVars, {
    t: presetDuration + delay,
    duration: presetDuration + delay,
    ease: 'none',
    onUpdate: () => {
      const t = timeVars.t;
      const shouldTick = t - lastScrambleTick >= scrambleInterval;
      if (shouldTick) {
        lastScrambleTick = t;
      }

      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        if (d.revealed) continue;

        if (t >= d.revealTime + perCharHold) {
          d.el.textContent = d.originalChar;
          d.revealed = true;
        } else if (shouldTick && t >= d.revealTime * 0.3) {
          d.el.textContent = randomChar(charset);
        }
      }
    },
  });

  const cleanup = () => {
    for (const d of data) {
      d.el.textContent = d.originalChar;
    }
  };

  tl.eventCallback('onInterrupt', cleanup);
  tl.eventCallback('onComplete', cleanup);

  return tl;
}

export const scramblePreset: Preset = {
  id: 'scramble',
  name: 'Scramble',
  category: 'Entrance',
  splitMode: 'chars',
  params,
  build,
  cssExport: false,
  description: 'Each char cycles through a glyph set before settling.',
};

export default scramblePreset;
