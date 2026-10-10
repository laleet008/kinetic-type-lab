import type { CodegenOpts } from './css'

export type GSAPOpts = CodegenOpts & {
  splitMode?: 'chars' | 'words' | 'lines'
}

function jsEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
}

function stringify(o: any): string {
  return JSON.stringify(o, null, 2)
}

const SPLIT_FUNCTION_INLINE = `function splitGraphemes(text) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      const segments = segmenter.segment(text)
      const result = []
      for (const seg of segments) result.push(seg.segment)
      return result
    } catch (e) {
      return Array.from(text)
    }
  }
  return Array.from(text)
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild)
}

function createUnitSpan(text) {
  const span = document.createElement('span')
  span.style.display = 'inline-block'
  span.setAttribute('aria-hidden', 'true')
  span.textContent = text
  return span
}

function createSpaceSpan() {
  const span = document.createElement('span')
  span.style.display = 'inline-block'
  span.setAttribute('aria-hidden', 'true')
  span.innerHTML = '&nbsp;'
  return span
}

function computeUnitMetadata(spans, container) {
  const rect = container.getBoundingClientRect()
  const cw = rect.width || 1
  const ch = rect.height || 1
  const diag = Math.sqrt(0.5)
  return spans.map((span) => {
    const r = span.getBoundingClientRect()
    const cx = (r.left + r.right) / 2 - rect.left
    const cy = (r.top + r.bottom) / 2 - rect.top
    const normX = Math.max(0, Math.min(1, cx / cw))
    const normY = Math.max(0, Math.min(1, cy / ch))
    const dx = normX - 0.5
    const dy = normY - 0.5
    const dist = Math.max(0, Math.min(1, Math.sqrt(dx * dx + dy * dy) / diag))
    return { normX, normY, distFromCenter: dist }
  })
}

function groupLines(spans, tolerance = 2) {
  const lineIndices = []
  const tops = []
  let currentLine = 0
  for (let i = 0; i < spans.length; i++) {
    const top = spans[i].offsetTop
    if (i === 0) {
      tops.push(top)
      lineIndices.push(0)
    } else {
      let matched = false
      for (let l = 0; l < tops.length; l++) {
        if (Math.abs(top - tops[l]) <= tolerance) {
          lineIndices.push(l)
          matched = true
          break
        }
      }
      if (!matched) {
        currentLine++
        tops.push(top)
        lineIndices.push(currentLine)
      }
    }
  }
  return lineIndices
}

function splitIntoWordTokens(text) {
  const tokens = []
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
  if (buffer.length) tokens.push({ text: buffer, isSpace: inSpace })
  return tokens
}

function splitText(element, mode) {
  const rawText = element.textContent || ''
  const originalText = rawText.replace(/\\u00A0/g, ' ')
  element.setAttribute('aria-label', originalText)
  element.setAttribute('role', 'group')
  clearChildren(element)
  const wordTokens = splitIntoWordTokens(originalText)

  const unitSpans = []
  if (mode === 'chars') {
    for (const token of wordTokens) {
      if (token.isSpace) {
        for (let s = 0; s < token.text.length; s++) {
          element.appendChild(createSpaceSpan())
        }
      } else {
        const graphemes = splitGraphemes(token.text)
        for (let ci = 0; ci < graphemes.length; ci++) {
          const span = createUnitSpan(graphemes[ci])
          element.appendChild(span)
          unitSpans.push(span)
          span.__charInWord = ci
        }
      }
    }
  } else {
    for (const token of wordTokens) {
      if (token.isSpace) {
        for (let s = 0; s < token.text.length; s++) {
          element.appendChild(createSpaceSpan())
        }
      } else {
        const span = createUnitSpan(token.text)
        element.appendChild(span)
        unitSpans.push(span)
        span.__charInWord = 0
      }
    }
  }

  const metadata = computeUnitMetadata(unitSpans, element)
  const lineIndices = groupLines(unitSpans)
  const total = unitSpans.length
  return unitSpans.map((span, i) => ({
    index: i,
    total,
    lineIndex: lineIndices[i] ?? 0,
    charInWord: span.__charInWord ?? 0,
    normX: metadata[i]?.normX ?? 0,
    normY: metadata[i]?.normY ?? 0,
    distFromCenter: metadata[i]?.distFromCenter ?? 0,
    el: span,
  }))
}`

function staggerHelper() {
  return `function getStaggerOffset(origin, index, total, amount) {
  if (total <= 1) return 0
  switch (origin) {
    case 'start': return index * amount
    case 'end': return (total - 1 - index) * amount
    case 'center': {
      const c = (total - 1) / 2
      return Math.abs(index - c) * amount
    }
    case 'edges': {
      const c = (total - 1) / 2
      return (c - Math.abs(index - c)) * amount
    }
    case 'random': return Math.random() * total * amount
    default: return index * amount
  }
}
function buildStagger(total, origin, amount) {
  const out = []
  for (let i = 0; i < total; i++) out.push(getStaggerOffset(origin, i, total, amount))
  return out
}
function repeatConfig(mode) {
  switch (mode) {
    case 'loop': return { repeat: -1, yoyo: false }
    case 'pingpong': return { repeat: -1, yoyo: true }
    case 'once':
    default: return { repeat: 0, yoyo: false }
  }
}`
}

