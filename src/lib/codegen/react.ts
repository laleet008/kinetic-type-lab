import type { GSAPOpts } from './gsap'

export type ReactOpts = GSAPOpts

function generateStaggerHelpersTSX(): string {
  return `type StaggerOrigin = 'start' | 'end' | 'center' | 'edges' | 'random';
type RepeatMode = 'loop' | 'once' | 'pingpong';

function getStaggerOffset(
  origin: StaggerOrigin,
  index: number,
  total: number,
  amount: number,
): number {
  if (total <= 1) return 0;
  switch (origin) {
    case 'start':
      return index * amount;
    case 'end':
      return (total - 1 - index) * amount;
    case 'center': {
      const c = (total - 1) / 2;
      return Math.abs(index - c) * amount;
    }
    case 'edges': {
      const c = (total - 1) / 2;
      return (c - Math.abs(index - c)) * amount;
    }
    case 'random':
      return Math.random() * total * amount;
    default:
      return index * amount;
  }
}

function buildStaggerArray(
  total: number,
  origin: StaggerOrigin,
  amount: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < total; i++) {
    out.push(getStaggerOffset(origin, i, total, amount));
  }
  return out;
}

function createRepeatConfig(mode: RepeatMode): { repeat: number; yoyo: boolean } {
  switch (mode) {
    case 'loop':
      return { repeat: -1, yoyo: false };
    case 'pingpong':
      return { repeat: -1, yoyo: true };
    case 'once':
    default:
      return { repeat: 0, yoyo: false };
  }
}`
}

