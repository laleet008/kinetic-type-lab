import { describe, it, expect } from 'vitest'
import { EASE_LIST, cubicBezier, isCubicBezier, parseEasing } from '../lib/easing'

describe('easing', () => {
  it('EASE_LIST contains at least 28 entries incl. power2.out, back.inOut, elastic.in', () => {
    expect(EASE_LIST.map((e) => e.id)).toEqual(
      expect.arrayContaining(['power2.out', 'back.inOut', 'elastic.in'])
    )
    expect(EASE_LIST.length).toBeGreaterThanOrEqual(28)
  })

  it('cubicBezier(x1,y1,x2,y2) clamps inputs to 0..1 x and -0.5..1.5 y', () => {
    expect(cubicBezier(5, -10, 2, 5)).toContain('cubic-bezier(1, -0.5, 1, 1.5)')
    expect(cubicBezier(-1, -0.75, 0.5, 2)).toContain('cubic-bezier(0, -0.5, 0.5, 1.5)')
    expect(cubicBezier(0.25, 0.1, 0.25, 1)).toContain('cubic-bezier(0.25, 0.1, 0.25, 1)')
  })

  it('isCubicBezier accepts 4 numeric args, rejects malformed', () => {
    expect(isCubicBezier('cubic-bezier(0.1,0.2,0.3,0.4)')).toBe(true)
    expect(isCubicBezier(' cubic-bezier( 0.1 , 0.2 , 0.3 , 0.4 ) ')).toBe(true)
    expect(isCubicBezier('power2.out')).toBe(false)
    expect(isCubicBezier('cubic-bezier(1,2,3)')).toBe(false)
    expect(isCubicBezier('cubic-bezier(a,b,c,d)')).toBe(false)
    expect(isCubicBezier('beizer(0.1,0.2,0.3,0.4)')).toBe(false)
  })

  it('parseEasing discriminated union: gsap name → {type:"gsap"}; cubic → {type:"cubicBezier", value:4-tuple}', () => {
    expect(parseEasing('power2.out').type).toBe('gsap')
    const g = parseEasing('power2.out')
    if (g.type === 'gsap') {
      expect(g.value).toBe('power2.out')
    }
    const cu = parseEasing('cubic-bezier(0.16,1,0.3,1)')
    expect(cu.type).toBe('cubicBezier')
    if (cu.type === 'cubicBezier') {
      expect(cu.value).toHaveLength(4)
      expect(cu.value[0]).toBeCloseTo(0.16, 5)
      expect(cu.value[1]).toBeCloseTo(1, 5)
      expect(cu.value[2]).toBeCloseTo(0.3, 5)
      expect(cu.value[3]).toBeCloseTo(1, 5)
    }
  })

  it('parseEasing falls back to gsap power2.out for unknown strings', () => {
    const parsed = parseEasing('totallyMadeUpEasing')
    expect(parsed.type).toBe('gsap')
    if (parsed.type === 'gsap') {
      expect(parsed.value).toBe('power2.out')
    }
  })

  it('EASE_LIST has no duplicate ids', () => {
    const ids = EASE_LIST.map((e) => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('cubicBezier preserves valid inputs unchanged', () => {
    const result = cubicBezier(0.42, 0, 0.58, 1)
    expect(result).toContain('0.42')
    expect(result).toContain('0.58')
  })
})
