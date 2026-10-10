import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(MotionPathPlugin);

export function getStaggerOffset(
  origin: string,
  index: number,
  total: number,
  amount: number
): number {
  if (total <= 1) return 0;

  switch (origin) {
    case 'start':
      return index * amount;
    case 'end':
      return (total - 1 - index) * amount;
    case 'center': {
      const center = (total - 1) / 2;
      return Math.abs(index - center) * amount;
    }
    case 'edges': {
      const center = (total - 1) / 2;
      return (center - Math.abs(index - center)) * amount;
    }
    case 'random':
      return Math.random() * total * amount;
    default:
      return index * amount;
  }
}

export function buildStaggerArray(
  total: number,
  origin: string,
  amount: number
): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < total; i++) {
    offsets.push(getStaggerOffset(origin, i, total, amount));
  }
  return offsets;
}

export function createRepeatConfig(
  repeatMode: 'loop' | 'once' | 'pingpong'
): { repeat: number; yoyo: boolean } {
  switch (repeatMode) {
    case 'loop':
      return { repeat: -1, yoyo: false };
    case 'once':
      return { repeat: 0, yoyo: false };
    case 'pingpong':
      return { repeat: -1, yoyo: true };
    default:
      return { repeat: 0, yoyo: false };
  }
}

export function parseTimingEasing(
  easingStr: string
): string | gsap.EaseFunction {
  if (!easingStr) return 'power2.out';

  const bezierMatch = easingStr.match(
    /^cubic-bezier\(([^)]+)\)$/
  );
  if (bezierMatch) {
    const values = bezierMatch[1]
      .split(',')
      .map((v) => parseFloat(v.trim()));
    if (values.length === 4 && values.every((v) => !isNaN(v))) {
      return gsap.parseEase(
        `cubic-bezier(${values[0]},${values[1]},${values[2]},${values[3]})`
      );
    }
  }

  return easingStr;
}

export function killTimelineSafe(
  tl: gsap.core.Timeline | null
): void {
  if (tl) {
    tl.kill();
  }
}

export function rebuildTimelineDebounced<T extends unknown[]>(
  builder: (...args: T) => gsap.core.Timeline | null,
  delay = 120
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastTimeline: gsap.core.Timeline | null = null;

  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      killTimelineSafe(lastTimeline);
      lastTimeline = builder(...args);
      timeoutId = null;
    }, delay);
  };
}