function generateSplitFunctionTSX(): string {
  return `type SplitMode = 'chars' | 'words' | 'lines';

type SplitUnit = {
  index: number;
  total: number;
  lineIndex: number;
  charInWord: number;
  normX: number;
  normY: number;
  distFromCenter: number;
  el: HTMLElement;
};

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const IntlAny = Intl as any;
      const segmenter = new IntlAny.Segmenter(undefined, { granularity: 'grapheme' });
      const segments = segmenter.segment(text);
      const result: string[] = [];
      for (const seg of segments) result.push(seg.segment);
      return result;
    } catch {
      return Array.from(text);
    }
  }
  return Array.from(text);
}

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function createUnitSpan(text: string): HTMLElement {
  const span = document.createElement('span');
  span.style.display = 'inline-block';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = text;
  return span;
}

function createSpaceSpan(): HTMLElement {
  const span = document.createElement('span');
  span.style.display = 'inline-block';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = '&nbsp;';
  return span;
}

function splitIntoWordTokens(text: string): Array<{ text: string; isSpace: boolean }> {
  const tokens: Array<{ text: string; isSpace: boolean }> = [];
  let buffer = '';
  let inSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const isSpaceCh = ch === ' ';
    if (i === 0) {
      inSpace = isSpaceCh;
      buffer = ch;
    } else if (isSpaceCh === inSpace) {
      buffer += ch;
    } else {
      tokens.push({ text: buffer, isSpace: inSpace });
      buffer = ch;
      inSpace = isSpaceCh;
    }
  }
  if (buffer.length) tokens.push({ text: buffer, isSpace: inSpace });
  return tokens;
}

function computeUnitMetadata(
  spans: HTMLElement[],
  container: HTMLElement,
): Array<{ normX: number; normY: number; distFromCenter: number }> {
  const rect = container.getBoundingClientRect();
  const cw = rect.width || 1;
  const ch = rect.height || 1;
  const diag = Math.sqrt(0.5);
  return spans.map((span) => {
    const r = span.getBoundingClientRect();
    const cx = (r.left + r.right) / 2 - rect.left;
    const cy = (r.top + r.bottom) / 2 - rect.top;
    const normX = Math.max(0, Math.min(1, cx / cw));
    const normY = Math.max(0, Math.min(1, cy / ch));
    const dx = normX - 0.5;
    const dy = normY - 0.5;
    const dist = Math.max(0, Math.min(1, Math.sqrt(dx * dx + dy * dy) / diag));
    return { normX, normY, distFromCenter: dist };
  });
}

function groupLines(spans: HTMLElement[], tolerance = 2): number[] {
  const lineIndices: number[] = [];
  const tops: number[] = [];
  let currentLine = 0;
  for (let i = 0; i < spans.length; i++) {
    const top = spans[i].offsetTop;
    if (i === 0) {
      tops.push(top);
      lineIndices.push(0);
    } else {
      let matched = false;
      for (let l = 0; l < tops.length; l++) {
        if (Math.abs(top - tops[l]) <= tolerance) {
          lineIndices.push(l);
          matched = true;
          break;
        }
      }
      if (!matched) {
        currentLine++;
        tops.push(top);
        lineIndices.push(currentLine);
      }
    }
  }
  return lineIndices;
}

function split(element: HTMLElement, mode: SplitMode): SplitUnit[] {
  const rawText = element.textContent || '';
  const originalText = rawText.replace(/\\u00A0/g, ' ');
  element.setAttribute('aria-label', originalText);
  element.setAttribute('role', 'group');
  clearChildren(element);
  const wordTokens = splitIntoWordTokens(originalText);
  const unitSpans: HTMLElement[] = [];
  const charInWordIdx: number[] = [];

  if (mode === 'chars') {
    for (const token of wordTokens) {
      if (token.isSpace) {
        for (let s = 0; s < token.text.length; s++) {
          element.appendChild(createSpaceSpan());
        }
      } else {
        const graphemes = splitGraphemes(token.text);
        for (let ci = 0; ci < graphemes.length; ci++) {
          const span = createUnitSpan(graphemes[ci]);
          element.appendChild(span);
          unitSpans.push(span);
          charInWordIdx.push(ci);
        }
      }
    }
  } else {
    for (const token of wordTokens) {
      if (token.isSpace) {
        for (let s = 0; s < token.text.length; s++) {
          element.appendChild(createSpaceSpan());
        }
      } else {
        const span = createUnitSpan(token.text);
        element.appendChild(span);
        unitSpans.push(span);
        charInWordIdx.push(0);
      }
    }
  }

  const metadata = computeUnitMetadata(unitSpans, element);
  const lineIndices = groupLines(unitSpans);
  const total = unitSpans.length;
  return unitSpans.map((span, i) => ({
    index: i,
    total,
    lineIndex: lineIndices[i] ?? 0,
    charInWord: charInWordIdx[i] ?? 0,
    normX: metadata[i]?.normX ?? 0,
    normY: metadata[i]?.normY ?? 0,
    distFromCenter: metadata[i]?.distFromCenter ?? 0,
    el: span,
  }));
}`
}

function buildWaveTSX(opts: ReactOpts): string {
  const p = opts.params;
  const amplitude = p.amplitude ?? 40;
  const wavelength = p.wavelength ?? 6;
  const speed = p.speed ?? 1.5;
  const direction = JSON.stringify(p.direction ?? 'vertical');
  const rotateCouple = p.rotateCouple ?? 0;
  const duration = opts.timing.duration.toFixed(2);
  return `  // Wave preset — sine-swept phase per character
  const amplitude = ${amplitude};
  const wavelength = ${wavelength};
  const speed = ${speed};
  const direction: 'horizontal' | 'vertical' | 'both' = ${direction};
  const rotateCouple = ${rotateCouple};
  const duration = ${duration};

  const phases = units.map((u, i) => {
    const wavefrontPhase = u.normX * Math.PI * 2;
    const indexPhase = (i / wavelength) * Math.PI * 2;
    return indexPhase + wavefrontPhase * 0.3;
  });

  const tl = gsap.timeline();
  const timeVars = { t: 0 };
  const setters = units.map((unit, i) => ({
    setX: gsap.quickSetter(unit.el, 'x', 'px'),
    setY: gsap.quickSetter(unit.el, 'y', 'px'),
    setRotate: gsap.quickSetter(unit.el, 'rotate', 'deg'),
    phase: phases[i],
  }));

  tl.to(timeVars, {
    t: Math.PI * 2,
    duration,
    ease: 'none',
    repeat: -1,
    onUpdate: () => {
      const t = timeVars.t * speed;
      for (const s of setters) {
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
  });`;
}

