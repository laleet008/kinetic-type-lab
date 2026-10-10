import type { SplitUnit } from '../split'
import type { Preset } from '../../presets'

export type CodegenOpts = {
  text: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  align: string
  textColor: string
  presetId: string
  params: Record<string, any>
  timing: {
    duration: number
    delay: number
    staggerAmount: number
    staggerOrigin: string
    easing: string
    repeatMode: string
  }
  splitUnits: Array<
    Omit<SplitUnit, 'el'>
  >
}

type CssResult = {
  html: string
  css: string
  combined: string
  note?: string
}

const JS_ONLY_PRESETS = new Set([
  'wave',
  'glitch',
  'explode',
  'flip3d',
  'variableWave',
  'elasticStretch',
  'orbit',
  'scramble',
])

function cssEscape(str: string): string {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"')
}

function htmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getStaggerDelay(
  index: number,
  total: number,
  origin: string,
  amount: number
): number {
  if (total <= 1) return 0
  switch (origin) {
    case 'start':
      return index * amount
    case 'end':
      return (total - 1 - index) * amount
    case 'center': {
      const center = (total - 1) / 2
      return Math.abs(index - center) * amount
    }
    case 'edges': {
      const center = (total - 1) / 2
      return (center - Math.abs(index - center)) * amount
    }
    case 'random':
      return ((index * 9301 + 49297) % 233280) / 233280 * total * amount
    default:
      return index * amount
  }
}

function easingToCss(easing: string): string {
  const map: Record<string, string> = {
    'power1.out': 'cubic-bezier(0.42, 0, 1, 1)',
    'power1.in': 'cubic-bezier(0, 0, 0.58, 1)',
    'power1.inOut': 'cubic-bezier(0.42, 0, 0.58, 1)',
    'power2.out': 'cubic-bezier(0.3, 0.6, 0.4, 1)',
    'power2.in': 'cubic-bezier(0.6, 0, 0.74, 0.36)',
    'power2.inOut': 'cubic-bezier(0.76, 0, 0.24, 1)',
    'power3.out': 'cubic-bezier(0.22, 0.6, 0.36, 1)',
    'power3.in': 'cubic-bezier(0.64, 0, 0.78, 0)',
    'power3.inOut': 'cubic-bezier(0.66, 0, 0.34, 1)',
    'power4.out': 'cubic-bezier(0.16, 0.84, 0.32, 1)',
    'power4.in': 'cubic-bezier(0.8, 0, 0.84, 0)',
    'power4.inOut': 'cubic-bezier(0.84, 0, 0.16, 1)',
    'back.out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'back.in': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    'back.inOut': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    'expo.out': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'expo.in': 'cubic-bezier(0.7, 0, 0.84, 0)',
    'expo.inOut': 'cubic-bezier(0.87, 0, 0.13, 1)',
    'sine.out': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    'sine.in': 'cubic-bezier(0.38, 0, 0.62, 0.01)',
    'sine.inOut': 'cubic-bezier(0.37, 0, 0.63, 1)',
    'circ.out': 'cubic-bezier(0, 0.55, 0.45, 1)',
    'circ.in': 'cubic-bezier(0.55, 0, 1, 0.45)',
    'circ.inOut': 'cubic-bezier(0.85, 0, 0.15, 1)',
    'elastic.out': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
    'bounce.out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  }
  const bezier = easing.match(/^cubic-bezier\(([^)]+)\)$/)
  if (bezier) return easing
  const backMatch = easing.match(/^back\.out\(([\d.]+)\)$/)
  if (backMatch) {
    const v = parseFloat(backMatch[1])
    const c1 = 1.70158 * v
    return `cubic-bezier(0.34, ${1 + c1}, 0.64, 1)`
  }
  return map[easing] || 'cubic-bezier(0.42, 0, 0.58, 1)'
}

function splitCharsHTML(text: string): { html: string; count: number } {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const IntlAny = Intl as any
      const segmenter = new IntlAny.Segmenter(undefined, { granularity: 'grapheme' })
      const segments = segmenter.segment(text)
      const result: string[] = []
      for (const seg of segments) {
        result.push(seg.segment)
      }
      return buildChars(result)
    } catch {
      return buildChars(Array.from(text))
    }
  }
  return buildChars(Array.from(text))
}

function buildChars(chars: string[]): { html: string; count: number } {
  let result = ''
  let count = 0
  for (const ch of chars) {
    if (ch === ' ') {
      result += '<span aria-hidden="true" style="display:inline-block">&nbsp;</span>'
    } else {
      result += `<span class="ktc ktc-${count}" aria-hidden="true" style="display:inline-block">${htmlEscape(ch)}</span>`
      count++
    }
  }
  return { html: result, count }
}

