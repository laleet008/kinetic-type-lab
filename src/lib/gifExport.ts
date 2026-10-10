import gsap from 'gsap';
import { stageToCanvas } from './stageToCanvas';

void gsap;

type GifencModule = typeof import('gifenc');

let _gifencPromise: Promise<GifencModule> | null = null;

async function ensureGifenc(): Promise<GifencModule> {
  if (!_gifencPromise) _gifencPromise = import('gifenc');
  return _gifencPromise;
}

export type GifOptions = {
  fps: 12 | 15 | 24 | 30;
  width?: number;
  loopCount: number;
  dither: boolean;
  quality: number;
  onProgress: (p: number, frame: number, total: number) => void;
  signal?: AbortSignal;
};

function waitRAF(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

export async function exportGif(
  stageEl: HTMLElement,
  getTimeline: () => gsap.core.Timeline | null,
  totalDuration: number,
  opts: GifOptions
): Promise<{ blob: Blob; estimatedBytes: number }> {
  const { GIFEncoder, quantize, applyPalette } = await ensureGifenc();

  const frames = Math.max(1, Math.ceil(opts.fps * totalDuration));
  const delay = Math.round(1000 / opts.fps);

  const gif = GIFEncoder();
  gif.start();
  gif.setRepeat(opts.loopCount === 0 ? 0 : 1);
  gif.setFrameRate(opts.fps);

  let estimatedBytes = 0;

  for (let i = 0; i < frames; i++) {
    if (opts.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const tl = getTimeline();
    if (tl) {
      tl.seek(i / opts.fps, true);
    }

    await waitRAF();

    const canvas = await stageToCanvas(stageEl, {
      width: opts.width,
      scale: 1,
      bgColor: '#ffffff',
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(imageData.data, 256, { format: 'rgb565' });
    const indexed = applyPalette(imageData.data, palette, opts.dither ? 'FloydSteinberg' : undefined);
    gif.writeFrame(indexed, canvas.width, canvas.height, {
      palette,
      delay,
      dispose: 1,
    });

    estimatedBytes = (i + 1) * Math.floor((canvas.width * canvas.height) / 12);
    opts.onProgress((i + 1) / frames, i + 1, frames);

    await new Promise((r) => setTimeout(r, 0));
  }

  gif.finish();

  return {
    blob: gif.blob(),
    estimatedBytes,
  };
}