function buildGravityDropTSX(opts: ReactOpts): string {
  const p = opts.params;
  const distance = p.distance ?? 400;
  const stagger = p.stagger ?? opts.timing.staggerAmount;
  const bounce = p.bounce ?? 0.3;
  const randomOffset = p.randomOffset ?? 50;
  const fallRotation = p.fallRotation ?? 20;
  const duration = opts.timing.duration.toFixed(2);
  const delay = opts.timing.delay.toFixed(3);
  const easing = JSON.stringify(opts.timing.easing);
  const staggerOrigin = JSON.stringify(opts.timing.staggerOrigin);
  const repeatMode = JSON.stringify(opts.timing.repeatMode);
  return `  // Gravity Drop preset
  const distance = ${distance};
  const stagger = ${stagger};
  const bounce = ${bounce};
  const randomOffset = ${randomOffset};
  const fallRotation = ${fallRotation};
  const duration = ${duration};
  const delay = ${delay};
  const easing = ${easing};
  const staggerOrigin: StaggerOrigin = ${staggerOrigin};
  const repeatMode: RepeatMode = ${repeatMode};
  const { repeat, yoyo } = createRepeatConfig(repeatMode);
  const staggers = buildStaggerArray(units.length, staggerOrigin, stagger);

  type CharData = {
    el: HTMLElement;
    startX: number;
    startY: number;
    startRotate: number;
  };

  const charData: CharData[] = units.map((unit) => {
    const el = unit.el;
    const yStart = -distance - Math.random() * randomOffset;
    const xStart = (Math.random() - 0.5) * randomOffset;
    const rotDir = Math.random() > 0.5 ? 1 : -1;
    const rotStart = fallRotation * rotDir * (0.5 + Math.random() * 0.5);
    gsap.set(el, { x: xStart, y: yStart, rotate: rotStart, opacity: 0 });
    return { el, startX: xStart, startY: yStart, startRotate: rotStart };
  });

  const tl = gsap.timeline();
  let fallEase: string | gsap.EaseFunction = easing;
  if (bounce > 0.01) {
    const bs = Math.min(1.7, 1 + bounce * 0.7);
    fallEase = \`back.out(\${bs})\`;
  }
  for (let i = 0; i < charData.length; i++) {
    const cd = charData[i];
    const sd = staggers[i] ?? 0;
    const cdur = duration * (0.6 + Math.random() * 0.4);
    tl.to(
      cd.el,
      {
        x: 0,
        y: 0,
        rotate: 0,
        opacity: 1,
        duration: cdur,
        delay: delay + sd,
        ease: fallEase,
      },
      0,
    );
  }
  if (repeat === -1) {
    tl.repeat(-1);
    tl.yoyo(yoyo);
  }`;
}