function splitWordsHTML(text: string): { html: string; count: number } {
  const tokens: Array<{ text: string; isSpace: boolean }> = []
  let buffer = ''
  let inSpace = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const isSpaceCh = ch === ' '
    if (i === 0) {
      inSpace = isSpaceCh
      buffer = ch
    } else if (isSpaceCh === inSpace) {
      buffer += ch
    } else {
      tokens.push({ text: buffer, isSpace: inSpace })
      buffer = ch
      inSpace = isSpaceCh
    }
  }
  if (buffer.length > 0) tokens.push({ text: buffer, isSpace: inSpace })

  let result = ''
  let count = 0
  for (const token of tokens) {
    if (token.isSpace) {
      const spaces = token.text.length
      for (let s = 0; s < spaces; s++) {
        result += '<span aria-hidden="true" style="display:inline-block">&nbsp;</span>'
      }
    } else {
      result += `<span class="ktm ktm-${count}" aria-hidden="true" style="display:inline-block;overflow:hidden;vertical-align:baseline;"><span style="display:inline-block">${htmlEscape(token.text)}</span></span>`
      count++
    }
  }
  return { html: result, count }
}

function baseCSS(opts: CodegenOpts): string {
  const alignMap: Record<string, string> = {
    left: 'left',
    center: 'center',
    right: 'right',
    justify: 'justify',
  }
  return `
.kinetic-wrap {
  font-family: ${cssEscape(opts.fontFamily)}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: ${opts.fontSize}px;
  line-height: ${opts.lineHeight};
  letter-spacing: ${opts.letterSpacing}em;
  color: ${cssEscape(opts.textColor)};
  text-align: ${alignMap[opts.align] || 'center'};
  padding: 40px;
  background: transparent;
  position: relative;
  display: block;
  white-space: normal;
  word-break: break-word;
}
`
}

function repeatModeIter(repeatMode: string): string {
  switch (repeatMode) {
    case 'loop':
      return 'infinite'
    case 'pingpong':
      return 'infinite'
    case 'once':
    default:
      return '1'
  }
}

function repeatModeDir(repeatMode: string): string {
  if (repeatMode === 'pingpong') return 'alternate'
  return 'normal'
}