function buildWavePreset(opts: GSAPOpts): string {
  const p = opts.params
  const amplitude = p.amplitude ?? 40
  const wavelength = p.wavelength ?? 6
  const speed = p.speed ?? 1.5
  const direction = p.direction ?? 'vertical'
  const rotateCouple = p.rotateCouple ?? 0

  return `// Wave preset — sine-swept per-char phase offsets
const amplitude = ${amplitude}
const wavelength = ${wavelength}
const speed = ${speed}
const direction = ${stringify(direction)}
const rotateCouple = ${rotateCouple}
const phases = units.map((u, i) => {
  const wavefrontPhase = u.normX * Math.PI * 2
  const indexPhase = (i / wavelength) * Math.PI * 2
  return indexPhase + wavefrontPhase * 0.3
})
const tl = gsap.timeline()
const timeVars = { t: 0 }
const setters = units.map((unit, i) => {
  const el = unit.el
  return {
    setX: gsap.quickSetter(el, 'x', 'px'),
    setY: gsap.quickSetter(el, 'y', 'px'),
    setRotate: gsap.quickSetter(el, 'rotate', 'deg'),
    phase: phases[i],
  }
})
tl.to(timeVars, {
  t: Math.PI * 2,
  duration: ${opts.timing.duration.toFixed(2)},
  ease: 'none',
  repeat: -1,
  onUpdate: () => {
    const t = timeVars.t * speed
    for (let i = 0; i < setters.length; i++) {
      const s = setters[i]
      const sin = Math.sin(s.phase + t)
      if (direction === 'vertical' || direction === 'both') {
        s.setY(sin * amplitude)
      }
      if (direction === 'horizontal' || direction === 'both') {
        s.setX(sin * amplitude * (direction === 'both' ? 0.5 : 1))
      }
      if (rotateCouple !== 0) {
        const cos = Math.cos(s.phase + t)
        s.setRotate(cos * rotateCouple)
      }
    }
  },
})`
}

function buildGravityDropPreset(opts: GSAPOpts): string {
  const p = opts.params
  const distance = p.distance ?? 400
  const stagger = p.stagger ?? opts.timing.staggerAmount
  const bounce = p.bounce ?? 0.3
  const randomOffset = p.randomOffset ?? 50
  const fallRotation = p.fallRotation ?? 20

  return `// Gravity Drop preset
const distance = ${distance}
const stagger = ${stagger}
const bounce = ${bounce}
const randomOffset = ${randomOffset}
const fallRotation = ${fallRotation}
const ${opts.timing.duration > 0 ? 'duration' : '_dur'} = ${opts.timing.duration.toFixed(2)}
const delay = ${opts.timing.delay.toFixed(3)}
const easing = ${stringify(opts.timing.easing)}
const staggerOrigin = ${stringify(opts.timing.staggerOrigin)}
const { repeat, yoyo } = repeatConfig(${stringify(opts.timing.repeatMode)})
const staggers = buildStagger(units.length, staggerOrigin, stagger)

const charData = units.map((unit) => {
  const el = unit.el
  const yStart = -distance - Math.random() * randomOffset
  const xStart = (Math.random() - 0.5) * randomOffset
  const rotDir = Math.random() > 0.5 ? 1 : -1
  const rotStart = fallRotation * rotDir * (0.5 + Math.random() * 0.5)
  gsap.set(el, { x: xStart, y: yStart, rotate: rotStart, opacity: 0 })
  return { el, startX: xStart, startY: yStart, startRotate: rotStart }
})
const tl = gsap.timeline()
let fallEase = easing
if (bounce > 0.01) {
  const bs = Math.min(1.7, 1 + bounce * 0.7)
  fallEase = \`back.out(\${bs})\`
}
for (let i = 0; i < charData.length; i++) {
  const cd = charData[i]
  const sd = staggers[i] ?? 0
  const cdur = duration * (0.6 + Math.random() * 0.4)
  tl.to(cd.el, {
    x: 0, y: 0, rotate: 0, opacity: 1,
    duration: cdur,
    delay: delay + sd,
    ease: fallEase,
  }, 0)
}
if (repeat === -1) { tl.repeat(-1); tl.yoyo(yoyo) }`
}