function buildTypewriterTSX(opts: ReactOpts): string {
  const p = opts.params;
  const speed = p.speed ?? 18;
  const caretStyle = JSON.stringify(p.caretStyle ?? 'line');
  const blinkRate = p.blinkRate ?? 2;
  const jitter = p.jitter ?? 0.15;
  const mistakes = p.mistakes ?? false;
  const delay = opts.timing.delay.toFixed(3);
  return `  // Typewriter preset
  const speed = ${speed};
  const caretStyle: 'none' | 'line' | 'block' | 'underscore' = ${caretStyle};
  const blinkRate = ${blinkRate};
  const jitter = ${jitter};
  const mistakes = ${mistakes};
  const delay = ${delay};
  const perCharBase = 1 / Math.max(1, speed);
  const WRONG_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

  type TwData = {
    unit: SplitUnit;
    el: HTMLElement;
    originalChar: string;
    revealTime: number;
  };

  const data: TwData[] = units.map((unit, i) => {
    const el = unit.el;
    const originalChar = el.textContent || '';
    const base = perCharBase * i + delay;
    const jitterAmt = jitter * perCharBase;
    const jitterOff = (Math.random() - 0.5) * 2 * jitterAmt;
    const revealTime = Math.max(delay, base + jitterOff);
    gsap.set(el, { opacity: 0 });
    return { unit, el, originalChar, revealTime };
  });
  const total = data.length;
  const totalDuration =
    total > 0 ? data[total - 1].revealTime + perCharBase + delay : 1;
  const tl = gsap.timeline();
  const timeVars = { t: 0 };
  const revealed = new Array<boolean>(total).fill(false);
  const mistakeActive = new Array<boolean>(total).fill(false);
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
        caretEl.textContent = '█';
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
    if (containerEl) containerEl.appendChild(caretEl);
  }
  tl.to(timeVars, {
    t: totalDuration,
    duration: totalDuration,
    ease: 'none',
    onUpdate: () => {
      const t = timeVars.t;
      for (let i = 0; i < total; i++) {
        const d = data[i];
        if (revealed[i]) continue;
        if (t >= d.revealTime) {
          if (mistakes && !mistakeActive[i] && Math.random() < 0.15) {
            mistakeActive[i] = true;
            d.el.textContent =
              WRONG_CHARS[Math.floor(Math.random() * WRONG_CHARS.length)];
            gsap.set(d.el, { opacity: 1 });
            setTimeout(() => {
              if (d.el) d.el.textContent = d.originalChar;
            }, Math.max(30, perCharBase * 400));
          } else {
            d.el.textContent = d.originalChar;
            gsap.set(d.el, { opacity: 1 });
          }
          revealed[i] = true;
        }
      }
      if (caretEl && containerEl) {
        let latest = -1;
        for (let i = total - 1; i >= 0; i--) {
          if (revealed[i]) {
            latest = i;
            break;
          }
        }
        if (latest >= 0 && latest < total - 1) {
          const nextEl = data[latest + 1].el;
          if (nextEl.parentNode) {
            nextEl.parentNode.insertBefore(caretEl, nextEl);
          }
        } else if (latest === total - 1 && containerEl.lastChild !== caretEl) {
          containerEl.appendChild(caretEl);
        }
      }
    },
  });
  if (caretEl && blinkRate > 0) {
    const period = 1 / blinkRate;
    tl.to(
      caretEl,
      {
        opacity: 0,
        duration: 0.001,
        repeat: -1,
        yoyo: true,
        repeatDelay: period * 0.5,
      },
      totalDuration * 0.5,
    );
  }`;
}

function buildMaskRevealTSX(opts: ReactOpts): string {
  const p = opts.params;
  const direction = JSON.stringify(p.direction ?? 'up');
  const stagger = p.stagger ?? opts.timing.staggerAmount;
  const skew = p.skew ?? 0;
  const duration = (p.duration ?? 0.8).toFixed(2);
  const easingStr = JSON.stringify(p.easing ?? opts.timing.easing);
  const delay = opts.timing.delay.toFixed(3);
  const staggerOrigin = JSON.stringify(opts.timing.staggerOrigin);
  return `  // Mask Reveal preset
  const direction: 'up' | 'down' | 'left' | 'right' = ${direction};
  const stagger = ${stagger};
  const skew = ${skew};
  const duration = ${duration};
  const easingStr = ${easingStr};
  const delay = ${delay};
  const staggerOrigin: StaggerOrigin = ${staggerOrigin};
  const staggers = buildStaggerArray(units.length, staggerOrigin, stagger);

  type MaskWord = { wrapper: HTMLSpanElement; inner: HTMLElement };
  const wrapped: MaskWord[] = units.map((unit) => {
    const el = unit.el;
    const parent = el.parentNode;
    const wrapper = document.createElement('span');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.display = 'inline-block';
    wrapper.style.overflow = 'hidden';
    wrapper.style.verticalAlign = 'baseline';
    const inner = el;
    inner.style.display = 'inline-block';
    if (parent) {
      parent.replaceChild(wrapper, el);
      wrapper.appendChild(inner);
    }
    const rect = inner.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    let sx = 0,
      sy = 0,
      skx = skew,
      sky = 0;
    switch (direction) {
      case 'up':
        sy = h;
        break;
      case 'down':
        sy = -h;
        break;
      case 'left':
        sx = w;
        sky = skew;
        skx = 0;
        break;
      case 'right':
        sx = -w;
        sky = skew;
        skx = 0;
        break;
    }
    gsap.set(inner, { x: sx, y: sy, skewX: skx, skewY: sky });
    return { wrapper, inner };
  });

  const tl = gsap.timeline();
  for (let i = 0; i < wrapped.length; i++) {
    const d = wrapped[i];
    const sd = staggers[i] ?? 0;
    tl.to(
      d.inner,
      {
        x: 0,
        y: 0,
        skewX: 0,
        skewY: 0,
        duration,
        delay: delay + sd,
        ease: easingStr,
      },
      0,
    );
  }`;
}

