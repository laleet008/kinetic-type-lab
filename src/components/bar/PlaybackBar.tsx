import * as React from 'react';
import { useContext, useEffect, useRef } from 'react';
import { useLabStore } from '../../store/lab';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { GlobalTimelineContext } from '../../lib/timelineController';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../ui/Select';

const speedOptions = [0.25, 0.5, 1, 1.25, 1.5, 2];

export default function PlaybackBar() {
  const ctx = useContext(GlobalTimelineContext);
  const {
    isPlaying,
    play,
    pause,
    restart,
    progress,
    seek,
    loopToggle,
    setLoopToggle,
    speed,
    setSpeed,
    duration,
  } = useLabStore();

  const currentSeconds = progress * duration;
  const totalSeconds = duration;

  const formatSeconds = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2);
    return `${m}:${sec.padStart(5, '0')}`;
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleRestart = () => {
    restart();
    if (ctx) ctx.tlRef.current?.restart();
  };

  return (
    <div className="h-14 bg-[--panel] border-t border-[--line] flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRestart}
          aria-label="Restart"
        >
          <RefreshIcon />
        </Button>
        <Toggle
          pressed={loopToggle}
          onPressedChange={setLoopToggle}
          variant="small"
          aria-label="Loop"
        >
          <LoopIcon />
        </Toggle>
        <Select
          value={String(speed)}
          onValueChange={(v) => setSpeed(Number(v))}
        >
          <SelectTrigger className="w-20 h-8">
            <SelectValue placeholder="1×" />
          </SelectTrigger>
          <SelectContent>
            {speedOptions.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}×
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 mx-6 flex items-center gap-3">
        <Timeline progress={progress} onSeek={seek} />
        <span className="font-mono text-xs text-[--dim] tabular-nums w-28 text-right">
          {formatSeconds(currentSeconds)} / {formatSeconds(totalSeconds)}
        </span>
      </div>

      <div>
        <Button variant="primary" size="sm" aria-label="Export">
          <DownloadIcon />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>
    </div>
  );
}

function Timeline({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (p: number) => void;
}) {
  const ctx = useContext(GlobalTimelineContext);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateProgress = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const p = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, p));
    if (ctx) {
      ctx.tlRef.current?.progress(clamped).pause();
    }
    onSeek(clamped);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      updateProgress(e.clientX);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const store = useLabStore.getState();
      if (ctx) {
        ctx.setScrubbing(false);
        if (store.isPlaying) ctx.tlRef.current?.play();
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [ctx, onSeek]);

  return (
    <div
      ref={trackRef}
      className="flex-1 h-14 flex items-center cursor-pointer group select-none"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={progress}
      aria-label="Timeline scrubber"
      onMouseDown={(e) => {
        dragging.current = true;
        if (ctx) ctx.setScrubbing(true);
        updateProgress(e.clientX);
      }}
    >
      <div className="relative w-full h-1 bg-[--line] rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-[--accent] rounded-full"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[--accent] shadow-lg shadow-[--accent]/30 group-hover:scale-110 transition-transform"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

const IconSvg = (props: { children: React.ReactNode; fill?: string; stroke?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={props.fill ?? 'none'} stroke={props.stroke ?? 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {props.children}
  </svg>
);

function PlayIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>; }
function PauseIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>; }
function RefreshIcon() { return <IconSvg><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><polyline points="21 3 21 8 16 8" /></IconSvg>; }
function LoopIcon() { return <IconSvg><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></IconSvg>; }
function DownloadIcon() { return <IconSvg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></IconSvg>; }
