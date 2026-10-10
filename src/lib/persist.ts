import { useEffect, useRef } from 'react'
import { z } from 'zod'
import type { LabState, SavedPreset } from '../store/lab'
import { SCHEMA_VERSION, urlStateSchema, migrate, fromUrlState } from './urlState'
import { prefersReducedMotion, isReducedMotionExplicitlyEnabled } from './a11y'

const LS_KEY = 'kinetic-type-lab:v1'
const LS_SAVED_KEY = 'kinetic-type-lab:saved:v1'

const savedPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  presetId: z.string(),
  params: z.record(z.unknown()),
  createdAt: z.number(),
})

const savedPresetsSchema = z.array(savedPresetSchema)

export function saveSessionToLS(partial: Partial<LabState>): void {
  try {
    const payload = { v: SCHEMA_VERSION, ...partial }
    localStorage.setItem(LS_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota errors
  }
}

export function loadSessionFromLS(): Partial<LabState> | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    const migrated = migrate(data)
    const partialSchema = urlStateSchema.partial()
    const parsed = partialSchema.safeParse(migrated)
    if (parsed.success) {
      const cast = parsed.data as Partial<LabState>
      return cast
    }
    return fromUrlState(migrated) as Partial<LabState>
  } catch {
    return null
  }
}

export function saveSavedPresets(presets: SavedPreset[]): void {
  try {
    localStorage.setItem(LS_SAVED_KEY, JSON.stringify(presets))
  } catch {
    // ignore
  }
}

export function loadSavedPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(LS_SAVED_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    const parsed = savedPresetsSchema.safeParse(data)
    if (parsed.success) return parsed.data as SavedPreset[]
    return []
  } catch {
    return []
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

export function usePersistenceSync(
  applyPatch: ApplyPatchFn,
  _showToast: ShowToastFn,
  getState: GetStateFn,
  subscribe: SubscribeFn,
): void {
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true

    const session = loadSessionFromLS()
    const saved = loadSavedPresets()

    const patch: Partial<LabState> = {}
    if (session) Object.assign(patch, session)
    if (saved.length > 0) (patch as any).savedPresets = saved

    const isFirstLoad = !session
    if (isFirstLoad && prefersReducedMotion() && !isReducedMotionExplicitlyEnabled()) {
      patch.isPlaying = false
      patch.loopToggle = false
      if (patch.cursorWeightMode) {
        patch.cursorWeightMode = { ...patch.cursorWeightMode, enabled: false }
      } else {
        (patch as any).cursorWeightMode = { enabled: false }
      }
      if (patch.physicsMode) {
        patch.physicsMode = { ...patch.physicsMode, enabled: false }
      } else {
        (patch as any).physicsMode = { enabled: false }
      }
    }

    if (Object.keys(patch).length > 0) {
      applyPatch(patch)
    }

    let debounced: number | null = null
    const persistKeys = new Set<keyof LabState>([
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
      'savedPresets',
    ])

    function diffChanged(a: LabState, b: LabState): boolean {
      for (const k of persistKeys) {
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
      if (!diffChanged(state, prev)) return
      if (debounced) clearTimeout(debounced)
      debounced = window.setTimeout(() => {
        const s = getState()
        saveSessionToLS({
          text: s.text,
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          align: s.align,
          textColor: s.textColor,
          stageBg: s.stageBg,
          aspectRatio: s.aspectRatio,
          showGrid: s.showGrid,
          showSafeArea: s.showSafeArea,
          presetId: s.presetId,
          params: s.params,
          duration: s.duration,
          delay: s.delay,
          staggerAmount: s.staggerAmount,
          staggerOrigin: s.staggerOrigin,
          easing: s.easing,
          repeatMode: s.repeatMode,
          cursorWeightMode: s.cursorWeightMode,
          physicsMode: s.physicsMode,
          textPathMode: s.textPathMode,
          speed: s.speed,
          loopToggle: s.loopToggle,
          theme: s.theme,
        } as Partial<LabState>)
        saveSavedPresets(s.savedPresets)
      }, 1000)
    })

    return () => {
      mounted.current = false
      unsub()
      if (debounced) clearTimeout(debounced)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
