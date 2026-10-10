const TYPOGRAPHY_PROPS = [
  'color',
  'font-family',
  'font-size',
  'font-variation-settings',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'text-transform',
  'opacity',
  'transform',
  'transform-origin',
  'filter',
  'perspective',
  'perspective-origin',
  'mix-blend-mode',
  'display',
  'position',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'left',
  'top',
  'right',
  'bottom',
  'box-sizing',
  'white-space',
  'overflow',
  'overflow-x',
  'overflow-y',
  'justify-content',
  'align-items',
  'align-content',
  'flex-direction',
  'flex-wrap',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'gap',
  'row-gap',
  'column-gap',
  'grid-template-columns',
  'grid-template-rows',
  'grid-gap',
  'z-index',
  'visibility',
  'box-shadow',
  'text-shadow',
  'word-break',
  'word-wrap',
  'vertical-align',
  'user-select',
  'pointer-events',
];

type FontFaceBlob = {
  css: string;
};

const fontFaceCache = new Map<string, FontFaceBlob>();

function walkTwoTrees(
  orig: Node,
  clone: Node,
  cb: (origEl: Element, cloneEl: Element) => void
) {
  if (orig.nodeType === Node.ELEMENT_NODE && clone.nodeType === Node.ELEMENT_NODE) {
    cb(orig as Element, clone as Element);
  }
  const origChildren = orig.childNodes;
  const cloneChildren = clone.childNodes;
  for (let i = 0; i < origChildren.length; i++) {
    if (cloneChildren[i]) {
      walkTwoTrees(origChildren[i], cloneChildren[i], cb);
    }
  }
}

function inlineComputedStyles(orig: HTMLElement, clone: HTMLElement) {
  walkTwoTrees(orig, clone, (origEl, cloneEl) => {
    const computed = getComputedStyle(origEl);
    const parts: string[] = [];
    for (const prop of TYPOGRAPHY_PROPS) {
      const val = computed.getPropertyValue(prop);
      if (val !== '' && val !== null && val !== undefined) {
        parts.push(`${prop}:${val}`);
      }
    }
    (cloneEl as HTMLElement).style.cssText = parts.join(';');
  });
}

function collectFontFamilies(el: HTMLElement): Set<string> {
  const families = new Set<string>();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const e = node as HTMLElement;
    const fontFamily = getComputedStyle(e).fontFamily;
    if (fontFamily) {
      const parts = fontFamily.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      for (const p of parts) {
        if (p && !['system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace', 'ui-monospace', 'Menlo', 'Georgia', 'cursive', 'fantasy'].includes(p)) {
          families.add(p);
        }
      }
    }
    node = walker.nextNode();
  }
  return families;
}

async function fetchGoogleFontCss(family: string): Promise<string> {
  const encoded = encodeURIComponent(family.replace(/\s+/g, '+'));
  const url = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,100..900;1,100..900&display=swap`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  });
  if (!resp.ok) throw new Error(`Failed to fetch font CSS for ${family}`);
  return resp.text();
}

async function fetchFontAsBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch font file from ${url}`);
  const buffer = await resp.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function inlineFontFaceSources(css: string): Promise<string> {
  const urlRegex = /url\((['"]?)(https?:\/\/[^'")\s]+)\1\)/g;
  const matches: Array<{ full: string; url: string }> = [];
  let m;
  while ((m = urlRegex.exec(css)) !== null) {
    matches.push({ full: m[0], url: m[2] });
  }
  let result = css;
  for (const match of matches) {
    try {
      const b64 = await fetchFontAsBase64(match.url);
      const isWoff2 = match.url.includes('.woff2') || match.url.includes('woff2');
      const mime = isWoff2 ? 'font/woff2' : 'font/woff';
      result = result.replace(match.full, `url(data:${mime};base64,${b64})`);
    } catch (e) {
      console.warn('Failed to inline font:', match.url, e);
    }
  }
  return result;
}

async function getInlinedFontFaces(el: HTMLElement): Promise<string> {
  const families = collectFontFamilies(el);
  if (families.size === 0) return '';

  const allRules: string[] = [];

  for (const family of families) {
    const cached = fontFaceCache.get(family);
    if (cached) {
      allRules.push(cached.css);
      continue;
    }
    try {
      const css = await fetchGoogleFontCss(family);
      const inlined = await inlineFontFaceSources(css);
      fontFaceCache.set(family, { css: inlined });
      allRules.push(inlined);
    } catch (e) {
      console.warn(`Failed to load font ${family}:`, e);
    }
  }

  return allRules.join('\n');
}

export async function stageToCanvas(
  el: HTMLElement,
  opts: {
    width?: number;
    scale?: number;
    bgColor?: string | null;
  } = {}
): Promise<HTMLCanvasElement> {
  const rect = el.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const outW = opts.width ? Math.round(opts.width) : w;
  const outH = opts.width ? Math.round((outW / w) * h) : h;
  const scale = opts.scale ?? 1;
  const canvasW = Math.round(outW * scale);
  const canvasH = Math.round(outH * scale);

  const clone = el.cloneNode(true) as HTMLElement;
  inlineComputedStyles(el, clone);

  const allFontFaces = await getInlinedFontFaces(el);

  const outerComputed = getComputedStyle(el);
  const outerParts: string[] = [];
  for (const prop of [
    'width', 'height', 'display', 'position', 'margin', 'padding',
    'box-sizing', 'background', 'background-color',
  ]) {
    const val = outerComputed.getPropertyValue(prop);
    if (val) outerParts.push(`${prop}:${val}`);
  }
  outerParts.push('transform:none');
  const outerStyle = outerParts.join(';');

  const bgRect = opts.bgColor
    ? `<rect width="100%" height="100%" fill="${opts.bgColor}"/>`
    : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style type="text/css"><![CDATA[${allFontFaces}]]></style>
    ${bgRect}
  </defs>
  <foreignObject width="${w}" height="${h}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="${outerStyle}">${clone.outerHTML.replace(/^<[^>]+>|<\/[^>]+>$/g, '')}</div>
  </foreignObject>
</svg>`;

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0, outW, outH);

    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