function buildBlurFocusTSX(opts: ReactOpts): string {
  const p = opts.params;
  const blurAmount = p.blurAmount ?? 20;
  const scaleFrom = p.scaleFrom ?? 1.5;
  const stagger = p.stagger ?? opts.timing.staggerAmount;
  const direction = JSON.stringify(p.direction ?? 'none');
  const threshold = p.threshold ?? 1;
  const duration = opts.timing.duration.toFixed(2);
  const delay = opts.timing.delay.toFixed(3);
  const easing = JSON.stringify(opts.timing.easing || 'power3.out');
  const staggerOrigin = JSON.stringify(opts.timing.staggerOrigin);
  const repeatMode = JSON.stringify(opts.timing.repeatMode);
  return `  // Blur Focus preset
  const blurAmount = ${blurAmount};
  const scaleFrom = ${scaleFrom};
  const stagger = ${stagger};
  const direction:
    | 'none'
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'random' = ${direction};
  const threshold = ${threshold};
  const duration = ${duration};
  const delay = ${delay};
  const easing = ${easing};
  const staggerOrigin: StaggerOrigin = ${staggerOrigin};
  const repeatMode: RepeatMode = ${repeatMode};
  const { repeat, yoyo } = createRepeatConfig(repeatMode);
  const staggers = buildStaggerArray(units.length, staggerOrigin, stagger);
  const fs = window.getComputedStyle(containerEl!).fontSize;
  const fontSize = parseFloat(fs) || 16;
  const distance = fontSize * threshold;

  type CharData = { el: HTMLElement; sx: number; sy: number };
  const charData: CharData[] = units.map((unit) => {
    const el = unit.el;
    let sx = 0,
      sy = 0;
    switch (direction) {
      case 'up':
        sy = -distance;
        break;
      case 'down':
        sy = distance;
        break;
      case 'left':
        sx = -distance;
        break;
      case 'right':
        sx = distance;
        break;
      case 'random': {
        const a = Math.random() * Math.PI * 2;
        sx = Math.cos(a) * distance;
        sy = Math.sin(a) * distance;
        break;
      }
    }
    gsap.set(el, {
      x: sx,
      y: sy,
      scale: scaleFrom,
      opacity: 0,
      filter: \`blur(\${blurAmount}px)\`,
    });
    return { el, sx, sy };
  });

  const tl = gsap.timeline();
  for (let i = 0; i < charData.length; i++) {
    const cd = charData[i];
    const sd = staggers[i] ?? 0;
    tl.to(
      cd.el,
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration,
        delay: delay + sd,
        ease: easing,
      },
      0,
    );
  }
  if (repeat === -1) {
    tl.repeat(-1);
    tl.yoyo(yoyo);
  }`;
}