function buildTypewriterPreset(opts: GSAPOpts): string {
  const p = opts.params
  const speed = p.speed ?? 18
  const caretStyle = p.caretStyle ?? 'line'
  const blinkRate = p.blinkRate ?? 2
  const jitter = p.jitter ?? 0.15
  const mistakes = p.mistakes ?? false

  return `// Typewriter preset
const speed = ${speed}
const caretStyle = ${stringify(caretStyle)}
const blinkRate = ${blinkRate}
const jitter = ${jitter}
const mistakes = ${mistakes}
const delay = ${opts.timing.delay.toFixed(3)}
const perCharBase = 1 / speed
const WRONG_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'

const data = units.map((unit, i) => {
  const el = unit.el
  const originalChar = el.textContent || ''
  const base = perCharBase * i + delay
  const jitterAmt = jitter * perCharBase
  const jitterOff = (Math.random() - 0.5) * 2 * jitterAmt
  const revealTime = Math.max(delay, base + jitterOff)
  gsap.set(el, { opacity: 0 })
  return { unit, el, originalChar, revealTime }
})
const total = data.length
const totalDuration = total > 0 ? data[total - 1].revealTime + perCharBase + delay : 1
const tl = gsap.timeline()
const timeVars = { t: 0 }
const revealed = new Array(total).fill(false)
const mistakeActive = new Array(total).fill(false)
let caretEl = null
if (caretStyle !== 'none') {
  caretEl = document.createElement('span')
  caretEl.setAttribute('aria-hidden', 'true')
  caretEl.style.display = 'inline-block'
  caretEl.style.position = 'relative'
  caretEl.style.userSelect = 'none'
  caretEl.style.pointerEvents = 'none'
  caretEl.textContent = caretStyle === 'block' ? '█' : caretStyle === 'underscore' ? '_' : '|'
  caretEl.style.verticalAlign = caretStyle === 'block' ? 'middle' : 'baseline'
  container.appendChild(caretEl)
}
tl.to(timeVars, {
  t: totalDuration,
  duration: totalDuration,
  ease: 'none',
  onUpdate: () => {
    const t = timeVars.t
    for (let i = 0; i < total; i++) {
      const d = data[i]
      if (revealed[i]) continue
      if (t >= d.revealTime) {
        if (mistakes && !mistakeActive[i] && Math.random() < 0.15) {
          mistakeActive[i] = true
          d.el.textContent = WRONG_CHARS[Math.floor(Math.random() * WRONG_CHARS.length)]
          gsap.set(d.el, { opacity: 1 })
          setTimeout(() => { if (d.el) d.el.textContent = d.originalChar }, Math.max(30, perCharBase * 400))
        } else {
          d.el.textContent = d.originalChar
          gsap.set(d.el, { opacity: 1 })
        }
        revealed[i] = true
      }
    }
    if (caretEl) {
      let latest = -1
      for (let i = total - 1; i >= 0; i--) { if (revealed[i]) { latest = i; break } }
      if (latest >= 0 && latest < total - 1) {
        const nextEl = data[latest + 1].el
        if (nextEl.parentNode) nextEl.parentNode.insertBefore(caretEl, nextEl)
      } else if (latest === total - 1 && container.lastChild !== caretEl) {
        container.appendChild(caretEl)
      }
    }
  },
})
if (caretEl && blinkRate > 0) {
  const period = 1 / blinkRate
  tl.to(caretEl, { opacity: 0, duration: 0.001, repeat: -1, yoyo: true, repeatDelay: period * 0.5 }, totalDuration * 0.5)
}`
}

function buildMaskRevealPreset(opts: GSAPOpts): string {
  const p = opts.params
  const direction = p.direction ?? 'up'
  const stagger = p.stagger ?? opts.timing.staggerAmount
  const skew = p.skew ?? 0
  const duration = p.duration ?? 0.8
  const easingStr = p.easing ?? opts.timing.easing

  return `// Mask Reveal preset
const direction = ${stringify(direction)}
const stagger = ${stagger}
const skew = ${skew}
const duration = ${duration.toFixed(2)}
const easingStr = ${stringify(easingStr)}
const delay = ${opts.timing.delay.toFixed(3)}
const staggerOrigin = ${stringify(opts.timing.staggerOrigin)}
const staggers = buildStagger(units.length, staggerOrigin, stagger)

const wrapped = units.map((unit) => {
  const el = unit.el
  const parent = el.parentNode
  const wrapper = document.createElement('span')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.style.display = 'inline-block'
  wrapper.style.overflow = 'hidden'
  wrapper.style.verticalAlign = 'baseline'
  const inner = el
  inner.style.display = 'inline-block'
  if (parent) { parent.replaceChild(wrapper, el); wrapper.appendChild(inner) }
  const rect = inner.getBoundingClientRect()
  const w = rect.width
  const h = rect.height
  let sx = 0, sy = 0, skx = skew, sky = 0
  switch (direction) {
    case 'up': sy = h; break
    case 'down': sy = -h; break
    case 'left': sx = w; sky = skew; skx = 0; break
    case 'right': sx = -w; sky = skew; skx = 0; break
  }
  gsap.set(inner, { x: sx, y: sy, skewX: skx, skewY: sky })
  return { wrapper, inner }
})
const tl = gsap.timeline()
for (let i = 0; i < wrapped.length; i++) {
  const d = wrapped[i]
  const sd = staggers[i] ?? 0
  tl.to(d.inner, {
    x: 0, y: 0, skewX: 0, skewY: 0,
    duration,
    delay: delay + sd,
    ease: easingStr,
  }, 0)
}`
}

