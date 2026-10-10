import { stageToCanvas } from './stageToCanvas';

export async function exportPng(
  stageEl: HTMLElement,
  scale = 2
): Promise<Blob> {
  const canvas = await stageToCanvas(stageEl, {
    scale,
    bgColor: null,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode canvas to PNG'));
      },
      'image/png',
      1.0
    );
  });
}