function buildGenericTSX(opts: ReactOpts): string {
  const duration = opts.timing.duration.toFixed(2);
  const delay = opts.timing.delay.toFixed(3);
  const staggerOrigin = JSON.stringify(opts.timing.staggerOrigin);
  const stagger = opts.timing.staggerAmount.toFixed(3);
  const easing = JSON.stringify(opts.timing.easing);
  const repeatMode = JSON.stringify(opts.timing.repeatMode);
  return `  // Generic staggered entrance
  const duration = ${duration};
  const delay = ${delay};
  const staggerOrigin: StaggerOrigin = ${staggerOrigin};
  const staggerAmount = ${stagger};
  const easing = ${easing};
  const repeatMode: RepeatMode = ${repeatMode};
  const { repeat, yoyo } = createRepeatConfig(repeatMode);
  const staggers = buildStaggerArray(units.length, staggerOrigin, staggerAmount);
  const tl = gsap.timeline();
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const sd = staggers[i] ?? 0;
    gsap.set(unit.el, { opacity: 0, y: 20 });
    tl.to(
      unit.el,
      { opacity: 1, y: 0, duration, delay: delay + sd, ease: easing },
      0,
    );
  }
  if (repeat === -1) {
    tl.repeat(-1);
    tl.yoyo(yoyo);
  }`;
}

function presetBuildTSX(opts: ReactOpts): string {
  switch (opts.presetId) {
    case 'wave':
      return buildWaveTSX(opts);
    case 'gravityDrop':
      return buildGravityDropTSX(opts);
    case 'typewriter':
      return buildTypewriterTSX(opts);
    case 'maskReveal':
      return buildMaskRevealTSX(opts);
    case 'blurFocus':
      return buildBlurFocusTSX(opts);
    default:
      return buildGenericTSX(opts);
  }
}

export function generateReactComponent(opts: ReactOpts): string {
  const splitMode = opts.splitMode ?? 'chars';
  const helpers = generateStaggerHelpersTSX();
  const splitFn = generateSplitFunctionTSX();
  const presetBuild = presetBuildTSX(opts);
  const alignMap: Record<string, string> = {
    left: 'left',
    center: 'center',
    right: 'right',
    justify: 'justify',
  };
  const textAlign = alignMap[opts.align] || 'center';

  return `import gsap from 'gsap';
import { useEffect, useRef } from 'react';

export type KineticTextProps = {
  text?: string;
  className?: string;
};

${helpers}

${splitFn}

export function KineticText({
  text = ${JSON.stringify(opts.text)},
  className = '',
}: KineticTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const containerEl = ref.current;
    if (!containerEl) return;
    if (containerEl.textContent !== text) {
      containerEl.textContent = text;
    }

    const units: SplitUnit[] = split(containerEl, ${JSON.stringify(splitMode)});

${presetBuild}

    tlRef.current = tl;

    return () => {
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }
      for (const unit of units) {
        gsap.set(unit.el, {
          x: 0,
          y: 0,
          z: 0,
          scale: 1,
          rotate: 0,
          rotateX: 0,
          rotateY: 0,
          rotateZ: 0,
          skewX: 0,
          skewY: 0,
          opacity: 1,
          filter: 'none',
          fontVariationSettings: undefined,
        });
        const parent = unit.el.parentNode;
        if (
          parent &&
          parent !== containerEl &&
          (parent as HTMLElement).getAttribute?.('aria-hidden') === 'true'
        ) {
          const grandparent = parent.parentNode;
          if (grandparent) grandparent.replaceChild(unit.el, parent);
        }
      }
      containerEl.textContent = containerEl.getAttribute('aria-label') || '';
      containerEl.removeAttribute('aria-label');
      containerEl.removeAttribute('role');
      const caret = containerEl.querySelector('span[aria-hidden="true"]:not([style*="display"])');
      if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
    };
  }, [text]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        fontFamily:
          ${JSON.stringify(opts.fontFamily)} + ', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: ${opts.fontSize},
        lineHeight: ${opts.lineHeight},
        letterSpacing: ${opts.letterSpacing} + 'em',
        color: ${JSON.stringify(opts.textColor)},
        textAlign: '${textAlign}',
        display: 'block',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
      }}
    >
      {text}
    </div>
  );
}

export default KineticText;
`;
}
