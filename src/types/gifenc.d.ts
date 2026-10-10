declare module 'gifenc' {
  export interface Palette {
    data: Uint8Array;
    length: number;
  }

  export interface WriteFrameOptions {
    palette: Palette;
    delay: number;
    dispose?: number;
    transparent?: number;
    repeat?: number;
  }

  export interface GIFEncoderInstance {
    start(): void;
    setRepeat(repeat: number): void;
    setFrameRate(fps: number): void;
    writeFrame(
      indexedPixels: Uint8Array,
      width: number,
      height: number,
      opts?: WriteFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    blob(): Blob;
  }

  export interface GIFEncoderConstructor {
    (): GIFEncoderInstance;
    new (): GIFEncoderInstance;
  }

  export const GIFEncoder: GIFEncoderConstructor;

  export function quantize(
    rgba: Uint8ClampedArray,
    maxColors: number,
    opts?: { format?: string }
  ): Palette;

  export function applyPalette(
    rgba: Uint8ClampedArray,
    palette: Palette,
    dither?: string
  ): Uint8Array;
}
