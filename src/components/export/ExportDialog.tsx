import { useEffect, useMemo, useRef, useState, useContext, useCallback } from 'react';
import clsx from 'clsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import NumberField from '../ui/NumberField';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useUIStore } from '../../store/ui';
import { useLabStore } from '../../store/lab';
import { getPresetById, PRESETS, type SplitUnit } from '../../presets';
import { GlobalTimelineContext } from '../../lib/timelineController';
import { exportGif, type GifOptions } from '../../lib/gifExport';
import { exportVideo, type VideoOptions } from '../../lib/videoExport';
import { exportPng } from '../../lib/pngExport';
import { generateCSS, type CodegenOpts } from '../../lib/codegen/css';
import { generateGSAPSnippet, type GSAPOpts } from '../../lib/codegen/gsap';
import { generateReactComponent, type ReactOpts } from '../../lib/codegen/react';
import {
  HighlightedCode,
} from '../../lib/codegen/highlight';

type CodeTab = 'css' | 'gsap' | 'react';

type ExportDialogProps = {
  stageRef?: React.RefObject<HTMLElement | null>;
  setExportProgressText?: (s: string) => void;
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function downloadTextFile(content: string, filename: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  downloadBlob(blob, filename);
}

type CopyState = 'idle' | 'copied' | 'error';

async function safeCopy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
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

export default function ExportDialog({ stageRef, setExportProgressText }: ExportDialogProps) {
  const open = useUIStore((s) => s.exportDialogOpen);
  const setOpen = useUIStore((s) => s.setExportDialogOpen);
  const showToast = useLabStore((s) => s.showToast);
  const hasMediaRecorder = typeof window !== 'undefined' && typeof (window as any).MediaRecorder !== 'undefined';

  const labState = useLabStore((s) => ({
    text: s.text,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    align: s.align,
    textColor: s.textColor,
    presetId: s.presetId,
    params: s.params,
    duration: s.duration,
    delay: s.delay,
    staggerAmount: s.staggerAmount,
    staggerOrigin: s.staggerOrigin,
    easing: s.easing,
    repeatMode: s.repeatMode,
  }));

  const tlCtx = useContext(GlobalTimelineContext);

  const abortRef = useRef<AbortController | null>(null);
  const [gifProgress, setGifProgress] = useState<number>(0);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [gifBytesEst, setGifBytesEst] = useState<number | null>(null);
  const [gifRunning, setGifRunning] = useState(false);
  const [videoRunning, setVideoRunning] = useState(false);
  const [pngRunning, setPngRunning] = useState(false);

  const [gifFps, setGifFps] = useState<12 | 15 | 24 | 30>(24);
  const [gifWidth, setGifWidth] = useState<number>(800);
  const [gifLoop, setGifLoop] = useState<0 | -1>(0);
  const [gifDither, setGifDither] = useState<boolean>(true);
  const [gifQuality, setGifQuality] = useState<10 | 20 | 30>(20);

  const [videoFps, setVideoFps] = useState<15 | 24 | 30 | 60>(30);
  const [videoDurationMode, setVideoDurationMode] = useState<'loop' | 'custom'>('loop');
  const [videoDurationSec, setVideoDurationSec] = useState<number>(3);
  const [videoResolution, setVideoResolution] = useState<
    'stage' | '720p' | '1080p'
  >('stage');
  const [videoTransparent, setVideoTransparent] = useState<boolean>(false);
  const [videoCodec, setVideoCodec] = useState<'webm' | 'mp4'>('webm');

  const [codeTab, setCodeTab] = useState<CodeTab>('css');
  const [copyStates, setCopyStates] = useState<Record<CodeTab, CopyState>>({
    css: 'idle',
    gsap: 'idle',
    react: 'idle',
  });

  const [pngScale, setPngScale] = useState<1 | 2 | 4>(2);

  const resetProgress = useCallback(() => {
    setGifProgress(0);
    setVideoProgress(0);
    setGifBytesEst(null);
    setExportProgressText?.('');
  }, [setExportProgressText]);

  useEffect(() => {
    if (!open) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setGifRunning(false);
      setVideoRunning(false);
      setPngRunning(false);
      resetProgress();
    }
  }, [open, resetProgress]);

  const getStageEl = useCallback((): HTMLElement | null => {
    if (stageRef?.current) return stageRef.current;
    const fallback = document.querySelector<HTMLElement>('[aria-label="Stage canvas"]');
    if (fallback) {
      const inner = fallback.querySelector<HTMLElement>(
        '[data-stage-mount="true"]'
      ) || fallback.querySelector<HTMLElement>('.relative.w-full.h-full, .relative.w-\\[90%\\].h-\\[85%\\]');
      if (inner) return inner;
    }
    return fallback;
  }, [stageRef]);

  const getTimeline = useCallback(() => {
    return tlCtx?.tlRef.current ?? null;
  }, [tlCtx]);

  const cssSnippets = useMemo(() => {
    const preset = getPresetById(labState.presetId);
    const rawParams: Record<string, unknown> = {};
    for (const spec of preset?.params ?? []) {
      rawParams[spec.id] =
        labState.params[spec.id] !== undefined
          ? labState.params[spec.id]
          : spec.default;
    }

    const sampleUnits: Array<Omit<SplitUnit, 'el'>> = [];
    const total = Math.max(1, [...labState.text].length);
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

    const opts: CodegenOpts = {
      text: labState.text,
      fontFamily: labState.fontFamily,
      fontSize: labState.fontSize,
      lineHeight: labState.lineHeight,
      letterSpacing: labState.letterSpacing,
      align: labState.align,
      textColor: labState.textColor,
      presetId: labState.presetId,
      params: rawParams,
      timing: {
        duration: labState.duration,
        delay: labState.delay,
        staggerAmount: labState.staggerAmount,
        staggerOrigin: labState.staggerOrigin,
        easing: labState.easing,
        repeatMode: labState.repeatMode,
      },
      splitUnits: sampleUnits,
    };
    return generateCSS(opts, PRESETS);
  }, [labState]);

  const gsapSnippet = useMemo(() => {
    const preset = getPresetById(labState.presetId);
    const splitMode = preset?.splitMode ?? 'chars';
    const rawParams: Record<string, unknown> = {};
    for (const spec of preset?.params ?? []) {
      rawParams[spec.id] =
        labState.params[spec.id] !== undefined
          ? labState.params[spec.id]
          : spec.default;
    }
    const opts: GSAPOpts = {
      text: labState.text,
      fontFamily: labState.fontFamily,
      fontSize: labState.fontSize,
      lineHeight: labState.lineHeight,
      letterSpacing: labState.letterSpacing,
      align: labState.align,
      textColor: labState.textColor,
      presetId: labState.presetId,
      params: rawParams,
      timing: {
        duration: labState.duration,
        delay: labState.delay,
        staggerAmount: labState.staggerAmount,
        staggerOrigin: labState.staggerOrigin,
        easing: labState.easing,
        repeatMode: labState.repeatMode,
      },
      splitUnits: [],
      splitMode,
    };
    return generateGSAPSnippet(opts);
  }, [labState]);

  const reactSnippet = useMemo(() => {
    const preset = getPresetById(labState.presetId);
    const splitMode = preset?.splitMode ?? 'chars';
    const rawParams: Record<string, unknown> = {};
    for (const spec of preset?.params ?? []) {
      rawParams[spec.id] =
        labState.params[spec.id] !== undefined
          ? labState.params[spec.id]
          : spec.default;
    }
    const opts: ReactOpts = {
      text: labState.text,
      fontFamily: labState.fontFamily,
      fontSize: labState.fontSize,
      lineHeight: labState.lineHeight,
      letterSpacing: labState.letterSpacing,
      align: labState.align,
      textColor: labState.textColor,
      presetId: labState.presetId,
      params: rawParams,
      timing: {
        duration: labState.duration,
        delay: labState.delay,
        staggerAmount: labState.staggerAmount,
        staggerOrigin: labState.staggerOrigin,
        easing: labState.easing,
        repeatMode: labState.repeatMode,
      },
      splitUnits: [],
      splitMode,
    };
    return generateReactComponent(opts);
  }, [labState]);

  const cancelExport = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setGifRunning(false);
    setVideoRunning(false);
    setPngRunning(false);
    setExportProgressText?.('');
  }, [setExportProgressText]);

  const runGifExport = useCallback(async () => {
    const stageEl = getStageEl();
    if (!stageEl) {
      showToast({
        title: 'Export failed',
        description: 'Stage element not found.',
        variant: 'error',
      });
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setGifRunning(true);
    setGifProgress(0);
    setGifBytesEst(null);

    const totalDuration = Math.max(0.1, labState.duration + labState.delay);
    const opts: GifOptions = {
      fps: gifFps,
      width: gifWidth,
      loopCount: gifLoop,
      dither: gifDither,
      quality: gifQuality,
      onProgress: (p, _f, _t) => {
        setGifProgress(p);
        const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
        setExportProgressText?.(`Exporting GIF ${pct}% complete`);
      },
      signal: ac.signal,
    };

    try {
      const { blob, estimatedBytes } = await exportGif(
        stageEl,
        getTimeline,
        totalDuration,
        opts,
      );
      setGifBytesEst(estimatedBytes);
      downloadBlob(blob, `kinetic-type-${labState.presetId}.gif`);
      showToast({
        title: 'GIF exported',
        description: `${formatBytes(estimatedBytes)} · ${gifFps}fps`,
        variant: 'success',
      });
    } catch (e) {
      const isAbort =
        e instanceof DOMException && (e as DOMException).name === 'AbortError';
      if (!isAbort) {
        showToast({
          title: 'Export failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'error',
        });
      } else {
        showToast({
          title: 'Export cancelled',
          variant: 'default',
        });
      }
    } finally {
      setGifRunning(false);
      abortRef.current = null;
    }
  }, [
    getStageEl,
    getTimeline,
    labState,
    gifFps,
    gifWidth,
    gifLoop,
    gifDither,
    gifQuality,
    showToast,
  ]);

  const runVideoExport = useCallback(async () => {
    const stageEl = getStageEl();
    if (!stageEl) {
      showToast({
        title: 'Export failed',
        description: 'Stage element not found.',
        variant: 'error',
      });
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setVideoRunning(true);
    setVideoProgress(0);

    const loopDuration = Math.max(0.1, labState.duration + labState.delay);
    const duration: VideoOptions['duration'] =
      videoDurationMode === 'loop' ? 'loop' : Math.max(0.1, videoDurationSec);
    const opts: VideoOptions = {
      fps: videoFps,
      duration,
      resolution: videoResolution,
      transparent: videoTransparent,
      mime: videoCodec,
      onProgress: (p) => {
        setVideoProgress(p);
        const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
        setExportProgressText?.(`Exporting video ${pct}% complete`);
      },
      signal: ac.signal,
    };

    try {
      const { blob, mime } = await exportVideo(
        stageEl,
        getTimeline,
        loopDuration,
        opts,
      );
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      downloadBlob(blob, `kinetic-type-${labState.presetId}.${ext}`);
      showToast({
        title: 'Video exported',
        description: `${formatBytes(blob.size)} · ${videoFps}fps`,
        variant: 'success',
      });
    } catch (e) {
      const isAbort =
        e instanceof DOMException && (e as DOMException).name === 'AbortError';
      if (!isAbort) {
        showToast({
          title: 'Export failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'error',
        });
      } else {
        showToast({
          title: 'Export cancelled',
          variant: 'default',
        });
      }
    } finally {
      setVideoRunning(false);
      abortRef.current = null;
    }
  }, [
    getStageEl,
    getTimeline,
    labState,
    videoFps,
    videoDurationMode,
    videoDurationSec,
    videoResolution,
    videoTransparent,
    videoCodec,
    showToast,
  ]);

  const runPngExport = useCallback(async () => {
    const stageEl = getStageEl();
    if (!stageEl) {
      showToast({
        title: 'Export failed',
        description: 'Stage element not found.',
        variant: 'error',
      });
      return;
    }
    setPngRunning(true);
    try {
      const blob = await exportPng(stageEl, pngScale);
      downloadBlob(blob, `kinetic-type-${labState.presetId}@${pngScale}x.png`);
      showToast({
        title: 'PNG exported',
        description: `${formatBytes(blob.size)} · ${pngScale}x`,
        variant: 'success',
      });
    } catch (e) {
      showToast({
        title: 'Export failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setPngRunning(false);
    }
  }, [getStageEl, pngScale, labState.presetId, showToast]);

  const handleCopy = useCallback(
    async (tab: CodeTab, text: string) => {
      const ok = await safeCopy(text);
      setCopyStates((prev) => ({ ...prev, [tab]: ok ? 'copied' : 'error' }));
      if (ok) {
        showToast({
          title: 'Copied to clipboard',
          variant: 'success',
        });
      } else {
        showToast({
          title: 'Copy failed',
          description: 'Clipboard access denied by browser.',
          variant: 'error',
        });
      }
      setTimeout(() => {
        setCopyStates((prev) => ({ ...prev, [tab]: 'idle' }));
      }, 1500);
    },
    [showToast],
  );

  const handleDownload = useCallback(
    (tab: CodeTab) => {
      const safeBase = `kinetic-type-${labState.presetId}`;
      if (tab === 'css') {
        downloadTextFile(cssSnippets.combined, `${safeBase}.html`, 'text/html');
      } else if (tab === 'gsap') {
        downloadTextFile(gsapSnippet, `${safeBase}.html`, 'text/html');
      } else {
        downloadTextFile(reactSnippet, `KineticText.tsx`, 'text/plain');
      }
      showToast({
        title: 'Download started',
        variant: 'success',
      });
    },
    [cssSnippets, gsapSnippet, reactSnippet, labState.presetId, showToast],
  );

  const sizeOverWarning = (gifBytesEst ?? 0) > 8 * 1024 * 1024;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="gif" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gif">GIF</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="png">PNG</TabsTrigger>
          </TabsList>

          <TabsContent value="gif" className="space-y-4">
            <ErrorBoundary fallbackTitle="GIF export failed" fallbackDesc="There was a problem preparing the GIF export panel. Please try again.">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                  FPS
                </label>
                <Select
                  value={String(gifFps)}
                  onValueChange={(v) =>
                    setGifFps(Number(v) as 12 | 15 | 24 | 30)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="FPS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 fps</SelectItem>
                    <SelectItem value="15">15 fps</SelectItem>
                    <SelectItem value="24">24 fps</SelectItem>
                    <SelectItem value="30">30 fps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                  Width (px)
                </label>
                <NumberField
                  value={gifWidth}
                  onChange={setGifWidth}
                  min={100}
                  max={3840}
                  step={20}
                  unit="px"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                  Loop
                </label>
                <Select
                  value={String(gifLoop)}
                  onValueChange={(v) => setGifLoop(Number(v) as 0 | -1)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Infinite</SelectItem>
                    <SelectItem value="-1">1 pass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                  Quality
                </label>
                <Select
                  value={String(gifQuality)}
                  onValueChange={(v) =>
                    setGifQuality(Number(v) as 10 | 20 | 30)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Low</SelectItem>
                    <SelectItem value="20">Good</SelectItem>
                    <SelectItem value="30">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Switch
                checked={gifDither}
                onCheckedChange={setGifDither}
                label="Floyd–Steinberg dither"
              />
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={runGifExport}
                  disabled={gifRunning}
                  className="flex-1"
                >
                  {gifRunning ? 'Exporting...' : 'Export GIF'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={cancelExport}
                  disabled={!gifRunning}
                >
                  Cancel
                </Button>
              </div>
              <ProgressBar
                progress={gifProgress}
                visible={gifRunning || gifProgress > 0}
              />
              {gifBytesEst !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[--dim]">
                    Estimated: {formatBytes(gifBytesEst)}
                  </span>
                  {sizeOverWarning && (
                    <span className="text-orange-400 font-mono">
                      ⚠ &gt; 8MB — file may be large for web
                    </span>
                  )}
                </div>
              )}
            </div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <ErrorBoundary fallbackTitle="Video export failed" fallbackDesc="There was a problem preparing the video export panel. Please try again.">
            {!hasMediaRecorder && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-md border border-amber-400/40 bg-amber-400/5 text-sm"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="space-y-1">
                  <p className="text-amber-200 font-mono uppercase tracking-wider text-xs">
                    Your browser does not support video recording.
                  </p>
                  <p className="text-[--dim] text-xs">
                    Please try Chrome, Edge, or Firefox for video export.{' '}
                    <a
                      href="https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder#browser_compatibility"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-amber-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-amber-400 rounded-sm px-0.5"
                    >
                      Learn More
                    </a>
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                  FPS
                </label>
                <Select
                  value={String(videoFps)}
                  onValueChange={(v) =>
                    setVideoFps(Number(v) as 15 | 24 | 30 | 60)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 fps</SelectItem>
                    <SelectItem value="24">24 fps</SelectItem>
                    <SelectItem value="30">30 fps</SelectItem>
                    <SelectItem value="60">60 fps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                  Duration
                </label>
                <Select
                  value={videoDurationMode}
                  onValueChange={(v) =>
                    setVideoDurationMode(v as 'loop' | 'custom')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loop">One loop</SelectItem>
                    <SelectItem value="custom">Custom seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {videoDurationMode === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                    Seconds
                  </label>
                  <NumberField
                    value={videoDurationSec}
                    onChange={setVideoDurationSec}
                    min={0.5}
                    max={120}
                    step={0.5}
                    unit="s"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                  Resolution
                </label>
                <Select
                  value={videoResolution}
                  onValueChange={(v) =>
                    setVideoResolution(v as 'stage' | '720p' | '1080p')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stage">Stage</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                  Codec
                </label>
                <Select
                  value={videoCodec}
                  onValueChange={(v) => setVideoCodec(v as 'webm' | 'mp4')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webm">WebM</SelectItem>
                    <SelectItem value="mp4">MP4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Switch
                checked={videoTransparent}
                onCheckedChange={setVideoTransparent}
                label="Transparent background (WebM only)"
              />
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={runVideoExport}
                  disabled={videoRunning || !hasMediaRecorder}
                  className={clsx('flex-1', !hasMediaRecorder && 'opacity-50')}
                >
                  {videoRunning ? 'Exporting...' : 'Export Video'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={cancelExport}
                  disabled={!videoRunning}
                >
                  Cancel
                </Button>
              </div>
              <ProgressBar
                progress={videoProgress}
                visible={videoRunning || videoProgress > 0}
              />
            </div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="code" className="space-y-3">
            <ErrorBoundary fallbackTitle="Code export failed" fallbackDesc="There was a problem generating code snippets. Please try again.">
            <Tabs
              value={codeTab}
              onValueChange={(v) => setCodeTab(v as CodeTab)}
            >
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="gsap">GSAP</TabsTrigger>
                <TabsTrigger value="react">React</TabsTrigger>
              </TabsList>
              <TabsContent value="css" className="space-y-2">
                {cssSnippets.note && (
                  <div className="text-xs text-orange-300 p-2 rounded border border-orange-400/30 bg-orange-500/5">
                    {cssSnippets.note}
                  </div>
                )}
                <HighlightedCode
                  code={cssSnippets.combined}
                  lang="html"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopy('css', cssSnippets.combined)}
                    className="flex-1"
                  >
                    {copyStates.css === 'copied'
                      ? '✓ Copied'
                      : copyStates.css === 'error'
                      ? 'Copy failed'
                      : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDownload('css')}
                    className="flex-1"
                  >
                    Download .html
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="gsap" className="space-y-2">
                <HighlightedCode code={gsapSnippet} lang="html" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopy('gsap', gsapSnippet)}
                    className="flex-1"
                  >
                    {copyStates.gsap === 'copied'
                      ? '✓ Copied'
                      : copyStates.gsap === 'error'
                      ? 'Copy failed'
                      : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDownload('gsap')}
                    className="flex-1"
                  >
                    Download .html
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="react" className="space-y-2">
                <HighlightedCode code={reactSnippet} lang="tsx" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopy('react', reactSnippet)}
                    className="flex-1"
                  >
                    {copyStates.react === 'copied'
                      ? '✓ Copied'
                      : copyStates.react === 'error'
                      ? 'Copy failed'
                      : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDownload('react')}
                    className="flex-1"
                  >
                    Download .tsx
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="png" className="space-y-4">
            <ErrorBoundary fallbackTitle="PNG export failed" fallbackDesc="There was a problem preparing the PNG export. Please try again.">
            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs text-[--dim] font-mono uppercase tracking-wider">
                Scale
              </label>
              <Select
                value={String(pngScale)}
                onValueChange={(v) => setPngScale(Number(v) as 1 | 2 | 4)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x (Stage size)</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={runPngExport}
                disabled={pngRunning}
                className="flex-1"
              >
                {pngRunning ? 'Exporting...' : 'Export PNG'}
              </Button>
            </div>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ProgressBar({
  progress,
  visible,
}: {
  progress: number;
  visible?: boolean;
}) {
  if (!visible) return null;
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <div className="w-full space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-sm border border-[--line] bg-[--panel]">
        <div
          className="h-full transition-[width] duration-75 ease-linear bg-[--accent]"
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
      <div className="text-right text-[10px] font-mono text-[--dim]">
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}
