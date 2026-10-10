import { Button } from './Button';
import { useReducedMotionBanner } from '../../lib/a11y';
import { useLabStore } from '../../store/lab';

export default function ReducedMotionBanner() {
  const { visible, dismiss, enable } = useReducedMotionBanner();
  const showToast = useLabStore((s) => s.showToast);
  const play = useLabStore((s) => s.play);

  if (!visible) return null;

  const handleEnable = () => {
    play();
    showToast({
      title: 'Motion enabled',
      variant: 'success',
    });
    enable();
  };

  return (
    <div
      role="region"
      aria-label="Motion reduced notice"
      className="fixed top-0 left-0 right-0 z-[150] border-b border-[--accent]/40 bg-[--panel] px-4 py-2 text-sm text-[--text] flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-[--accent]"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
        <span className="font-mono uppercase tracking-wider text-xs">
          Motion reduced for accessibility.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleEnable}
          aria-label="Enable motion anyway"
        >
          Enable anyway
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss motion notice"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[--dim] hover:text-[--text] hover:bg-[--line] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
