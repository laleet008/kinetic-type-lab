import gsap from 'gsap';
import type { Preset, ParamSpec, PresetContext, SplitUnit } from './index';

const params: ParamSpec[] = [
  {
    type: 'range',
    id: 'speed',
    label: 'Speed',
    min: 1,
    max: 50,
    step: 1,
    default: 18,
    unit: 'chars/s',
  },
  {
    type: 'select',
    id: 'caretStyle',
    label: 'Caret Style',
    options: [
      { value: 'none', label: 'None' },
      { value: 'line', label: 'Line' },
      { value: 'block', label: 'Block' },
      { value: 'underscore', label: 'Underscore' },
    ],
    default: 'line',
  },
  {
    type: 'range',
    id: 'blinkRate',
    label: 'Blink Rate',
    min: 0,
    max: 10,
    step: 0.1,
    default: 2,
    unit: 'Hz',
  },
  {
    type: 'range',
    id: 'jitter',
    label: 'Jitter',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.15,
  },
  {
    type: 'toggle',
    id: 'mistakes',
    label: 'Mistakes',
    default: false,
  },
];

type TypewriterData = {
  unit: SplitUnit;
  el: HTMLElement;
  originalChar: string;
  revealTime: number;
};

const WRONG_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

function build(ctx: PresetContext): gsap.core.Timeline {
  const { container, units, params, timing } = ctx;
  const { delay } = timing;

  const speed = (params.speed as number) ?? 18;
  const caretStyle = (params.caretStyle as string) ?? 'line';
  const blinkRate = (params.blinkRate as number) ?? 2;
  const jitter = (params.jitter as number) ?? 0.15;
  const mistakes = (params.mistakes as boolean) ?? false;

  const perCharBase = 1 / speed;
  const total = units.length;

  const data: TypewriterData[] = units.map((unit, i) => {
    const el = unit.el;
    const originalChar = el.textContent || '';
    const baseRevealTime = perCharBase * i + delay;
    const jitterAmount = jitter * perCharBase;
    const jitterOffset = (Math.random() - 0.5) * 2 * jitterAmount;
    const revealTime = Math.max(delay, baseRevealTime + jitterOffset);

    gsap.set(el, { opacity: 0 });

    return {
      unit,
      el,
      originalChar,
      revealTime,
    };
  });

  const totalDuration = total > 0 ? data[total - 1].revealTime + perCharBase + delay : 1;

  const tl = gsap.timeline();
  const timeVars = { t: 0 };
  const revealedFlags: boolean[] = new Array(total).fill(false);
  const mistakeActive: boolean[] = new Array(total).fill(false);

  let caretEl: HTMLSpanElement | null = null;
  if (caretStyle !== 'none') {
    caretEl = document.createElement('span');
    caretEl.setAttribute('aria-hidden', 'true');
    caretEl.style.display = 'inline-block';
    caretEl.style.position = 'relative';
    caretEl.style.userSelect = 'none';
    caretEl.style.pointerEvents = 'none';

    switch (caretStyle) {
      case 'block':
        caretEl.textContent = '\u2588';
        caretEl.style.verticalAlign = 'middle';
        break;
      case 'underscore':
        caretEl.textContent = '_';
        caretEl.style.verticalAlign = 'baseline';
        break;
      case 'line':
      default:
        caretEl.textContent = '|';
        caretEl.style.verticalAlign = 'baseline';
        break;
    }
    container.appendChild(caretEl);
    gsap.set(caretEl, { opacity: 1 });
  }

  tl.to(timeVars, {
    t: totalDuration,
    duration: totalDuration,
    ease: 'none',
    onUpdate: () => {
      const t = timeVars.t;

      for (let i = 0; i < total; i++) {
        const d = data[i];
        if (revealedFlags[i]) continue;

        if (t >= d.revealTime) {
          if (mistakes && !mistakeActive[i] && Math.random() < 0.15) {
            mistakeActive[i] = true;
            d.el.textContent = WRONG_CHARS[Math.floor(Math.random() * WRONG_CHARS.length)];
            gsap.set(d.el, { opacity: 1 });
            setTimeout(() => {
              if (d.el && d.unit) {
                d.el.textContent = d.originalChar;
              }
            }, Math.max(30, perCharBase * 400));
          } else {
            d.el.textContent = d.originalChar;
            gsap.set(d.el, { opacity: 1 });
          }
          revealedFlags[i] = true;
        }
      }

      if (caretEl) {
        let latestReveal = -1;
        for (let i = total - 1; i >= 0; i--) {
          if (revealedFlags[i]) {
            latestReveal = i;
            break;
          }
        }
        if (latestReveal >= 0 && latestReveal < total - 1) {
          const nextEl = data[latestReveal + 1].el;
          if (nextEl.parentNode) {
            nextEl.parentNode.insertBefore(caretEl, nextEl);
          }
        } else if (latestReveal === total - 1) {
          if (container.lastChild !== caretEl) {
            container.appendChild(caretEl);
          }
        }
      }
    },
  });

  if (caretEl && blinkRate > 0) {
    const blinkPeriod = 1 / blinkRate;
    tl.to(caretEl, {
      opacity: 0,
      duration: 0.001,
      repeat: -1,
      yoyo: true,
      repeatDelay: blinkPeriod * 0.5,
    }, totalDuration * 0.5);
  }

  const cleanup = () => {
    for (let i = 0; i < total; i++) {
      const d = data[i];
      d.el.textContent = d.originalChar;
      gsap.set(d.el, { opacity: 1 });
    }
    if (caretEl && caretEl.parentNode) {
      caretEl.parentNode.removeChild(caretEl);
    }
  };

  tl.eventCallback('onInterrupt', cleanup);
  tl.eventCallback('onComplete', () => {
    for (let i = 0; i < total; i++) {
      const d = data[i];
      d.el.textContent = d.originalChar;
      gsap.set(d.el, { opacity: 1 });
    }
  });

  return tl;
}

export const typewriterPreset: Preset = {
  id: 'typewriter',
  name: 'Typewriter',
  category: 'Entrance',
  splitMode: 'chars',
  params,
  build,
  cssExport: true,
  description: 'Reveals char by char with an optional blinking caret.',
};

export default typewriterPreset;
