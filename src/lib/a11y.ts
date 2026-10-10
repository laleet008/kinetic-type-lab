import { useState, useEffect, useCallback } from 'react';

const LS_DISMISSED_KEY = 'kinetic-type-lab:reducedMotionDismissed';
const LS_EXPLICITLY_ENABLED_KEY = 'kinetic-type-lab:reducedMotionExplicitlyEnabled';

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isReducedMotionDismissed = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LS_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const isReducedMotionExplicitlyEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LS_EXPLICITLY_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setReducedMotionDismissed = (v: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_DISMISSED_KEY, String(v));
  } catch {
    // ignore
  }
};

export const setReducedMotionExplicitlyEnabled = (v: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_EXPLICITLY_ENABLED_KEY, String(v));
  } catch {
    // ignore
  }
};

export type ReducedMotionBannerState = {
  visible: boolean;
  reducedMotionEnabledByDefault: boolean;
  dismiss: () => void;
  enable: () => void;
};

export const useReducedMotionBanner = (): ReducedMotionBannerState => {
  const [dismissed, setDismissed] = useState<boolean>(() => isReducedMotionDismissed());
  const [explicitlyEnabled, setExplicitlyEnabled] = useState<boolean>(() =>
    isReducedMotionExplicitlyEnabled()
  );
  const reduced = prefersReducedMotion();
  const reducedMotionEnabledByDefault = reduced && !explicitlyEnabled;
  const visible = reducedMotionEnabledByDefault && !dismissed;

  const dismiss = useCallback(() => {
    setReducedMotionDismissed(true);
    setDismissed(true);
  }, []);

  const enable = useCallback(() => {
    setReducedMotionExplicitlyEnabled(true);
    setReducedMotionDismissed(true);
    setExplicitlyEnabled(true);
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => {
      setExplicitlyEnabled(false);
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    if (typeof (mql as any).addListener === 'function') {
      (mql as any).addListener(handler);
      return () => (mql as any).removeListener(handler);
    }
  }, []);

  return {
    visible,
    reducedMotionEnabledByDefault,
    dismiss,
    enable,
  };
};
