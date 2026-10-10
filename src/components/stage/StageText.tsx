import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useLabStore } from '../../store/lab';
import { getFontById } from '../../lib/fonts';
import { splitAsync, teardownSplit, type SplitUnit } from '../../lib/split';

export default function StageText({
  onSplitReady,
  textareaInteractiveOverride,
}: {
  onSplitReady?: (units: SplitUnit[]) => void;
  textareaInteractiveOverride?: boolean; // when true, textarea is always interactive; for physics/path modes Stage can override to false
}) {
  const displayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const splitPendingRef = useRef<boolean>(false);
  const splitUnitsRef = useRef<SplitUnit[]>([]);
  const [fontsReady, setFontsReady] = useState(false);

  const {
    text,
    fontFamily,
    fontSize,
    lineHeight,
    letterSpacing,
    align,
    textColor,
    setText,
    cursorWeightMode,
    physicsMode,
    textPathMode,
  } = useLabStore();

  const font = getFontById(fontFamily);

  // When a non-typing mode is active, disable the textarea so it doesn't
  // swallow pointer events for physics drag / path editing.
  const nonTypingModeActive =
    (physicsMode.enabled ||
      (textPathMode.enabled && textPathMode.params.pathId === 'custom'));

  const textareaEnabled =
    textareaInteractiveOverride !== undefined
      ? textareaInteractiveOverride
      : !nonTypingModeActive && !cursorWeightMode.enabled;

  useEffect(() => {
    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) setFontsReady(true);
      }).catch(() => {
        if (!cancelled) setFontsReady(true);
      });
    } else {
      setFontsReady(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const runSplit = async () => {
    const el = displayRef.current;
    if (!el || !fontsReady) return;
    splitPendingRef.current = true;
    try {
      // Put raw text into displayRef (stripped of spans) before splitting again.
      // split() itself will read textContent, so we write it once here.
      if (el.textContent !== text) {
        el.textContent = text;
      }
      const units = await splitAsync(el, 'chars');
      if (splitPendingRef.current) {
        splitUnitsRef.current = units;
        if (onSplitReady) {
          onSplitReady(units);
        }
      }
    } finally {
      splitPendingRef.current = false;
    }
  };

  useEffect(() => {
    if (!fontsReady) return;
    runSplit();
    const el = displayRef.current;
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        runSplit();
      });
      ro.observe(el);
    }
    return () => {
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, fontFamily, fontSize, lineHeight, letterSpacing, fontsReady]);

  useEffect(() => {
    return () => {
      const el = displayRef.current;
      if (el) {
        const spans = el.querySelectorAll('span');
        if (spans.length > 0) {
          gsap.killTweensOf(spans);
        }
        teardownSplit(el);
      }
    };
  }, []);

  // Auto-grow textarea rows to match content height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    // Reset to 1 row first so we can shrink as well as grow
    ta.style.height = 'auto';
    const newHeight = Math.max(ta.scrollHeight, fontSize * lineHeight + 8);
    ta.style.height = `${newHeight}px`;
  }, [text, fontSize, lineHeight, fontFamily]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Single source of truth: textarea → store → display (via text dep above)
    setText(e.target.value);
  };

  const sharedTypographyStyle: React.CSSProperties = {
    fontFamily: font.cssStack,
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}`,
    letterSpacing: `${letterSpacing}em`,
    textAlign: align as React.CSSProperties['textAlign'],
    width: '100%',
    padding: 0,
    margin: 0,
    border: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  };

  return (
    <div className="relative w-full max-w-full">
      {/* Visually-hidden label for accessibility: screen readers read the textarea */}
      <label
        htmlFor="ktl-stage-textarea"
        className="sr-only"
      >
        Stage text
      </label>

      {/* DISPLAY LAYER: split spans, aria-hidden, aria-label on container
          This is NOT interactive. The DOM is purely visual. */}
      <div
        aria-hidden="true"
        style={{
          ...sharedTypographyStyle,
          color: textColor,
          opacity: fontsReady ? 1 : 0,
          transition: 'opacity 200ms ease',
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'block',
        }}
      >
        <div
          ref={displayRef}
          role="presentation"
          aria-label={text}
        />
      </div>

      {/* INPUT LAYER: <textarea> exactly covering the display text.
          color:transparent so you don't see its glyphs, only the caret.
          caret-color matches the stage text color so cursor lands where glyphs are.
          Same typography → caret position matches rendered glyphs. */}
      <textarea
        id="ktl-stage-textarea"
        ref={textareaRef}
        value={text}
        onChange={handleTextareaChange}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        rows={1}
        tabIndex={textareaEnabled ? 0 : -1}
        placeholder="Type something"
        aria-label="Stage text"
        aria-multiline="true"
        className="stage-text-editable focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent] rounded-sm"
        style={{
          ...sharedTypographyStyle,
          position: 'absolute',
          inset: 0,
          color: 'transparent',
          backgroundColor: 'transparent',
          caretColor: textColor,
          resize: 'none',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          overflow: 'hidden',
          pointerEvents: textareaEnabled ? 'auto' : 'none',
          // Mobile: ensure no system input artifacts
          WebkitTapHighlightColor: 'transparent',
        }}
      />
    </div>
  );
}