function buildBlurFocusPreset(opts: GSAPOpts): string {
  const p = opts.params
  const blurAmount = p.blurAmount ?? 20
  const scaleFrom = p.scaleFrom ?? 1.5
  const stagger = p.stagger ?? opts.timing.staggerAmount
  const direction = p.direction ?? 'none'
  const threshold = p.threshold ?? 1

  return `// Blur Focus preset
const blurAmount = ${blurAmount}
const scaleFrom = ${scaleFrom}
const stagger = ${stagger}
const direction = ${stringify(direction)}
const threshold = ${threshold}
const duration = ${opts.timing.duration.toFixed(2)}
const delay = ${opts.timing.delay.toFixed(3)}
const easing = ${stringify(opts.timing.easing || 'power3.out')}
const staggerOrigin = ${stringify(opts.timing.staggerOrigin)}
const { repeat, yoyo } = repeatConfig(${stringify(opts.timing.repeatMode)})
const staggers = buildStagger(units.length, staggerOrigin, stagger)
const fs = window.getComputedStyle(container).fontSize
const fontSize = parseFloat(fs) || 16
const distance = fontSize * threshold
const charData = units.map((unit) => {
  const el = unit.el
  let sx = 0, sy = 0
  switch (direction) {
    case 'up': sy = -distance; break
    case 'down': sy = distance; break
    case 'left': sx = -distance; break
    case 'right': sx = distance; break
    case 'random': {
      const a = Math.random() * Math.PI * 2
      sx = Math.cos(a) * distance
      sy = Math.sin(a) * distance
      break
    }
  }
  gsap.set(el, { x: sx, y: sy, scale: scaleFrom, opacity: 0, filter: \`blur(\${blurAmount}px)\` })
  return { el, sx, sy }
})
const tl = gsap.timeline()
for (let i = 0; i < charData.length; i++) {
  const cd = charData[i]
  const sd = staggers[i] ?? 0
  tl.to(cd.el, {
    x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)',
    duration,
    delay: delay + sd,
    ease: easing,
  }, 0)
}
if (repeat === -1) { tl.repeat(-1); tl.yoyo(yoyo) }`
}

function buildGenericPreset(opts: GSAPOpts): string {
  return `// Generic staggered entrance
const duration = ${opts.timing.duration.toFixed(2)}
const delay = ${opts.timing.delay.toFixed(3)}
const staggerOrigin = ${stringify(opts.timing.staggerOrigin)}
const stagger = ${opts.timing.staggerAmount.toFixed(3)}
const easing = ${stringify(opts.timing.easing)}
const { repeat, yoyo } = repeatConfig(${stringify(opts.timing.repeatMode)})
const staggers = buildStagger(units.length, staggerOrigin, stagger)
const tl = gsap.timeline()
for (let i = 0; i < units.length; i++) {
  const unit = units[i]
  const sd = staggers[i] ?? 0
  gsap.set(unit.el, { opacity: 0, y: 20 })
  tl.to(unit.el, {
    opacity: 1, y: 0,
    duration,
    delay: delay + sd,
    ease: easing,
  }, 0)
}
if (repeat === -1) { tl.repeat(-1); tl.yoyo(yoyo) }`
}

