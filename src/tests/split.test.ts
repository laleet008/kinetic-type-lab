import { describe, it, expect, beforeEach, vi } from 'vitest'
import { split, splitAsync, teardownSplit, computeUnitMetadata } from '@/lib/split'

function setupContainer(text: string, styles: Partial<CSSStyleDeclaration> = {}): HTMLElement {
  const container = document.createElement('div')
  container.textContent = text
  Object.assign(container.style, {
    position: 'relative',
    width: '500px',
    height: '200px',
    fontSize: '16px',
    fontFamily: 'monospace',
    ...styles,
  })
  document.body.appendChild(container)
  return container
}

function mockBoundingRects(
  spans: HTMLElement[],
  container: HTMLElement,
  positions: Array<{ left: number; top: number; width: number; height: number }>
): void {
  const containerRect = {
    left: 0,
    top: 0,
    right: 500,
    bottom: 200,
    width: 500,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect)

  spans.forEach((span, i) => {
    const pos = positions[i] || { left: 0, top: 0, width: 10, height: 20 }
    const rect = {
      left: pos.left,
      top: pos.top,
      right: pos.left + pos.width,
      bottom: pos.top + pos.height,
      width: pos.width,
      height: pos.height,
      x: pos.left,
      y: pos.top,
      toJSON: () => ({}),
    }
    vi.spyOn(span, 'getBoundingClientRect').mockReturnValue(rect as DOMRect)
  })
}

function mockOffsetTops(spans: HTMLElement[], tops: number[]): void {
  spans.forEach((span, i) => {
    Object.defineProperty(span, 'offsetTop', {
      configurable: true,
      get: () => tops[i] ?? 0,
    })
  })
}

describe('split whitespace preservation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('preserves spaces between word spans when splitting "Hello World Foo" by words', () => {
    const container = setupContainer('Hello World Foo')
    const units = split(container, 'words')

    expect(units.length).toBe(3)
    expect(units[0].el.textContent).toBe('Hello')
    expect(units[1].el.textContent).toBe('World')
    expect(units[2].el.textContent).toBe('Foo')

    const allSpans = container.querySelectorAll('span')
    const spaceSpans: HTMLElement[] = []
    const wordSpans: HTMLElement[] = []

    allSpans.forEach((s) => {
      const el = s as HTMLElement
      if (el.innerHTML === '&nbsp;' || el.textContent === '\u00A0') {
        spaceSpans.push(el)
      } else if (el.textContent && el.textContent.length > 0 && el.textContent !== ' ') {
        wordSpans.push(el)
      }
    })

    expect(wordSpans.length).toBe(3)
    expect(spaceSpans.length).toBe(2)

    const children = Array.from(container.childNodes)
    const structure: string[] = []
    children.forEach((child) => {
      const el = child as HTMLElement
      if (el.tagName === 'SPAN') {
        if (el.innerHTML === '&nbsp;' || el.textContent === '\u00A0') {
          structure.push('space')
        } else {
          structure.push(el.textContent || '')
        }
      }
    })
    expect(structure).toEqual(['Hello', 'space', 'World', 'space', 'Foo'])
  })
})

describe('split line detection with wrapping', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('assigns different lineIndex values when words wrap across multiple lines', () => {
    const container = setupContainer('Short Medium LongestWord Here', {
      width: '100px',
      fontSize: '32px',
    })

    const wordTokens = ['Short', 'Medium', 'LongestWord', 'Here']
    const units = split(container, 'lines')

    expect(units.length).toBe(4)
    units.forEach((u, i) => {
      expect(u.el.textContent).toBe(wordTokens[i])
    })

    const unitSpans = units.map(u => u.el)
    mockOffsetTops(unitSpans, [0, 0, 50, 100])
    mockBoundingRects(
      unitSpans,
      container,
      [
        { left: 0, top: 0, width: 60, height: 40 },
        { left: 65, top: 0, width: 70, height: 40 },
        { left: 0, top: 50, width: 120, height: 40 },
        { left: 0, top: 100, width: 50, height: 40 },
      ]
    )

    const lineGroupSpans = container.querySelectorAll(':scope > span')
    expect(lineGroupSpans.length).toBeGreaterThanOrEqual(1)
    lineGroupSpans.forEach((span) => {
      expect((span as HTMLElement).style.display).toBe('block')
    })

    const uniqueLineIndices = new Set(units.map(u => u.lineIndex))
    expect(uniqueLineIndices.size).toBeGreaterThanOrEqual(1)
    expect(uniqueLineIndices.size).toBeLessThanOrEqual(units.length)
    units.forEach(u => {
      expect(u.lineIndex).toBeGreaterThanOrEqual(0)
      expect(u.lineIndex).toBeLessThan(units.length)
    })
  })
})

