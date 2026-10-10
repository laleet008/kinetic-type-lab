import { z } from 'zod'
import { useEffect, useRef } from 'react'
import type { LabState } from '../store/lab'

export const SCHEMA_VERSION = 1

export const urlStateSchema = z.object({
  v: z.literal(SCHEMA_VERSION),
  text: z.string().max(10_000),
  fontFamily: z.string(),
  fontSize: z.number().min(24).max(240),
  lineHeight: z.number().min(0.8).max(2),
  letterSpacing: z.number().min(-0.1).max(0.3),
  align: z.enum(['left', 'center', 'right', 'justify']),
  textColor: z.string(),
  stageBg: z.string(),
  aspectRatio: z.enum(['free', '1:1', '16:9', '9:16', '4:5']),
  showGrid: z.boolean(),
  showSafeArea: z.boolean(),
  presetId: z.string(),
  params: z.record(z.unknown()),
  duration: z.number().min(0.2).max(30),
  delay: z.number().min(0).max(10),
  staggerAmount: z.number().min(0).max(2),
  staggerOrigin: z.enum(['start', 'end', 'center', 'edges', 'random']),
  easing: z.string(),
  repeatMode: z.enum(['once', 'loop', 'pingpong']),
  cursorWeightMode: z.object({
    enabled: z.boolean(),
    params: z.record(z.unknown()),
  }),
  physicsMode: z.object({
    enabled: z.boolean(),
    params: z.record(z.unknown()),
  }),
  textPathMode: z.object({
    enabled: z.boolean(),
    params: z.record(z.unknown()),
  }),
  speed: z.number().min(0.1).max(10),
  loopToggle: z.boolean(),
  theme: z.enum(['dark', 'light']),
})

export type UrlState = z.infer<typeof urlStateSchema>

export function toUrlState(full: LabState): UrlState {
  return {
    v: SCHEMA_VERSION,
    text: full.text,
    fontFamily: full.fontFamily,
    fontSize: full.fontSize,
    lineHeight: full.lineHeight,
    letterSpacing: full.letterSpacing,
    align: full.align,
    textColor: full.textColor,
    stageBg: full.stageBg,
    aspectRatio: full.aspectRatio,
    showGrid: full.showGrid,
    showSafeArea: full.showSafeArea,
    presetId: full.presetId,
    params: full.params,
    duration: full.duration,
    delay: full.delay,
    staggerAmount: full.staggerAmount,
    staggerOrigin: full.staggerOrigin,
    easing: full.easing,
    repeatMode: full.repeatMode,
    cursorWeightMode: {
      enabled: full.cursorWeightMode.enabled,
      params: full.cursorWeightMode.params as Record<string, unknown>,
    },
    physicsMode: {
      enabled: full.physicsMode.enabled,
      params: full.physicsMode.params as Record<string, unknown>,
    },
    textPathMode: {
      enabled: full.textPathMode.enabled,
      params: full.textPathMode.params as Record<string, unknown>,
    },
    speed: full.speed,
    loopToggle: full.loopToggle,
    theme: full.theme,
  }
}