function buildExplodePreset(opts: GSAPOpts): string {
  const p = opts.params
  const force = p.force ?? 300
  const spread = p.spread ?? 360
  const rotation = p.rotation ?? 180
  const gravity = p.gravity ?? 0.5
  const origin = p.origin ?? 'center'
  const reassemble = p.reassemble ?? true

  return `// Explode preset
const force = ${force}
const spread = ${spread}
const rotation = ${rotation}
const gravity = ${gravity}
const origin = ${stringify(origin)}
const reassemble = ${reassemble}
const duration = ${opts.timing.duration.toFixed(2)}
const delay = ${opts.timing.delay.toFixed(3)}
const easing = ${stringify(opts.timing.easing)}
const staggerOrigin = ${stringify(opts.timing.staggerOrigin)}
const staggerAmount = ${opts.timing.staggerAmount.toFixed(3)}
const { repeat, yoyo } = repeatConfig(${stringify(opts.timing.repeatMode)})
const staggers = buildStagger(units.length, staggerOrigin, staggerAmount)
const total = units.length
function angleFor(unit, i) {
  const rand = Math.random()
  switch (origin) {
    case 'center':
    case 'cursor': {
      const dx = unit.normX - 0.5
      const dy = unit.normY - 0.5
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return rand * Math.PI * 2
      return Math.atan2(dy, dx)
    }
    case 'left': return rand * Math.PI - Math.PI / 2
    case 'right': return rand * Math.PI + Math.PI / 2
    default: return rand * Math.PI * 2
  }
}
const charData = units.map((unit, i) => {
  const angle = angleFor(unit, i)
  const spreadRad = (spread / 360) * Math.PI * 2
  const a = angle + (Math.random() - 0.5) * spreadRad
  const randomG = Math.random()
  const explodeX = Math.cos(a) * force + randomG * (spread / 360)
  const explodeY = Math.sin(a) * force
  const rotDir = Math.random() > 0.5 ? 1 : -1
  const rotStart = rotation * rotDir * (0.5 + Math.random() * 0.5)
  const el = unit.el
  gsap.set(el, { x: 0, y: 0, rotate: 0 })
  return {
    unit,
    explodeX, explodeY, rotStart,
    setX: gsap.quickSetter(el, 'x', 'px'),
    setY: gsap.quickSetter(el, 'y', 'px'),
    setRotate: gsap.quickSetter(el, 'rotate', 'deg'),
  }
})
const tl = gsap.timeline()
const timeVars = { t: 0 }
const explodePhase = reassemble ? 0.5 : 1.0
const explodeDuration = duration * explodePhase
const reassembleDuration = reassemble ? duration * (1 - explodePhase) : 0
tl.to(timeVars, {
  t: 1,
  duration: explodeDuration,
  delay,
  ease: easing,
  onUpdate: () => {
    const p = timeVars.t
    for (let i = 0; i < charData.length; i++) {
      const cd = charData[i]
      const st = Math.max(0, Math.min(1, (p - staggers[i]) / Math.max(0.0001, 1 - staggers[i])))
      const eased = gsap.parseEase(easing)(st)
      const g = gravity * 800 * Math.pow(eased * explodeDuration, 2) * 0.01
      cd.setX(cd.explodeX * eased)
      cd.setY(cd.explodeY * eased + g)
      cd.setRotate(cd.rotStart * eased)
    }
  },
})
if (reassemble) {
  tl.call(() => { timeVars.t = 0 })
  tl.to(timeVars, {
    t: 1,
    duration: reassembleDuration,
    ease: 'power3.inOut',
    onUpdate: () => {
      const p = timeVars.t
      for (let i = charData.length - 1; i >= 0; i--) {
        const cd = charData[i]
        const revIdx = total - 1 - i
        const stAgg = staggers[revIdx] ?? 0
        const st = Math.max(0, Math.min(1, (p - stAgg) / Math.max(0.0001, 1 - stAgg)))
        const eased = 1 - gsap.parseEase('power3.inOut')(st)
        const g = gravity * 800 * Math.pow(explodeDuration, 2) * 0.01
        cd.setX(cd.explodeX * eased)
        cd.setY(cd.explodeY * eased + g * eased)
        cd.setRotate(cd.rotStart * eased)
      }
    },
  })
}
if (repeat === -1) { tl.repeat(-1); tl.yoyo(yoyo) }`
}