function generateGravityDropCSS(opts: CodegenOpts): CssResult {
  const { params, timing, splitUnits } = opts
  const distance = (params.distance as number) ?? 400
  const bounce = (params.bounce as number) ?? 0.3
  const randomOffset = (params.randomOffset as number) ?? 50
  const fallRotation = (params.fallRotation as number) ?? 20
  const stagger = (params.stagger as number) ?? timing.staggerAmount

  const { html, count } = splitCharsHTML(opts.text)
  const total = Math.max(count, splitUnits.length) || count

  let perCharCSS = ''
  for (let i = 0; i < total; i++) {
    const unit = splitUnits[i]
    const idx = unit?.index ?? i
    const delay = timing.delay + getStaggerDelay(idx, total, timing.staggerOrigin, stagger)
    const rand = ((i * 2654435761) >>> 0) / 4294967295
    const yStart = -distance - rand * randomOffset
    const xStart = (rand - 0.5) * randomOffset
    const rotDir = rand > 0.5 ? 1 : -1
    const rotStart = fallRotation * rotDir * (0.5 + rand * 0.5)
    const charDur = timing.duration * (0.6 + rand * 0.4)

    perCharCSS += `
.ktc-${i} {
  opacity: 0;
  transform: translate(${xStart.toFixed(2)}px, ${yStart.toFixed(2)}px) rotate(${rotStart.toFixed(2)}deg);
  animation: gravityDrop ${charDur.toFixed(3)}s ${easingToCss(bounce > 0.01 ? `back.out(${Math.min(1.7, 1 + bounce * 0.7)})` : timing.easing)} ${delay.toFixed(3)}s ${repeatModeIter(timing.repeatMode)} ${repeatModeDir(timing.repeatMode)} forwards;
}
`
  }

  const keyframes = `
@keyframes gravityDrop {
  from {
    opacity: 0;
    transform: var(--kt-from, translate(0, -200px) rotate(0deg));
  }
  to {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg);
  }
}
`

  const css = baseCSS(opts) + keyframes + perCharCSS
  const fullHtml = `<div class="kinetic-wrap" aria-label="${htmlEscape(opts.text)}" role="group">${html}</div>`
  const combined = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Gravity Drop — Kinetic Type</title>
<style>${css}</style>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0B0C;">
${fullHtml}
</body>
</html>`
  return { html: fullHtml, css, combined }
}

function generateTypewriterCSS(opts: CodegenOpts): CssResult {
  const { params, timing, splitUnits } = opts
  const speed = (params.speed as number) ?? 18
  const caretStyle = (params.caretStyle as string) ?? 'line'
  const blinkRate = (params.blinkRate as number) ?? 2
  const jitter = (params.jitter as number) ?? 0.15

  const { html, count } = splitCharsHTML(opts.text)
  const total = Math.max(count, splitUnits.length) || count
  const perCharBase = 1 / Math.max(1, speed)
  const totalDuration = total > 0 ? total * perCharBase + timing.delay : 1

  let perCharCSS = ''
  for (let i = 0; i < total; i++) {
    const unit = splitUnits[i]
    const idx = unit?.index ?? i
    const baseReveal = perCharBase * idx + timing.delay
    const jitterAmt = jitter * perCharBase
    const seed = ((i * 1103515245 + 12345) >>> 0) / 4294967295
    const jitterOff = (seed - 0.5) * 2 * jitterAmt
    const reveal = Math.max(timing.delay, baseReveal + jitterOff)

    perCharCSS += `
.ktc-${i} {
  opacity: 0;
  animation: twReveal 0.001s steps(1) ${reveal.toFixed(3)}s forwards;
}
`
  }

  let caretCSS = ''
  if (caretStyle !== 'none') {
    const caretCh =
      caretStyle === 'block'
        ? '\u2588'
        : caretStyle === 'underscore'
        ? '_'
        : '|'
    const caretVA =
      caretStyle === 'block' ? 'middle' : 'baseline'
    const blinkPeriod = blinkRate > 0 ? (1 / blinkRate).toFixed(3) : '0.5'

    caretCSS = `
.ktcaret {
  display: inline-block;
  position: relative;
  user-select: none;
  pointer-events: none;
  vertical-align: ${caretVA};
  content: '${caretCh}';
}
.ktcaret::after {
  content: '${caretCh}';
  display: inline;
  animation: caretBlink ${blinkPeriod}s steps(2) infinite;
}
@keyframes caretBlink {
  50% { opacity: 0; }
}
`
    perCharCSS += caretCSS
  }

  const keyframes = `
@keyframes twReveal {
  to { opacity: 1; }
}
`
  void totalDuration

  const css = baseCSS(opts) + keyframes + perCharCSS
  const caretHtml = caretStyle !== 'none' ? '<span class="ktcaret"></span>' : ''
  const fullHtml = `<div class="kinetic-wrap" aria-label="${htmlEscape(opts.text)}" role="group">${html}${caretHtml}</div>`
  const combined = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Typewriter — Kinetic Type</title>
<style>${css}</style>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0B0C;">
${fullHtml}
</body>
</html>`
  return { html: fullHtml, css, combined }
}

