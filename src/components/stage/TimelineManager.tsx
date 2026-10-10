import { useEffect, useRef, useState } from 'react';
import StageText from './StageText';
import PathEditor from './PathEditor';
import { useTimelineController } from '../../lib/timelineController';
import type { SplitUnit } from '../../lib/split';
import { cursorWeight } from '../../modes/cursorWeight';
import { physics } from '../../modes/physics';
import { textPath } from '../../modes/textPath';
import { useLabStore } from '../../store/lab';
import type { CursorWeightOptions } from '../../modes/cursorWeight';
import type { PhysicsParams } from '../../modes/physics';
import type { TextPathParams, PathPresetId } from '../../modes/textPath';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Button } from '../ui/Button';

export default function TimelineManager() {
  const splitUnitsRef = useRef<SplitUnit[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [textareaEditing, setTextareaEditing] = useState<boolean>(false);

  const cursorWeightMode = useLabStore((s) => s.cursorWeightMode);
  const physicsMode = useLabStore((s) => s.physicsMode);
  const textPathMode = useLabStore((s) => s.textPathMode);
  const fontFamily = useLabStore((s) => s.fontFamily);
  const showToast = useLabStore((s) => s.showToast);

  const nonTypingModeActive =
    physicsMode.enabled ||
    cursorWeightMode.enabled ||
    (textPathMode.enabled && textPathMode.params.pathId === 'custom');

  const { setSplitReady } = useTimelineController({
    containerRef: containerRef as unknown as React.RefObject<HTMLElement>,
    splitUnitsRef,
  });

  const handleSplitReady = (units: SplitUnit[]) => {
    splitUnitsRef.current = units;
    setSplitReady(units);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ w: r.width || 800, h: r.height || 600 });
    };
    update();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    }
    window.addEventListener('resize', update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!cursorWeightMode.enabled) return;

    const container = containerRef.current;
    if (!container) return;

    cursorWeight.enable(
      container,
      () => splitUnitsRef.current,
      cursorWeightMode.params as CursorWeightOptions
    );

    return () => {
      cursorWeight.disable();
    };
  }, [cursorWeightMode.enabled]);

  useEffect(() => {
    if (!cursorWeightMode.enabled) return;
    cursorWeight.updateOptions(cursorWeightMode.params as Partial<CursorWeightOptions>);
  }, [cursorWeightMode.params, cursorWeightMode.enabled]);

  useEffect(() => {
    if (!cursorWeightMode.enabled) return;
    cursorWeight.updateOptions(cursorWeightMode.params as Partial<CursorWeightOptions>);
  }, [fontFamily, cursorWeightMode.enabled]);

  useEffect(() => {
    if (!physicsMode.enabled) return;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    (async () => {
      await physics.enable(container, () => splitUnitsRef.current);
      if (cancelled) physics.disable();
    })();

    return () => {
      cancelled = true;
      physics.disable();
    };
  }, [physicsMode.enabled]);

  useEffect(() => {
    if (!physicsMode.enabled) return;
    physics.setParams(physicsMode.params as Partial<PhysicsParams>);
  }, [physicsMode.params, physicsMode.enabled]);

  useEffect(() => {
    if (!textPathMode.enabled) return;

    const container = containerRef.current;
    if (!container) return;

    textPath.enable(container, () => splitUnitsRef.current);

    return () => {
      textPath.disable();
    };
  }, [textPathMode.enabled]);

  useEffect(() => {
    if (!textPathMode.enabled) return;
    textPath.updateParams({
      ...textPathMode.params,
      pathId: textPathMode.params.pathId as PathPresetId,
    } as Partial<TextPathParams>);
  }, [textPathMode.params, textPathMode.enabled]);

  useEffect(() => {
    return () => {
      cursorWeight.disable();
      physics.disable();
      textPath.disable();
    };
  }, []);

  const showPathEditor = textPathMode.enabled && textPathMode.params.pathId === 'custom';
  const toggleMode = useLabStore((s) => s.toggleMode);

  const resetPhysics = () => {
    if (physicsMode.enabled) {
      toggleMode('physicsMode');
      showToast({
        title: 'Physics mode disabled',
        description: 'Engine recovered from error.',
        variant: 'warning',
      });
    }
    try {
      physics.disable();
    } catch {
      // ignore
    }
  };

  // Button in Stage (mounted inside here) re-enables textarea editing even when
  // non-typing modes are active so user can change text without toggling modes.
  const effectiveTextareaInteractive = textareaEditing ? true : !nonTypingModeActive;

  const handleEditTextClick = () => {
    setTextareaEditing(true);
    // Focus textarea programmatically
    requestAnimationFrame(() => {
      const ta = document.getElementById('ktl-stage-textarea') as HTMLTextAreaElement | null;
      if (ta) {
        ta.focus();
        ta.selectionStart = ta.value.length;
        ta.selectionEnd = ta.value.length;
      }
    });
  };

  const handleBlurTextarea = () => {
    // Revert to default textarea state only when user clicks away (blur)
    if (textareaEditing) {
      setTextareaEditing(false);
    }
  };

  const innerContent = (
    <div ref={containerRef} className="relative w-full h-full">
      <div onBlur={handleBlurTextarea}>
        <StageText onSplitReady={handleSplitReady} textareaInteractiveOverride={effectiveTextareaInteractive} />
      </div>

      {/* "Edit text" button overlay when typing is disabled but user wants to edit */}
      {nonTypingModeActive && !textareaEditing && (
        <div className="absolute top-2 right-2 z-20">
          <Button variant="secondary" size="sm" onClick={handleEditTextClick}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit text
          </Button>
        </div>
      )}

      {showPathEditor && (
        <PathEditor
          containerSize={containerSize}
          onPathChange={(d) => textPath.updateCustomPath(d)}
          initialD={textPath.getCustomPath() ?? undefined}
        />
      )}
    </div>
  );

  if (physicsMode.enabled) {
    return (
      <ErrorBoundary
        fallbackTitle="Physics mode failed"
        fallbackDesc="Physics engine crashed. Disabling physics mode."
        onReset={resetPhysics}
      >
        {innerContent}
      </ErrorBoundary>
    );
  }

  return innerContent;
}