function buildGlitchPreset(opts: GSAPOpts): string {
  const p = opts.params
  const intensityPct = ((p.intensity ?? 50) / 100).toFixed(2)
  const sliceCount = p.sliceCount ?? 6
  const frequency = p.frequency ?? 0.4
  const channelOffset = p.channelOffset ?? 8
  const colorMode = p.colorMode ?? 'color'

  return `// Glitch preset
const intensityPct = ${intensityPct}
const sliceCount = ${sliceCount}
const frequency = ${frequency}
const channelOffset = ${channelOffset}
const colorMode = ${stringify(colorMode)}
const duration = ${opts.timing.duration.toFixed(2)}
const delay = ${opts.timing.delay.toFixed(3)}
const glitchIntervalMs = Math.max(50, 1000 / (frequency * 10))
function randomClip() {
  const top = Math.floor(Math.random() * 70) + 5
  const bottom = top + Math.floor(Math.random() * 25) + 5
  return \`inset(\${top}% 0 \${100 - Math.min(bottom, 95)}% 0)\`
}
const data = units.map((unit) => {
  const el = unit.el
  const origContent = el.textContent || ''
  el.style.position = 'relative'
  el.textContent = ''
  const layerR = document.createElement('span')
  const layerG = document.createElement('span')
  const layerB = document.createElement('span')
  for (const layer of [layerR, layerG, layerB]) {
    layer.textContent = origContent
    layer.style.position = 'absolute'
    layer.style.left = '0'
    layer.style.top = '0'
    layer.style.whiteSpace = 'nowrap'
    layer.style.pointerEvents = 'none'
    layer.style.willChange = 'transform, clip-path, filter'
  }
  if (colorMode === 'color') {
    layerR.style.color = '#FF3355'
    layerG.style.color = '#33FF88'
    layerB.style.color = '#3388FF'
    layerR.style.mixBlendMode = 'screen'
    layerG.style.mixBlendMode = 'screen'
    layerB.style.mixBlendMode = 'screen'
  }
  el.appendChild(layerR); el.appendChild(layerG); el.appendChild(layerB)
  gsap.set(layerR, { x: -channelOffset })
  gsap.set(layerB, { x: channelOffset })
  return {
    unit, origContent,
    layerR, layerG, layerB,
    setPX: gsap.quickSetter(el, 'x', 'px'),
    setPY: gsap.quickSetter(el, 'y', 'px'),
    setRX: gsap.quickSetter(layerR, 'x', 'px'),
    setBX: gsap.quickSetter(layerB, 'x', 'px'),
    setRC: gsap.quickSetter(layerR, 'clipPath'),
    setGC: gsap.quickSetter(layerG, 'clipPath'),
    setBC: gsap.quickSetter(layerB, 'clipPath'),
    setRB: gsap.quickSetter(layerR, 'filter'),
    setGB: gsap.quickSetter(layerG, 'filter'),
    setBB: gsap.quickSetter(layerB, 'filter'),
  }
})
const tl = gsap.timeline()
const timeVars = { t: 0 }
let glitchAccum = 0, sliceAccum = 0
tl.to(timeVars, {
  t: duration + delay,
  duration: duration + delay,
  ease: 'none',
  onUpdate: () => {
    const dt = 1 / 60
    glitchAccum += dt; sliceAccum += dt
    const jitterStrength = intensityPct * 4
    const glitchActive = glitchAccum * 1000 > glitchIntervalMs
    if (glitchActive) {
      glitchAccum = 0
      for (const d of data) {
        const roll = Math.random()
        if (roll < 0.4 * intensityPct + 0.05) d.setPX((Math.random() - 0.5) * jitterStrength * 3)
        else d.setPX(0)
        if (Math.random() < 0.15 * intensityPct) d.setPY((Math.random() - 0.5) * jitterStrength)
        else d.setPY(0)
        if (roll < 0.35 * intensityPct + 0.1) {
          const ov = channelOffset * intensityPct
          d.setRX(-channelOffset + (Math.random() - 0.5) * ov * 1.5)
          d.setBX(channelOffset + (Math.random() - 0.5) * ov * 1.5)
        } else {
          d.setRX(-channelOffset); d.setBX(channelOffset)
        }
      }
    }
    if (sliceAccum * 1000 > 100) {
      sliceAccum = 0
      const sliceThreshold = 1 - (sliceCount / 25) * intensityPct
      for (const d of data) {
        if (colorMode === 'mono') {
          if (Math.random() > sliceThreshold + 0.2) {
            const blur = Math.random() * 3 * intensityPct
            d.setRB(\`blur(\${blur.toFixed(2)}px)\`)
            d.setGB(\`blur(\${(blur * 0.5).toFixed(2)}px)\`)
            d.setBB(\`blur(\${blur.toFixed(2)}px)\`)
          } else { d.setRB('none'); d.setGB('none'); d.setBB('none') }
        }
        d.setRC(Math.random() > sliceThreshold && Math.random() < 0.5 ? randomClip() : 'none')
        d.setGC(Math.random() > sliceThreshold + 0.05 && Math.random() < 0.5 ? randomClip() : 'none')
        d.setBC(Math.random() > sliceThreshold && Math.random() < 0.5 ? randomClip() : 'none')
      }
    }
  },
})`
}

function buildFlip3dPreset(opts: GSAPOpts): string {
  const p = opts.params
  const distance = p.distance ?? 600
  const stagger = p.stagger ?? opts.timing.staggerAmount
  const axis = p.axis ?? 'X'
  const perspective = p.perspective ?? 1200

  return `// Flip 3D preset
const distance = ${distance}
const stagger = ${stagger}
const axis = ${stringify(axis)}
const perspective = ${perspective}
const duration = ${opts.timing.duration.toFixed(2)}
const delay = ${opts.timing.delay.toFixed(3)}
const easing = ${stringify(opts.timing.easing)}
const staggerOrigin = ${stringify(opts.timing.staggerOrigin)}
const { repeat, yoyo } = repeatConfig(${stringify(opts.timing.repeatMode)})
const staggers = buildStagger(units.length, staggerOrigin, stagger)
container.style.perspective = \`\${perspective}px\`
const tl = gsap.timeline()
for (let i = 0; i < units.length; i++) {
  const el = units[i].el
  const sd = staggers[i] ?? 0
  const rotProp = axis === 'X' ? 'rotateX' : 'rotateY'
  const dir = (units[i].normX < 0.5) ? -1 : 1
  gsap.set(el, {
    opacity: 0,
    transformStyle: 'preserve-3d',
    [rotProp]: -90 * dir,
    z: -distance,
  })
  tl.to(el, {
    opacity: 1,
    [rotProp]: 0,
    z: 0,
    duration,
    delay: delay + sd,
    ease: easing,
  }, 0)
}
if (repeat === -1) { tl.repeat(-1); tl.yoyo(yoyo) }`
}