function generateMaskRevealCSS(opts: CodegenOpts): CssResult {
  const { params, timing, splitUnits } = opts
  const direction = (params.direction as string) ?? 'up'
  const stagger = (params.stagger as number) ?? timing.staggerAmount
  const skew = (params.skew as number) ?? 0
  const duration = (params.duration as number) ?? 0.8
  const easingStr = (params.easing as string) ?? timing.easing

  const { html, count } = splitWordsHTML(opts.text)
  const total = Math.max(count, splitUnits.length) || count

  let perUnitCSS = ''
  for (let i = 0; i < total; i++) {
    const unit = splitUnits[i]
    const idx = unit?.index ?? i
    const delay = timing.delay + getStaggerDelay(idx, total, timing.staggerOrigin, stagger)

    let startX = '0'
    let startY = '0'
    let skewX = skew
    let skewY = 0

    switch (direction) {
      case 'up':
        startY = '100%'
        break
      case 'down':
        startY = '-100%'
        break
      case 'left':
        startX = '100%'
        skewY = skew
        skewX = 0
        break
      case 'right':
        startX = '-100%'
        skewY = skew
        skewX = 0
        break
    }

    perUnitCSS += `
.ktm-${i} > span {
  transform: translate(${startX}, ${startY}) skewX(${skewX}deg) skewY(${skewY}deg);
  animation: maskReveal ${duration.toFixed(2)}s ${easingToCss(easingStr)} ${delay.toFixed(3)}s ${repeatModeIter(timing.repeatMode)} ${repeatModeDir(timing.repeatMode)} forwards;
}
`
  }

  const keyframes = `
@keyframes maskReveal {
  to {
    transform: translate(0, 0) skewX(0deg) skewY(0deg);
  }
}
`

  const css = baseCSS(opts) + keyframes + perUnitCSS
  const fullHtml = `<div class="kinetic-wrap" aria-label="${htmlEscape(opts.text)}" role="group">${html}</div>`
  const combined = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Mask Reveal — Kinetic Type</title>
<style>${css}</style>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0B0C;">
${fullHtml}
</body>
</html>`
  return { html: fullHtml, css, combined }
}

function generateBlurFocusCSS(opts: CodegenOpts): CssResult {
  const { params, timing, splitUnits } = opts
  const blurAmount = (params.blurAmount as number) ?? 20
  const scaleFrom = (params.scaleFrom as number) ?? 1.5
  const stagger = (params.stagger as number) ?? timing.staggerAmount
  const direction = (params.direction as string) ?? 'none'
  const threshold = (params.threshold as number) ?? 1

  const { html, count } = splitCharsHTML(opts.text)
  const total = Math.max(count, splitUnits.length) || count
  const distance = opts.fontSize * threshold

  let perCharCSS = ''
  for (let i = 0; i < total; i++) {
    const unit = splitUnits[i]
    const idx = unit?.index ?? i
    const delay = timing.delay + getStaggerDelay(idx, total, timing.staggerOrigin, stagger)
    const seed = ((i * 1664525 + 1013904223) >>> 0) / 4294967295

    let startX = '0'
    let startY = '0'
    switch (direction) {
      case 'up':
        startY = `-${distance}px`
        break
      case 'down':
        startY = `${distance}px`
        break
      case 'left':
        startX = `-${distance}px`
        break
      case 'right':
        startX = `${distance}px`
        break
      case 'random': {
        const angle = seed * Math.PI * 2
        startX = `${(Math.cos(angle) * distance).toFixed(2)}px`
        startY = `${(Math.sin(angle) * distance).toFixed(2)}px`
        break
      }
    }

    perCharCSS += `
.ktc-${i} {
  opacity: 0;
  filter: blur(${blurAmount}px);
  transform: translate(${startX}, ${startY}) scale(${scaleFrom});
  animation: blurFocus ${timing.duration.toFixed(2)}s ${easingToCss(timing.easing || 'power3.out')} ${delay.toFixed(3)}s ${repeatModeIter(timing.repeatMode)} ${repeatModeDir(timing.repeatMode)} forwards;
  will-change: transform, opacity, filter;
}
`
  }

  const keyframes = `
@keyframes blurFocus {
  to {
    opacity: 1;
    filter: blur(0px);
    transform: translate(0, 0) scale(1);
  }
}
`

  const css = baseCSS(opts) + keyframes + perCharCSS
  const fullHtml = `<div class="kinetic-wrap" aria-label="${htmlEscape(opts.text)}" role="group">${html}</div>`
  const combined = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Blur Focus — Kinetic Type</title>
<style>${css}</style>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0B0C;">
${fullHtml}
</body>
</html>`
  return { html: fullHtml, css, combined }
}

function generateFallbackCSS(opts: CodegenOpts, presetName: string): CssResult {
  const { html, count } = splitCharsHTML(opts.text)
  void count

  const css = baseCSS(opts) + `
.kinetic-wrap > span[class^="ktc-"] {
  opacity: 1;
  display: inline-block;
}
`
  const fullHtml = `<div class="kinetic-wrap" aria-label="${htmlEscape(opts.text)}" role="group">${html}</div>`
  const note = `Note: "${presetName}" is a JS-only preset that requires runtime physics, frame-by-frame callbacks, or GSAP plugin features that are not fully expressible in pure CSS @keyframes. CSS fallback provided (static layout). Use the GSAP or React tab for a complete runnable snippet.`
  const combined = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${presetName} — Kinetic Type</title>
<style>${css}</style>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0B0C;">
${fullHtml}
<!-- ${note} -->
</body>
</html>`
  return { html: fullHtml, css, combined, note }
}

export function generateCSS(opts: CodegenOpts, presets?: Preset[]): CssResult {
  const presetId = opts.presetId
  const preset = presets?.find((p) => p.id === presetId)

  if (JS_ONLY_PRESETS.has(presetId) || preset?.cssExport === false) {
    const presetName = preset?.name || presetId
    return generateFallbackCSS(opts, presetName)
  }

  switch (presetId) {
    case 'gravityDrop':
      return generateGravityDropCSS(opts)
    case 'typewriter':
      return generateTypewriterCSS(opts)
    case 'maskReveal':
      return generateMaskRevealCSS(opts)
    case 'blurFocus':
      return generateBlurFocusCSS(opts)
    default:
      return generateFallbackCSS(opts, preset?.name || presetId)
  }
}
