import gsap from 'gsap'

export type SplitMode = 'chars' | 'words' | 'lines'

export type SplitUnit = {
  index: number
  total: number
  lineIndex: number
  charInWord: number
  normX: number
  normY: number
  distFromCenter: number
  el: HTMLElement
}

type WordToken = {
  text: string
  isSpace: boolean
}

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const IntlAny = Intl as any
      const segmenter = new IntlAny.Segmenter(undefined, { granularity: 'grapheme' })
      const segments = segmenter.segment(text)
      const result: string[] = []
      for (const seg of segments) {
        result.push(seg.segment)
      }
      return result
    } catch {
      return Array.from(text)
    }
  }
  return Array.from(text)
}

function splitIntoWordTokens(text: string): WordToken[] {
  const tokens: WordToken[] = []
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
  if (buffer.length > 0) {
    tokens.push({ text: buffer, isSpace: inSpace })
  }
  return tokens
}

function createUnitSpan(text: string): HTMLElement {
  const span = document.createElement('span')
  span.style.display = 'inline-block'
  span.setAttribute('aria-hidden', 'true')
  span.textContent = text
  return span
}

function createSpaceSpan(): HTMLElement {
  const span = document.createElement('span')
  span.style.display = 'inline-block'
  span.setAttribute('aria-hidden', 'true')
  span.innerHTML = '&nbsp;'
  return span
}

function clearChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }
}

export function computeUnitMetadata(
  spans: HTMLElement[],
  container: HTMLElement
): Omit<SplitUnit, 'el'>[] {
  const containerRect = container.getBoundingClientRect()
  const cw = containerRect.width || 1
  const ch = containerRect.height || 1
  const diag = Math.sqrt(0.5)

  const result: Omit<SplitUnit, 'el'>[] = []

  for (const span of spans) {
    const r = span.getBoundingClientRect()
    const cx = (r.left + r.right) / 2 - containerRect.left
    const cy = (r.top + r.bottom) / 2 - containerRect.top
    const normX = Math.max(0, Math.min(1, cx / cw))
    const normY = Math.max(0, Math.min(1, cy / ch))
    const dx = normX - 0.5
    const dy = normY - 0.5
    const distFromCenter = Math.max(0, Math.min(1, Math.sqrt(dx * dx + dy * dy) / diag))
    result.push({
      index: 0,
      total: spans.length,
      lineIndex: 0,
      charInWord: 0,
      normX,
      normY,
      distFromCenter,
    })
  }

  return result
}