function buildScramblePreset(opts: GSAPOpts): string {
  const p = opts.params
  const scrambleChars = (p.scrambleChars ?? '!<>-_\\/[]{}—=+*^?#________') as string
  const speed = p.speed ?? 1
  const stagger = p.stagger ?? opts.timing.staggerAmount

  return `// Scramble preset
const CHARS = ${stringify(scrambleChars)}
const speed = ${speed}
const stagger = ${stagger}
const duration = ${opts.timing.duration.toFixed(2)}
const delay = ${opts.timing.delay.toFixed(3)}
const staggerOrigin = ${stringify(opts.timing.staggerOrigin)}
const easing = ${stringify(opts.timing.easing)}
const staggers = buildStagger(units.length, staggerOrigin, stagger)
const tl = gsap.timeline()
for (let i = 0; i < units.length; i++) {
  const unit = units[i]
  const finalChar = unit.el.textContent || ''
  const sd = staggers[i] ?? 0
  const durationChar = duration * 0.6
  const startDelay = delay + sd
  const steps = Math.max(4, Math.floor(gsap.utils.clamp(4, 40, durationChar * speed * 30)))
  gsap.set(unit.el, { opacity: 1 })
  const step = { step: 0 }
  tl.to(step, {
    step: steps,
    duration: durationChar,
    delay: startDelay,
    ease: easing,
    onUpdate: () => {
      const progress = step.step / steps
      if (progress < 1) {
        unit.el.textContent = CHARS[Math.floor(Math.random() * CHARS.length)]
      } else {
        unit.el.textContent = finalChar
      }
    },
  }, 0)
}`
}

function buildOrbitPreset(opts: GSAPOpts): string {
  const p = opts.params
  const radius = p.radius ?? 200
  const orbitSpeed = p.orbitSpeed ?? 1
  const depth = p.depth ?? 0.6
  const rotateAlong = p.rotateAlong ?? true
  const trail = p.trail ?? 0.3

  return `// Orbit preset
const radius = ${radius}
const orbitSpeed = ${orbitSpeed}
const depth = ${depth}
const rotateAlong = ${rotateAlong}
const trail = ${trail}
const duration = ${opts.timing.duration.toFixed(2)}
container.style.perspective = '1200px'
const tl = gsap.timeline()
const timeVars = { t: 0 }
const setters = units.map((unit, i) => {
  const el = unit.el
  el.style.transformStyle = 'preserve-3d'
  const phase = (i / Math.max(1, units.length)) * Math.PI * 2
  return {
    setX: gsap.quickSetter(el, 'x', 'px'),
    setY: gsap.quickSetter(el, 'y', 'px'),
    setZ: gsap.quickSetter(el, 'z', 'px'),
    setR: gsap.quickSetter(el, 'rotate', 'deg'),
    setRotZ: gsap.quickSetter(el, 'rotateZ', 'deg'),
    phase,
    i,
  }
})
tl.to(timeVars, {
  t: Math.PI * 2,
  duration,
  ease: 'none',
  repeat: -1,
  onUpdate: () => {
    const t = timeVars.t * orbitSpeed
    const total = setters.length
    for (let k = 0; k < total; k++) {
      const s = setters[k]
      const trailOff = (s.i / total) * Math.PI * 2 * trail
      const angle = s.phase + t - trailOff
      s.setX(Math.cos(angle) * radius)
      s.setY(Math.sin(angle) * radius * 0.4)
      s.setZ(Math.sin(angle + Math.PI / 2) * radius * depth)
      if (rotateAlong) {
        s.setRotZ(angle * 57.2958)
      }
    }
  },
})`
}

function buildElasticStretchPreset(opts: GSAPOpts): string {
  const p = opts.params
  const stretchX = p.stretchX ?? 0.6
  const stretchY = p.stretchY ?? 0.2
  const frequency = p.frequency ?? 3
  const decay = p.decay ?? 1.5
  const stagger = p.stagger ?? opts.timing.staggerAmount

  return `// Elastic Stretch preset
const stretchX = ${stretchX}
const stretchY = ${stretchY}
const frequency = ${frequency}
const decay = ${decay}
const stagger = ${stagger}
const duration = ${opts.timing.duration.toFixed(2)}
const delay = ${opts.timing.delay.toFixed(3)}
const staggerOrigin = ${stringify(opts.timing.staggerOrigin)}
const staggers = buildStagger(units.length, staggerOrigin, stagger)
const tl = gsap.timeline()
const timeVars = { t: 0 }
const setters = units.map((unit) => ({
  setSX: gsap.quickSetter(unit.el, 'scaleX'),
  setSY: gsap.quickSetter(unit.el, 'scaleY'),
  setOpacity: gsap.quickSetter(unit.el, 'opacity'),
}))
tl.to(timeVars, {
  t: 1,
  duration: Math.max(duration, 0.01),
  delay,
  ease: 'none',
  onUpdate: () => {
    const p = timeVars.t
    for (let i = 0; i < setters.length; i++) {
      const s = setters[i]
      const st = Math.max(0, Math.min(1, (p - staggers[i]) / Math.max(0.0001, 1 - staggers[i])))
      const damp = Math.exp(-st * decay * 3)
      const osc = Math.cos(st * Math.PI * 2 * frequency)
      const sx = 1 + osc * damp * stretchX
      const sy = 1 - osc * damp * stretchY
      s.setSX(sx)
      s.setSY(sy)
      s.setOpacity(1 - (1 - st) * 0.7)
    }
  },
})`
}