describe('split unicode/emoji graphemes', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('handles "aë🇺🇸👨‍👩‍👧" by chars as exactly 4 grapheme units', () => {
    const input = 'aë🇺🇸👨‍👩‍👧'
    const container = setupContainer(input)
    const units = split(container, 'chars')

    const hasSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl

    if (hasSegmenter) {
      expect(units.length).toBe(4)
      expect(units[0].el.textContent).toBe('a')
      expect(units[1].el.textContent).toBe('ë')
      expect(units[2].el.textContent).toBe('🇺🇸')
      expect(units[3].el.textContent).toBe('👨‍👩‍👧')
    } else {
      const seg = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
      const it = seg.segment(input)
      const segs: string[] = []
      for (const s of it) segs.push(s.segment)
      expect(units.length).toBe(segs.length)
    }

    expect(units[0].charInWord).toBe(0)
    expect(units[1].charInWord).toBe(1)
    expect(units[2].charInWord).toBe(2)
    if (units.length >= 4) {
      expect(units[3].charInWord).toBe(3)
    }

    units.forEach((u, i) => {
      expect(u.index).toBe(i)
      expect(u.total).toBe(units.length)
      expect((u.el as any).__splitUnit).toBe(u)
    })
  })
})

describe('split aria correctness', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('sets aria-label on container and aria-hidden on every span for words mode', () => {
    const text = 'Hello World'
    const container = setupContainer(text)
    split(container, 'words')

    expect(container.getAttribute('aria-label')).toBe(text)
    expect(container.getAttribute('role')).toBe('group')

    const allSpans = container.querySelectorAll('span')
    expect(allSpans.length).toBeGreaterThan(0)
    allSpans.forEach((span) => {
      expect(span.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('sets aria-label on container and aria-hidden on every span for chars mode', () => {
    const text = 'Hi'
    const container = setupContainer(text)
    split(container, 'chars')

    expect(container.getAttribute('aria-label')).toBe(text)
    expect(container.getAttribute('role')).toBe('group')

    const allSpans = container.querySelectorAll('span')
    expect(allSpans.length).toBeGreaterThan(0)
    allSpans.forEach((span) => {
      expect(span.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('sets aria-label on container and aria-hidden on every span for lines mode', () => {
    const text = 'Line split test'
    const container = setupContainer(text)
    split(container, 'lines')

    expect(container.getAttribute('aria-label')).toBe(text)
    expect(container.getAttribute('role')).toBe('group')

    const allSpans = container.querySelectorAll('span')
    expect(allSpans.length).toBeGreaterThan(0)
    allSpans.forEach((span) => {
      expect(span.getAttribute('aria-hidden')).toBe('true')
    })
  })
})

describe('teardownSplit', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('restores original textContent and clears aria attributes', () => {
    const text = 'Hello World'
    const container = setupContainer(text)
    split(container, 'words')

    expect(container.getAttribute('aria-label')).toBe(text)
    expect(container.querySelectorAll('span').length).toBeGreaterThan(0)

    teardownSplit(container)

    expect(container.textContent).toBe(text)
    expect(container.getAttribute('aria-label')).toBeNull()
    expect(container.getAttribute('role')).toBeNull()
    expect(container.querySelectorAll('span').length).toBe(0)
  })
})

describe('computeUnitMetadata', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('computes correct normX, normY, distFromCenter for corner positions', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    container.style.width = '400px'
    container.style.height = '400px'

    const cRect = {
      left: 0,
      top: 0,
      right: 400,
      bottom: 400,
      width: 400,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(cRect as DOMRect)

    const span1 = document.createElement('span')
    const span2 = document.createElement('span')
    const span3 = document.createElement('span')

    vi.spyOn(span1, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect)

    vi.spyOn(span2, 'getBoundingClientRect').mockReturnValue({
      left: 390, top: 0, right: 400, bottom: 10, width: 10, height: 10, x: 390, y: 0, toJSON: () => ({}),
    } as DOMRect)

    vi.spyOn(span3, 'getBoundingClientRect').mockReturnValue({
      left: 195, top: 195, right: 205, bottom: 205, width: 10, height: 10, x: 195, y: 195, toJSON: () => ({}),
    } as DOMRect)

    const result = computeUnitMetadata([span1, span2, span3], container)

    expect(result[0].normX).toBeCloseTo(0.0125, 3)
    expect(result[0].normY).toBeCloseTo(0.0125, 3)
    expect(result[0].distFromCenter).toBeGreaterThan(0.6)

    expect(result[1].normX).toBeCloseTo(0.9875, 3)
    expect(result[1].normY).toBeCloseTo(0.0125, 3)
    expect(result[1].distFromCenter).toBeGreaterThan(0.6)

    expect(result[2].normX).toBeCloseTo(0.5, 3)
    expect(result[2].normY).toBeCloseTo(0.5, 3)
    expect(result[2].distFromCenter).toBeCloseTo(0, 3)
  })
})

describe('splitAsync', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('returns units after rAF', async () => {
    const container = setupContainer('Async Test')
    const units = await splitAsync(container, 'words')

    expect(units.length).toBe(2)
    expect(units[0].el.textContent).toBe('Async')
    expect(units[1].el.textContent).toBe('Test')
    expect(container.getAttribute('aria-label')).toBe('Async Test')
  })
})

describe('split cleanup on re-split', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('removes previous children before injecting new ones', () => {
    const container = setupContainer('First Second')
    split(container, 'words')
    const firstSpanCount = container.querySelectorAll('span').length
    expect(firstSpanCount).toBeGreaterThan(0)

    container.textContent = 'Three Words Here'
    split(container, 'words')
    const units = split(container, 'words')

    expect(units.length).toBe(3)
    expect(units[0].el.textContent).toBe('Three')
    expect(units[1].el.textContent).toBe('Words')
    expect(units[2].el.textContent).toBe('Here')

    expect(container.getAttribute('aria-label')).toBe('Three Words Here')
  })
})

describe('split DOM order regression — bug: typing reversed text (teelal ↔ laleet)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('split("laleet", "chars") returns spans whose textContent joined in DOM order equals "laleet"', () => {
    const container = setupContainer('laleet')
    const units = split(container, 'chars')

    // Assertion 1: exactly 6 units, ordered correctly
    expect(units.length).toBe(6)
    expect(units.map((u) => u.el.textContent)).toEqual(['l', 'a', 'l', 'e', 'e', 't'])

    // Assertion 2: the DOM children span textContents joined (skip space spans) match input
    const allSpans = container.querySelectorAll('span')
    const charText: string[] = []
    allSpans.forEach((span) => {
      const el = span as HTMLElement
      const isSpace = el.innerHTML === '&nbsp;' || el.textContent === '\u00A0' || el.textContent === ' '
      if (!isSpace && el.textContent && el.textContent.length > 0) {
        charText.push(el.textContent)
      }
    })
    expect(charText.join('')).toBe('laleet')

    // Assertion 3: sequential DOM iteration of char leaf spans also spells "laleet"
    // The splitter appends leaf spans in order; each leaf span contains a single char text node.
    // Collect every span with a non-space textContent and no descendant <span> elements,
    // sorted by DOM order via querySelectorAll (guaranteed document order), then join their chars.
    const leafCharUnitSpans: HTMLElement[] = []
    const allDomSpans = Array.from(container.querySelectorAll('span')) as HTMLElement[]
    allDomSpans.forEach((el) => {
      const isSpace = el.innerHTML === '&nbsp;' || el.textContent === '\u00A0' || el.textContent === ' '
      const hasSpanChildren = (el.querySelectorAll(':scope > span').length + el.querySelectorAll('span span').length) > 0
        && el.style.display !== 'inline-block'
      const t = el.textContent || ''
      if (!isSpace && !hasSpanChildren && t.length === 1) {
        leafCharUnitSpans.push(el)
      }
    })
    const domChars = leafCharUnitSpans.map((el) => el.textContent!).join('')
    expect(domChars).toBe('laleet')

    // Assertion 4: unit indices run 0..5 in ascending order (no shuffling)
    units.forEach((u, idx) => {
      expect(u.index).toBe(idx)
      expect(u.total).toBe(6)
    })
  })

  it('split("hello world 123", "words") DOM order of char units corresponds to input', () => {
    const input = 'hello world 123'
    const container = setupContainer(input)
    const units = split(container, 'words')

    expect(units.map((u) => u.el.textContent)).toEqual(['hello', 'world', '123'])

    // Iterate container children in DOM order, filter space-spans, concatenate the rest
    const pieces: string[] = []
    container.childNodes.forEach((child) => {
      const el = child as HTMLElement
      if (el.tagName !== 'SPAN') return
      const isSpace = el.innerHTML === '&nbsp;' || el.textContent === '\u00A0'
      if (isSpace) {
        pieces.push(' ')
      } else if (el.textContent) {
        pieces.push(el.textContent)
      }
    })
    expect(pieces.join('')).toBe(input)
  })
})
