import { useEffect, useRef, useState } from 'react';
import { useLabStore } from '../../store/lab';
import { getFontById } from '../../lib/fonts';
import TimelineManager from './TimelineManager';
import Guides from './Guides';
import { ErrorBoundary } from '../ui/ErrorBoundary';

const aspectRatioStyles: Record<string, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-[16/9]",
  "9:16": "aspect-[9/16]",
  "4:5": "aspect-[4/5]",
};

const aspectRatioMax: Record<string, string> = {
  "1:1": "max-w-[600px] max-h-[600px]",
  "16:9": "max-w-[720px] max-h-[405px]",
  "9:16": "max-w-[360px] max-h-[640px]",
  "4:5": "max-w-[480px] max-h-[600px]",
};

export default function Stage() {
  const {
    stageBg,
    aspectRatio,
    showGrid,
    showSafeArea,
    fontFamily,
    fontSize,
    lineHeight,
    letterSpacing,
    align,
    textColor,
  } = useLabStore();
  const [fontsLoaded, setFontsLoaded] = useState<boolean>(
    typeof document !== 'undefined' && document.fonts?.status === 'loaded'
  );

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) {
      setFontsLoaded(true);
      return;
    }
    let cancelled = false;
    const check = () => {
      if (document.fonts.status === 'loaded' && !cancelled) {
        setFontsLoaded(true);
      }
    };
    check();
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsLoaded(true);
    }).catch(() => {
      if (!cancelled) setFontsLoaded(true);
    });
    document.fonts.addEventListener?.('loadingdone', check);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener?.('loadingdone', check);
    };
  }, []);

  const mountRef = useRef<HTMLDivElement>(null);
  const [mountSize, setMountSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setMountSize({ width: r.width || 800, height: r.height || 600 });
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

  const isFree = aspectRatio === "free";
  const ratioClass = isFree ? "" : aspectRatioStyles[aspectRatio];
  const maxClass = isFree ? "" : aspectRatioMax[aspectRatio];
  const font = getFontById(fontFamily);

  const textAlignMap: Record<string, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
  };

  return (
    <div
      id="stage"
      role="region"
      aria-label="Kinetic typography stage"
      className="w-full h-full flex items-center justify-center relative"
    >
      {!fontsLoaded && (
        <div
          className="absolute bottom-3 right-3 z-10 px-2 py-1 rounded bg-[--panel]/80 border border-[--line] text-[10px] font-mono uppercase tracking-wider text-[--dim] backdrop-blur-sm"
          aria-hidden="true"
        >
          Loading fonts…
        </div>
      )}
      <div
        className="border border-[--line] rounded-lg flex-1 flex items-center justify-center overflow-hidden relative"
        style={{ backgroundColor: stageBg }}
      >
        <div
          className={`relative w-full h-full ${isFree ? "flex items-center justify-center" : ""}`}
        >
          {!isFree && (
            <div
              ref={mountRef}
              className={`relative w-full ${ratioClass} ${maxClass} border border-dashed border-[--dim]/30 m-auto`}
              style={{ top: "50%", transform: "translateY(-50%)" }}
            >
              <Guides
                showGrid={showGrid}
                showSafeArea={showSafeArea}
                aspectRatio={aspectRatio}
                width={mountSize.width}
                height={mountSize.height}
              />
              <MountArea
                fontFamily={font.cssStack}
                fontSize={fontSize}
                lineHeight={lineHeight}
                letterSpacing={letterSpacing}
                align={align}
                textAlignClass={textAlignMap[align]}
                textColor={textColor}
              />
            </div>
          )}
          {isFree && (
            <div
              ref={mountRef}
              className="relative w-[90%] h-[85%]"
            >
              <Guides
                showGrid={showGrid}
                showSafeArea={showSafeArea}
                aspectRatio={aspectRatio}
                width={mountSize.width}
                height={mountSize.height}
              />
              <MountArea
                fontFamily={font.cssStack}
                fontSize={fontSize}
                lineHeight={lineHeight}
                letterSpacing={letterSpacing}
                align={align}
                textAlignClass={textAlignMap[align]}
                textColor={textColor}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type MountAreaProps = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  align: string;
  textAlignClass: string;
  textColor: string;
};

function MountArea({
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  align,
  textAlignClass,
  textColor,
}: MountAreaProps) {
  const text = useLabStore((s) => s.text);
  const isEmpty = text.length === 0;
  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
    >
      {isEmpty && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 pointer-events-none"
          aria-hidden="true"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[--dim] opacity-40"
          >
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          <span className="font-mono uppercase tracking-widest text-sm text-[--dim] opacity-50">
            Type something
          </span>
        </div>
      )}
      <div
        className={`w-full max-w-full ${textAlignClass}`}
        style={{
          fontFamily,
          fontSize: `${fontSize}px`,
          lineHeight,
          letterSpacing: `${letterSpacing}em`,
          color: textColor,
          justifyContent:
            align === "left"
              ? "flex-start"
              : align === "right"
                ? "flex-end"
                : "center",
          display: "flex",
        }}
      >
        <ErrorBoundary
          fallbackTitle="Animation failed"
          fallbackDesc="The animation for this preset could not be rendered. Try another preset or reload."
        >
          <TimelineManager />
        </ErrorBoundary>
      </div>
    </div>
  );
}