function buildVariableWavePreset(opts: GSAPOpts): string {
  const p = opts.params
  const weightMin = p.weightMin ?? 100
  const weightMax = p.weightMax ?? 900
  const widthMin = p.widthMin ?? 50
  const widthMax = p.widthMax ?? 125
  const wavelength = p.wavelength ?? 8
  const speed = p.speed ?? 2

  return `// Variable Wave preset (font-variation driven)
const weightMin = ${weightMin}
const weightMax = ${weightMax}
const widthMin = ${widthMin}
const widthMax = ${widthMax}
const wavelength = ${wavelength}
const speed = ${speed}
const duration = ${opts.timing.duration.toFixed(2)}
const tl = gsap.timeline()
const timeVars = { t: 0 }
const setters = units.map((unit, i) => ({
  set: gsap.quickSetter(unit.el, 'fontVariationSettings'),
  i,
  normX: unit.normX,
  total: units.length,
}))
tl.to(timeVars, {
  t: Math.PI * 2,
  duration,
  ease: 'none',
  repeat: -1,
  onUpdate: () => {
    const t = timeVars.t * speed
    for (const s of setters) {
      const idxPhase = (s.i / wavelength) * Math.PI * 2
      const nxp = s.normX * Math.PI * 2
      const phase = idxPhase + nxp * 0.3
      const wave = (Math.sin(phase + t) + 1) * 0.5
      const wght = weightMin + (weightMax - weightMin) * wave
      const wdth = widthMin + (widthMax - widthMin) * wave
      s.set(\`"wght" \${Math.round(wght)}, "wdth" \${Math.round(wdth)}\`)
    }
  },
})`
}

function presetBuildLogic(opts: GSAPOpts): string {
  switch (opts.presetId) {
    case 'wave':
      return buildWavePreset(opts)
    case 'gravityDrop':
      return buildGravityDropPreset(opts)
    case 'typewriter':
      return buildTypewriterPreset(opts)
    case 'maskReveal':
      return buildMaskRevealPreset(opts)
    case 'blurFocus':
      return buildBlurFocusPreset(opts)
    case 'explode':
      return buildExplodePreset(opts)
    case 'glitch':
      return buildGlitchPreset(opts)
    case 'flip3d':
      return buildFlip3dPreset(opts)
    case 'scramble':
      return buildScramblePreset(opts)
    case 'orbit':
      return buildOrbitPreset(opts)
    case 'elasticStretch':
      return buildElasticStretchPreset(opts)
    case 'variableWave':
      return buildVariableWavePreset(opts)
    default:
      return buildGenericPreset(opts)
  }
}

export function generateGSAPSnippet(opts: GSAPOpts): string {
  const splitMode = opts.splitMode ?? 'chars'
  const presetBuild = presetBuildLogic(opts)
  const helpers = staggerHelper()

  const alignMap: Record<string, string> = {
    left: 'left',
    center: 'center',
    right: 'right',
    justify: 'justify',
  }
  const textAlign = alignMap[opts.align] || 'center'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Kinetic Type — ${jsEscape(opts.presetId)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100vh; background: #0B0B0C; }
  body {
    display: grid;
    place-items: center;
    padding: 40px;
    font-family: ${jsEscape(opts.fontFamily)}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  #kinetic {
    font-family: inherit;
    font-size: ${opts.fontSize}px;
    line-height: ${opts.lineHeight};
    letter-spacing: ${opts.letterSpacing}em;
    color: ${jsEscape(opts.textColor)};
    text-align: ${textAlign};
    display: block;
    max-width: 90vw;
    word-break: break-word;
    white-space: normal;
    position: relative;
  }
</style>
<script type="importmap">
{
  "imports": {
    "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"
  }
}
</script>
</head>
<body>
<div id="kinetic">${jsEscape(opts.text)}</div>
<script type="module">
import gsap from 'gsap'

${SPLIT_FUNCTION_INLINE}

${helpers}

const container = document.getElementById('kinetic')
const units = splitText(container, ${stringify(splitMode)})

${presetBuild}

// Playback helpers: space to restart
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && typeof tl !== 'undefined') {
    tl.pause(); tl.seek(0); tl.play();
  }
})
</script>
</body>
</html>`
}
