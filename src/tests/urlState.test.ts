import { describe, it, expect } from 'vitest'
import { encodeUrlState, decodeUrlState, toUrlState, fromUrlState, migrate, SCHEMA_VERSION } from '../lib/urlState'
import type { LabState } from '../store/lab'

function makeLabState(patch: Partial<LabState> = {}): LabState {
  return {
    text: 'Hello',
    fontFamily: 'inter',
    fontSize: 72,
    lineHeight: 1.2,
    letterSpacing: 0,
    align: 'center',
    textColor: '#FFFFFF',
    stageBg: '#000000',
    aspectRatio: 'free',
    showGrid: false,
    showSafeArea: false,
    presetId: 'wave',
    params: { amplitude: 30 },
    duration: 2.5,
    delay: 0.1,
    staggerAmount: 0.05,
    staggerOrigin: 'center',
    easing: 'power2.out',
    repeatMode: 'loop',
    cursorWeightMode: { enabled: false, params: { radius: 100, maxWeight: 900, minWeight: 100, falloff: 'ease', axis: 'wght', invert: false } },
    physicsMode: { enabled: false, params: { gravity: 1, restitution: 0.6, friction: 0.1, airResistance: 0.02, gravityDir: { x: 0, y: 1 } } },
    textPathMode: { enabled: false, params: { pathId: 'circle', startOffset: 0, spacing: 1, flipSide: false, rotateWithPath: true, animSpeed: 1 } },
    speed: 1,
    loopToggle: true,
    theme: 'dark',
    isPlaying: true,
    progress: 0.5,
    toasts: [{ id: '1', title: 'Hi' }],
    ...patch,
  } as unknown as LabState
}

describe('urlState', () => {
  it('roundtrips a preset+params+timing with encode/decode idempotently', () => {
    const full = makeLabState({
      text: 'Kinetic',
      presetId: 'gravityDrop',
      params: { distance: 300, bounce: 0.4 },
      duration: 1.8,
      easing: 'back.inOut',
    })
    const serial = toUrlState(full)
    expect(serial.presetId).toBe('gravityDrop')
    expect(serial.params).toEqual({ distance: 300, bounce: 0.4 })
    expect(serial.v).toBe(SCHEMA_VERSION)

    const encoded = encodeUrlState(serial)
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)
    expect(/[^A-Za-z0-9\-_]/.test(encoded)).toBe(false)

    const decoded = decodeUrlState(encoded)
    expect(decoded.v).toBe(SCHEMA_VERSION)
    expect(decoded.text).toBe('Kinetic')
    expect(decoded.presetId).toBe('gravityDrop')
    expect(decoded.params).toEqual({ distance: 300, bounce: 0.4 })
    expect(decoded.duration).toBe(1.8)
    expect(decoded.easing).toBe('back.inOut')

    const patched = fromUrlState(decoded) as Partial<LabState>
    expect(patched.text).toBe('Kinetic')
    expect(patched.presetId).toBe('gravityDrop')
    expect(patched.duration).toBe(1.8)

    const reencoded = encodeUrlState(toUrlState(makeLabState(patched)))
    expect(reencoded).toBe(encodeUrlState(decoded))
  })

  it('handles malformed base64 gracefully by throwing', () => {
    expect(() => decodeUrlState('!!!not@@base64')).toThrow()
  })

  it('migrates unversioned data to SCHEMA_VERSION with defaults intact', () => {
    const out = migrate({ presetId: 'wave' } as any)
    expect(out.v).toBe(SCHEMA_VERSION)
    expect(out.presetId).toBe('wave')
    expect(typeof out.fontSize).toBe('number')
    expect(out.fontSize).toBeGreaterThanOrEqual(24)
    expect(out.fontSize).toBeLessThanOrEqual(240)
    expect(['left', 'center', 'right', 'justify']).toContain(out.align)
    expect(typeof out.duration).toBe('number')
    expect(out.duration).toBeGreaterThanOrEqual(0.2)
    expect(out.duration).toBeLessThanOrEqual(30)
    expect(typeof out.easing).toBe('string')
    expect(out.easing.length).toBeGreaterThan(0)
    expect(out.cursorWeightMode).toBeDefined()
    expect(typeof out.cursorWeightMode.enabled).toBe('boolean')
  })

  it('strips transient fields (isPlaying, progress, toasts) from serializable subset', () => {
    const full = makeLabState({
      isPlaying: true,
      progress: 0.75,
      toasts: [{ id: 'a', title: 'Done' }],
    })
    const serial = toUrlState(full) as any
    expect(serial.isPlaying).toBeUndefined()
    expect(serial.progress).toBeUndefined()
    expect(serial.toasts).toBeUndefined()
    expect(serial.text).toBeDefined()
    expect(serial.presetId).toBeDefined()
  })

  it('preserves cubic-bezier easing strings and custom params', () => {
    const easing = 'cubic-bezier(0.16, 1, 0.3, 1)'
    const full = makeLabState({
      easing,
      params: { customFoo: true, customBar: 42, customStr: 'hello' },
    })
    const serial = toUrlState(full)
    expect(serial.easing).toBe(easing)
    expect(serial.params.customFoo).toBe(true)
    expect(serial.params.customBar).toBe(42)
    expect(serial.params.customStr).toBe('hello')

    const encoded = encodeUrlState(serial)
    const decoded = decodeUrlState(encoded)
    expect(decoded.easing).toBe(easing)
    expect(decoded.params.customFoo).toBe(true)
    expect(decoded.params.customBar).toBe(42)
    expect(decoded.params.customStr).toBe('hello')
  })
})
