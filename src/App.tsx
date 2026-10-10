import { useMemo, useState } from "react";
import Header from "./components/Header";
import PresetRail from "./components/panels/PresetRail";
import ParamPanel from "./components/panels/ParamPanel";
import Stage from "./components/stage/Stage";
import Toolbar from "./components/stage/Toolbar";
import PlaybackBar from "./components/bar/PlaybackBar";
import ExportDialog from "./components/export/ExportDialog";
import { CommandPalette } from "./components/ui/CommandPalette";
import { ToastContainer } from "./components/ui/Toast";
import ReducedMotionBanner from "./components/ui/ReducedMotionBanner";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { TimelineProvider } from "./lib/timelineController";
import { useLabStore } from "./store/lab";
import type { LabState, Toast } from "./store/lab";
import { useUIStore } from "./store/ui";
import { useShortcuts } from "./lib/shortcuts";
import { useUrlStateSync } from "./lib/urlState";
import { usePersistenceSync } from "./lib/persist";
import { PRESETS, getPresetById, type SplitUnit } from "./presets";
import { generateCSS, type CodegenOpts } from "./lib/codegen/css";
import { generateGSAPSnippet, type GSAPOpts } from "./lib/codegen/gsap";

async function safeCopy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      document.body.removeChild(ta);
      throw e;
    }
  } catch {
    return false;
  }
}

function buildCodegenState(): {
  cssCombined: string;
  gsapCombined: string;
  presetCssExport: boolean;
} {
  const s = useLabStore.getState();
  const preset = getPresetById(s.presetId);
  const rawParams: Record<string, unknown> = {};
  for (const spec of preset?.params ?? []) {
    rawParams[spec.id] =
      s.params[spec.id] !== undefined ? s.params[spec.id] : spec.default;
  }

  const sampleUnits: Array<Omit<SplitUnit, "el">> = [];
  const total = Math.max(1, [...s.text].length);
  for (let i = 0; i < total; i++) {
    sampleUnits.push({
      index: i,
      total,
      lineIndex: 0,
      charInWord: i,
      normX: i / Math.max(1, total - 1),
      normY: 0.5,
      distFromCenter: Math.abs((i / (total - 1 || 1)) - 0.5) * 2,
    });
  }

  const timing = {
    duration: s.duration,
    delay: s.delay,
    staggerAmount: s.staggerAmount,
    staggerOrigin: s.staggerOrigin,
    easing: s.easing,
    repeatMode: s.repeatMode,
  };

  const cssOpts: CodegenOpts = {
    text: s.text,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    align: s.align,
    textColor: s.textColor,
    presetId: s.presetId,
    params: rawParams,
    timing,
    splitUnits: sampleUnits,
  };
  const cssResult = generateCSS(cssOpts, PRESETS);

  const gsapOpts: GSAPOpts = {
    ...cssOpts,
    splitMode: preset?.splitMode ?? "chars",
  };
  const gsapResult = generateGSAPSnippet(gsapOpts);

  return {
    cssCombined: cssResult.combined,
    gsapCombined: gsapResult,
    presetCssExport: preset?.cssExport === true,
  };
}

function ShortcutsMount({
  copyCSS,
  copyShareLink,
}: {
  copyCSS: () => Promise<void>;
  copyShareLink: () => Promise<void>;
}) {
  useShortcuts(useLabStore, useUIStore, copyCSS, copyShareLink);
  return null;
}

export default function App() {
  const setState = useLabStore.setState;
  const getState = useLabStore.getState;
  const subscribe = useLabStore.subscribe;
  const showToast = useLabStore((s) => s.showToast);
  const toasts = useLabStore((s) => s.toasts);
  const [exportProgressText, setExportProgressText] = useState<string>("");

  const ariaLiveText = useMemo(() => {
    const parts: string[] = [];
    if (exportProgressText) parts.push(exportProgressText);
    const latest = toasts.slice(-2).reverse();
    for (const t of latest) {
      const title = t.title || "";
      const desc = t.description ? ` — ${t.description}` : "";
      parts.push(`${title}${desc}`);
    }
    return parts.join(". ");
  }, [toasts, exportProgressText]);

  (window as any).__setExportProgressText = setExportProgressText;

  function applyPatch(patch: Partial<LabState>) {
    setState((state) => ({ ...state, ...patch }));
  }

  function toastFn(toast: {
    title: string;
    description?: string;
    variant?: "default" | "success" | "error" | "warning";
    duration?: number;
  }) {
    showToast(toast as Omit<Toast, "id">);
  }

  const copyCSS = async () => {
    try {
      const { cssCombined, gsapCombined, presetCssExport } = buildCodegenState();
      const content = presetCssExport ? cssCombined : gsapCombined;
      const ok = await safeCopy(content);
      if (ok) {
        showToast({
          title: "Copied to clipboard",
          description: presetCssExport
            ? "CSS + HTML snippet"
            : "GSAP snippet (CSS fallback for this preset)",
          variant: "success",
        });
      } else {
        showToast({
          title: "Copy failed",
          description: "Clipboard access denied by browser.",
          variant: "error",
        });
      }
    } catch (e) {
      showToast({
        title: "Copy failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "error",
      });
    }
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    try {
      const ok = await safeCopy(url);
      if (ok) {
        showToast({
          title: "Link copied",
          description: "Share your current lab state.",
          variant: "success",
        });
      } else {
        showToast({
          title: "Couldn't copy link",
          description: "Clipboard access denied.",
          variant: "error",
        });
      }
    } catch (e) {
      showToast({
        title: "Couldn't copy link",
        description: e instanceof Error ? e.message : "Clipboard unavailable.",
        variant: "error",
      });
    }
  };

  useUrlStateSync(applyPatch, toastFn, getState, subscribe);
  usePersistenceSync(applyPatch, toastFn, getState, subscribe);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[--bg]">
      <a
        href="#stage"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-md focus:bg-[--accent] focus:text-[#0B0B0C] focus:font-mono focus:uppercase focus:text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[--bg] focus:ring-[--accent]"
      >
        Skip to stage
      </a>
      <ReducedMotionBanner />
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <PresetRail />
        <TimelineProvider>
          <ShortcutsMount copyCSS={copyCSS} copyShareLink={copyShareLink} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-auto flex flex-col items-center justify-start gap-3">
              <Toolbar />
              <div className="w-full flex-1 min-h-0 flex items-center justify-center">
                <ErrorBoundary
                  fallbackTitle="Stage error"
                  fallbackDesc="The animation engine failed to initialize. Try a different preset or reload."
                >
                  <Stage />
                </ErrorBoundary>
              </div>
            </div>
            <PlaybackBar />
          </div>
        </TimelineProvider>
        <ParamPanel />
      </div>
      <ExportDialog setExportProgressText={setExportProgressText} />
      <CommandPalette copyCSS={copyCSS} copyShareLink={copyShareLink} />
      <ToastContainer />
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaLiveText}
      </div>
    </div>
  );
}
