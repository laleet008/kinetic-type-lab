import { describe, it, expect } from 'vitest'
import { generateCSS, type CodegenOpts } from '../lib/codegen/css'
import { generateGSAPSnippet } from '../lib/codegen/gsap'
import { generateReactComponent } from '../lib/codegen/react'

const minimalSplitUnits = Array.from({ length: 6 }, (_, i) => ({
  index: i,
  total: 6,
  lineIndex: 0,
  charInWord: i,
  normX: i / 5,
  normY: 0.5,
  distFromCenter: Math.abs(i - 2.5) / 5,
}))

const minimalOpts: CodegenOpts = {
  text: 'Hello',
  fontFamily: 'Inter',
  fontSize: 72,
  lineHeight: 1.1,
  letterSpacing: 0,
  align: 'center',
  textColor: '#ECECEE',
  presetId: 'wave',
  params: {},
  timing: {
    duration: 2,
    delay: 0,
    staggerAmount: 0.03,
    staggerOrigin: 'center',
    easing: 'power2.out',
    repeatMode: 'loop',
  },
  splitUnits: minimalSplitUnits,
}

describe('codegen outputs are structurally valid', () => {
  it('css preset (maskReveal, gravityDrop, typewriter, blurFocus) emit @keyframes keyword', () => {
    ;(['gravityDrop', 'typewriter', 'maskReveal', 'blurFocus'] as const).forEach((presetId) => {
      const out = generateCSS({ ...minimalOpts, presetId })
      expect(out.html.length).toBeGreaterThan(0)
      expect(out.css.length).toBeGreaterThan(0)
      expect(out.combined.length).toBeGreaterThan(0)
      expect(out.combined).toContain('@keyframes')
    })
  })

  it('wave/glitch/explode/flip3d emit JS-only note', () => {
    ;(['wave', 'glitch', 'explode', 'flip3d'] as const).forEach((presetId) => {
      const out = generateCSS({ ...minimalOpts, presetId })
      expect(out.note).toBeDefined()
      expect(typeof out.note).toBe('string')
      expect(out.note!.length).toBeGreaterThan(0)
      expect(out.combined).toContain('JS-only')
    })
  })

  it('GSAP snippet is standalone HTML with import map + split() inlined', () => {
    const out = generateGSAPSnippet(minimalOpts)
    expect(out).toContain('<!doctype html>')
    expect(out).toContain('</script>')
    expect(out).toContain('importmap')
    expect(out).toContain('gsap@3')
    expect(out).toContain('splitGraphemes')
    expect(out).toContain('<div id="kinetic">')
    expect(out).toContain('import gsap from \'gsap\'')
  })

  it('React component exports KineticText and imports React hooks', () => {
    const out = generateReactComponent(minimalOpts)
    expect(out).toContain('useEffect')
    expect(out).toContain('useRef')
    expect(out).toContain('export default')
    expect(out).toContain('KineticText')
    expect(out).toContain('export function KineticText')
    expect(out).toContain('import gsap from \'gsap\'')
    expect(out).toContain('import { useEffect, useRef } from \'react\'')
  })

  it('generateCSS returns non-empty {html, css, combined} strings for all presets', () => {
    const presets = ['wave', 'gravityDrop', 'typewriter', 'maskReveal', 'blurFocus', 'explode']
    for (const p of presets) {
      const out = generateCSS({ ...minimalOpts, presetId: p })
      expect(out.html.length).toBeGreaterThan(0)
      expect(out.css.length).toBeGreaterThan(0)
      expect(out.combined.length).toBeGreaterThan(out.html.length)
    }
  })

  it('blurFocus CSS includes blur() filter in keyframes', () => {
    const out = generateCSS({ ...minimalOpts, presetId: 'blurFocus' })
    expect(out.combined).toContain('@keyframes blurFocus')
    expect(out.css).toContain('filter: blur(')
  })

  it('typewriter CSS includes caret blink keyframes when caretStyle is set', () => {
    const out = generateCSS({
      ...minimalOpts,
      presetId: 'typewriter',
      params: { caretStyle: 'block', blinkRate: 2 },
    })
    expect(out.combined).toContain('@keyframes caretBlink')
  })
})
