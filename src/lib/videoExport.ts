import gsap from 'gsap';
import { stageToCanvas } from './stageToCanvas';

void gsap;


export type VideoOptions = {
  fps: 15 | 24 | 30 | 60;
  duration: 'loop' | number;
  resolution: 'stage' | '720p' | '1080p';
  transparent: boolean;
  onProgress: (p: number) => void;
  signal?: AbortSignal;
  mime?: 'webm' | 'mp4';
};

type ResolutionPreset = { w: number; h: number } | null;

const RES_PRESETS: Record<Exclude<VideoOptions['resolution'], 'stage'>, ResolutionPreset> = {
  '720p': { w: 1280, h: 720 },
  '1080p': { w: 1920, h: 1080 },
};

function waitRAF(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pickMimeType(preferred?: 'webm' | 'mp4'): string {
  const candidates: string[] = [];
  if (preferred === 'mp4') {
    candidates.push('video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1');
  }
  candidates.push(
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm'
  );
  if (preferred !== 'mp4') {
    candidates.push('video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4');
  } else {
    candidates.push('video/mp4');
  }

  if (typeof MediaRecorder === 'undefined' || typeof (MediaRecorder as any).isTypeSupported !== 'function') {
    return candidates[candidates.length - 1];
  }
  for (const c of candidates) {
    try {
      if ((MediaRecorder as any).isTypeSupported(c)) return c;
    } catch {
    }
  }
  return '';
}

function getStageBg(el: HTMLElement): string {
  const bg = getComputedStyle(el).backgroundColor;
  return bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff';
}

export async function exportVideo(
  stageEl: HTMLElement,
  getTimeline: () => gsap.core.Timeline | null,
  totalDuration: number,
  opts: VideoOptions
): Promise<{ blob: Blob; mime: string }> {
  const rect = stageEl.getBoundingClientRect();
  const stageW = Math.max(1, Math.round(rect.width));
  const stageH = Math.max(1, Math.round(rect.height));
  const stageAspect = stageW / stageH;

  let outW: number, outH: number;
  if (opts.resolution === 'stage') {
    outW = stageW;
    outH = stageH;
  } else {
    const preset = RES_PRESETS[opts.resolution];
    if (!preset) throw new Error('Unknown resolution preset');
    const pw = preset.w;
    const ph = preset.h;
    const presetAspect = pw / ph;
    if (stageAspect >= presetAspect) {
      outW = pw;
      outH = Math.round(pw / stageAspect);
    } else {
      outH = ph;
      outW = Math.round(ph * stageAspect);
    }
  }

  outW = Math.max(1, outW);
  outH = Math.max(1, outH);

  const effectiveDuration = opts.duration === 'loop' ? totalDuration : Math.max(0.001, opts.duration);
  const totalFrames = Math.max(1, Math.ceil(opts.fps * effectiveDuration));
  const frameMs = 1000 / opts.fps;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Failed to get canvas context');

  const bgColor = opts.transparent ? null : getStageBg(stageEl);
  if (!opts.transparent && bgColor) {
    outCtx.fillStyle = bgColor;
    outCtx.fillRect(0, 0, outW, outH);
  }

  const stream = (outCanvas as any).captureStream
    ? (outCanvas as any).captureStream(opts.fps)
    : (outCanvas as HTMLCanvasElement & { mozCaptureStream?: (fps: number) => MediaStream }).mozCaptureStream
    ? (outCanvas as HTMLCanvasElement & { mozCaptureStream: (fps: number) => MediaStream }).mozCaptureStream(opts.fps)
    : null;

  if (!stream) throw new Error('Canvas captureStream is not supported in this browser');

  const mimeType = pickMimeType(opts.mime);
  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopPromise = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(Math.round(frameMs));

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (opts.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const time = i / opts.fps;
      const tl = getTimeline();
      if (tl) {
        tl.seek(time, true);
      }

      await waitRAF();

      const frameCanvas = await stageToCanvas(stageEl, {
        width: outW,
        scale: 1,
        bgColor,
      });

      if (!opts.transparent) {
        outCtx.fillStyle = bgColor || '#ffffff';
        outCtx.fillRect(0, 0, outW, outH);
      } else {
        outCtx.clearRect(0, 0, outW, outH);
      }
      outCtx.drawImage(frameCanvas, 0, 0, outW, outH);

      opts.onProgress((i + 1) / totalFrames);

      await delay(frameMs * 0.9);
    }
  } finally {
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    await stopPromise;
  }

  const finalMime = recorder.mimeType || mimeType || 'video/webm';
  const blob = new Blob(chunks, { type: finalMime });
  return { blob, mime: finalMime };
}
