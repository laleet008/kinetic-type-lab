import type { JSX } from 'react';
import { useLabStore, type Toast } from '../../store/lab';

const VARIANT_STYLES: Record<NonNullable<Toast['variant']>, string> = {
  default: 'bg-[--line] text-[--dim]',
  success: 'bg-[--accent]/20 text-[--accent]',
  error: 'bg-red-500/20 text-red-400',
  warning: 'bg-yellow-400/20 text-yellow-400',
};

const VARIANT_ICONS: Record<NonNullable<Toast['variant']>, JSX.Element> = {
  default: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export function ToastContainer() {
  const toasts = useLabStore((s) => s.toasts);
  const hideToast = useLabStore((s) => s.hideToast);

  return (
    <div className="fixed right-6 bottom-6 flex flex-col gap-2 z-[100] max-w-sm">
      {toasts.map((toast) => {
        const variant = toast.variant ?? 'default';
        return (
          <div
            key={toast.id}
            className="rounded-md border border-[--line] bg-[--panel] p-4 shadow-xl backdrop-blur-sm flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${VARIANT_STYLES[variant]}`}
            >
              {VARIANT_ICONS[variant]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[--text]">{toast.title}</div>
              {toast.description && (
                <div className="text-xs text-[--dim] mt-0.5">{toast.description}</div>
              )}
            </div>
            <button
              onClick={() => hideToast(toast.id)}
              className="opacity-60 hover:opacity-100 transition-opacity text-[--dim] hover:text-[--text] shrink-0"
              aria-label="Close toast"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