function groupLinesByOffsetTop(
  wordSpans: HTMLElement[],
  tolerance: number = 2
): number[] {
  const lineIndices: number[] = []
  const tops: number[] = []
  let currentLine = 0

  for (let i = 0; i < wordSpans.length; i++) {
    const span = wordSpans[i]
    const top = span.offsetTop
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

function wrapLines(
  element: HTMLElement,
  wordSpans: HTMLElement[],
  lineIndices: number[]
): HTMLElement[] {
  clearChildren(element)

  const totalLines = lineIndices.length > 0 ? Math.max(...lineIndices) + 1 : 0
  const reMeasuredWordSpans: HTMLElement[] = []
  const lineFrag = document.createDocumentFragment()

  for (let li = 0; li < totalLines; li++) {
    const lineSpan = document.createElement('span')
    lineSpan.style.display = 'block'
    lineSpan.setAttribute('aria-hidden', 'true')

    for (let wi = 0; wi < wordSpans.length; wi++) {
      if (lineIndices[wi] === li) {
        const wordSpan = wordSpans[wi]
        lineSpan.appendChild(wordSpan)
        reMeasuredWordSpans.push(wordSpan)

        if (wi < wordSpans.length - 1 && lineIndices[wi + 1] === li) {
          const spaceSpan = createSpaceSpan()
          lineSpan.appendChild(spaceSpan)
        }
      }
    }

    lineFrag.appendChild(lineSpan)
  }

  element.appendChild(lineFrag)

  return reMeasuredWordSpans
}

export function split(
  element: HTMLElement,
  mode: SplitMode
): SplitUnit[] {
  const rawText = element.textContent || ''
  const originalText = rawText.replace(/\u00A0/g, ' ')
  element.setAttribute('aria-label', originalText)
  element.setAttribute('role', 'group')

  clearChildren(element)

  const wordTokens = splitIntoWordTokens(originalText)

  if (mode === 'chars') {
    const frag = document.createDocumentFragment()
    const unitSpans: HTMLElement[] = []
    let globalIndex = 0

    for (let wi = 0; wi < wordTokens.length; wi++) {
      const token = wordTokens[wi]
      if (token.isSpace) {
        const spaceCount = token.text.length
        for (let s = 0; s < spaceCount; s++) {
          frag.appendChild(createSpaceSpan())
        }
      } else {
        const graphemes = splitGraphemes(token.text)
        for (let ci = 0; ci < graphemes.length; ci++) {
          const span = createUnitSpan(graphemes[ci])
          frag.appendChild(span)
          unitSpans.push(span)
          ;(span as any).__splitUnit_globalIndex = globalIndex
          ;(span as any).__splitUnit_charInWord = ci
          globalIndex++
        }
      }
    }

    element.appendChild(frag)

    const metadata = computeUnitMetadata(unitSpans, element)
    const lineIndices = groupLinesByOffsetTop(unitSpans)
    const units: SplitUnit[] = []

    for (let i = 0; i < unitSpans.length; i++) {
      const span = unitSpans[i]
      const meta = metadata[i]
      const unit: SplitUnit = {
        index: i,
        total: unitSpans.length,
        lineIndex: lineIndices[i],
        charInWord: (span as any).__splitUnit_charInWord ?? 0,
        normX: meta.normX,
        normY: meta.normY,
        distFromCenter: meta.distFromCenter,
        el: span,
      }
      ;(span as any).__splitUnit = unit
      units.push(unit)
    }

    return units
  }

  if (mode === 'words') {
    const frag = document.createDocumentFragment()
    const wordSpans: HTMLElement[] = []

    for (let wi = 0; wi < wordTokens.length; wi++) {
      const token = wordTokens[wi]
      if (token.isSpace) {
        const spaceCount = token.text.length
        for (let s = 0; s < spaceCount; s++) {
          frag.appendChild(createSpaceSpan())
        }
      } else {
        const span = createUnitSpan(token.text)
        frag.appendChild(span)
        wordSpans.push(span)
      }
    }

    element.appendChild(frag)

    const metadata = computeUnitMetadata(wordSpans, element)
    const lineIndices = groupLinesByOffsetTop(wordSpans)
    const units: SplitUnit[] = []

    for (let i = 0; i < wordSpans.length; i++) {
      const span = wordSpans[i]
      const meta = metadata[i]
      const unit: SplitUnit = {
        index: i,
        total: wordSpans.length,
        lineIndex: lineIndices[i],
        charInWord: 0,
        normX: meta.normX,
        normY: meta.normY,
        distFromCenter: meta.distFromCenter,
        el: span,
      }
      ;(span as any).__splitUnit = unit
      units.push(unit)
    }

    return units
  }

  // lines mode: first append all words to element via DocumentFragment,
  //   measure lines by offsetTop, then re-wrap into block line spans
  {
    const frag = document.createDocumentFragment()
    const wordSpans: HTMLElement[] = []
    for (const wt of wordTokens) {
      if (wt.isSpace) {
        const spaceCount = wt.text.length
        for (let s = 0; s < spaceCount; s++) {
          frag.appendChild(createSpaceSpan())
        }
      } else {
        const span = createUnitSpan(wt.text)
        frag.appendChild(span)
        wordSpans.push(span)
      }
    }
    element.appendChild(frag)

    const lineIndices = groupLinesByOffsetTop(wordSpans)
    const reMeasuredWordSpans = wrapLines(element, wordSpans, lineIndices)

    const metadata = computeUnitMetadata(reMeasuredWordSpans, element)
    const reMeasuredLineIndices = groupLinesByOffsetTop(reMeasuredWordSpans)
    const units: SplitUnit[] = []

    for (let i = 0; i < reMeasuredWordSpans.length; i++) {
      const span = reMeasuredWordSpans[i]
      const meta = metadata[i]
      const unit: SplitUnit = {
        index: i,
        total: reMeasuredWordSpans.length,
        lineIndex: reMeasuredLineIndices[i],
        charInWord: 0,
        normX: meta.normX,
        normY: meta.normY,
        distFromCenter: meta.distFromCenter,
        el: span,
      }
      ;(span as any).__splitUnit = unit
      units.push(unit)
    }

    return units
  }
}

export function splitAsync(
  element: HTMLElement,
  mode: SplitMode,
  options: { waitFonts?: boolean } = {}
): Promise<SplitUnit[]> {
  return new Promise((resolve) => {
    const doSplit = () => {
      const units = split(element, mode)
      requestAnimationFrame(() => {
        resolve(units)
      })
    }

    if (options.waitFonts && typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => doSplit()).catch(() => doSplit())
    } else {
      doSplit()
    }
  })
}

export function teardownSplit(element: HTMLElement): void {
  const spans = element.querySelectorAll('span')
  if (spans.length > 0) {
    gsap.killTweensOf(spans)
  }
  const originalText = element.getAttribute('aria-label') || ''
  element.textContent = originalText
  element.removeAttribute('aria-label')
  element.removeAttribute('role')
}