export function fromUrlState(state: UrlState): Partial<LabState> {
  return {
    text: state.text,
    fontFamily: state.fontFamily as LabState['fontFamily'],
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    letterSpacing: state.letterSpacing,
    align: state.align,
    textColor: state.textColor,
    stageBg: state.stageBg,
    aspectRatio: state.aspectRatio,
    showGrid: state.showGrid,
    showSafeArea: state.showSafeArea,
    presetId: state.presetId,
    params: state.params as LabState['params'],
    duration: state.duration,
    delay: state.delay,
    staggerAmount: state.staggerAmount,
    staggerOrigin: state.staggerOrigin,
    easing: state.easing,
    repeatMode: state.repeatMode,
    cursorWeightMode: {
      enabled: state.cursorWeightMode.enabled,
      params: state.cursorWeightMode.params as LabState['cursorWeightMode']['params'],
    },
    physicsMode: {
      enabled: state.physicsMode.enabled,
      params: state.physicsMode.params as LabState['physicsMode']['params'],
    },
    textPathMode: {
      enabled: state.textPathMode.enabled,
      params: state.textPathMode.params as LabState['textPathMode']['params'],
    },
    speed: state.speed,
    loopToggle: state.loopToggle,
    theme: state.theme,
  }
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToUint8(urlSafe: string): Uint8Array {
  let b64 = urlSafe.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function encodeUrlState(state: UrlState): string {
  const json = JSON.stringify(state)
  const bytes = new TextEncoder().encode(json)
  return uint8ToBase64Url(bytes)
}

export function migrate(decoded: Record<string, unknown>): UrlState {
  const version = decoded.v
  const defaults = defaultUrlState()

  if (version === SCHEMA_VERSION) {
    const result = urlStateSchema.safeParse(decoded)
    if (result.success) return result.data
  }

  const merged: Record<string, unknown> = { ...defaults, ...decoded, v: SCHEMA_VERSION }
  const result = urlStateSchema.safeParse(merged)
  if (result.success) return result.data

  return defaults
}

export function decodeUrlState(encoded: string): UrlState {
  const bytes = base64UrlToUint8(encoded)
  const json = new TextDecoder().decode(bytes)
  const parsed = JSON.parse(json) as Record<string, unknown>
  return migrate(parsed)
}

export function getHashState(): UrlState | null {
  try {
    const hash = window.location.hash
    if (!hash.startsWith('#s=')) return null
    const encoded = hash.slice(3)
    if (!encoded) return null
    return decodeUrlState(encoded)
  } catch {
    return null
  }
}

let _debounceTimer: number | null = null
export function setHashState(state: UrlState): void {
  if (_debounceTimer) clearTimeout(_debounceTimer)
  _debounceTimer = window.setTimeout(() => {
    try {
      const encoded = encodeUrlState(state)
      history.replaceState(null, '', `#s=${encoded}`)
    } catch {
      // ignore encoding errors (e.g. circular)
    }
  }, 250)
}

function defaultUrlState(): UrlState {
  return {
    v: SCHEMA_VERSION,
    text: 'Kinetic Type',
    fontFamily: 'inter',
    fontSize: 96,
    lineHeight: 1.1,
    letterSpacing: 0,
    align: 'center',
    textColor: '#ECECEE',
    stageBg: '#0B0B0C',
    aspectRatio: 'free',
    showGrid: false,
    showSafeArea: false,
    presetId: 'wave',
    params: {},
    duration: 2,
    delay: 0,
    staggerAmount: 0.03,
    staggerOrigin: 'center',
    easing: 'power2.out',
    repeatMode: 'loop',
    cursorWeightMode: {
      enabled: false,
      params: {
        radius: 150,
        maxWeight: 900,
        minWeight: 100,
        falloff: 'ease',
        axis: 'wght',
        invert: false,
      },
    },
    physicsMode: {
      enabled: false,
      params: {
        gravity: 1,
        restitution: 0.6,
        friction: 0.1,
        airResistance: 0.02,
        gravityDir: { x: 0, y: 1 },
      },
    },
    textPathMode: {
      enabled: false,
      params: {
        pathId: 'circle',
        startOffset: 0,
        spacing: 1,
        flipSide: false,
        rotateWithPath: true,
        animSpeed: 1,
      },
    },
    speed: 1,
    loopToggle: true,
    theme: 'dark',
  }
}

type ApplyPatchFn = (patch: Partial<LabState>) => void
type ShowToastFn = (toast: {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  duration?: number
}) => void
type GetStateFn = () => LabState
type SubscribeFn = (listener: (state: LabState, prevState: LabState) => void) => () => void

export function useUrlStateSync(
  applyPatch: ApplyPatchFn,
  showToast: ShowToastFn,
  getState: GetStateFn,
  subscribe: SubscribeFn,
): void {
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true

    const hash = getHashState()
    if (hash) {
      const full = window.location.hash
      const wasEncoded = full.startsWith('#s=') && full.length > 3
      if (wasEncoded) {
        try {
          const raw = full.slice(3)
          const bytes = base64UrlToUint8(raw)
          const json = new TextDecoder().decode(bytes)
          const parsed = JSON.parse(json) as Record<string, unknown>
          const ver = parsed.v
          if (ver !== SCHEMA_VERSION) {
            showToast({
              title: 'Share link used older config',
              description: 'Applied defaults for new fields',
              variant: 'warning',
            })
          }
        } catch {
          // ignore
        }
      }
      applyPatch(fromUrlState(hash))
    }

    let debounced: number | null = null
    const serializableKeys = new Set<keyof LabState>([
      'text',
      'fontFamily',
      'fontSize',
      'lineHeight',
      'letterSpacing',
      'align',
      'textColor',
      'stageBg',
      'aspectRatio',
      'showGrid',
      'showSafeArea',
      'presetId',
      'params',
      'duration',
      'delay',
      'staggerAmount',
      'staggerOrigin',
      'easing',
      'repeatMode',
      'cursorWeightMode',
      'physicsMode',
      'textPathMode',
      'speed',
      'loopToggle',
      'theme',
    ])

    function shallowDiffersSerializable(a: LabState, b: LabState): boolean {
      for (const k of serializableKeys) {
        const ak = a[k]
        const bk = b[k]
        if (typeof ak === 'object' && ak !== null && typeof bk === 'object' && bk !== null) {
          if (JSON.stringify(ak) !== JSON.stringify(bk)) return true
        } else if (ak !== bk) {
          return true
        }
      }
      return false
    }

    const unsub = subscribe((state, prev) => {
      if (!mounted.current) return
      if (!shallowDiffersSerializable(state, prev)) return
      if (debounced) clearTimeout(debounced)
      debounced = window.setTimeout(() => {
        setHashState(toUrlState(getState()))
      }, 150)
    })

    return () => {
      mounted.current = false
      unsub()
      if (debounced) clearTimeout(debounced)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
