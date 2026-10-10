export type VariableAxis = {
  tag: string;
  name: string;
  min: number;
  max: number;
  default: number;
  unit?: string;
};

export type FontFamilyId =
  | 'inter'
  | 'roboto-flex'
  | 'bricolage-grotesque'
  | 'fraunces'
  | 'anybody'
  | 'instrument-serif'
  | 'jetbrains-mono'
  | 'archivo-expanded';

export type FontFamily = {
  id: FontFamilyId;
  name: string;
  family: string;
  category: string;
  axes: VariableAxis[];
  cssStack: string;
};

export const FONTS: Record<FontFamilyId, FontFamily> = {
  inter: {
    id: 'inter',
    name: 'Inter',
    family: 'Inter',
    category: 'sans-serif',
    axes: [
      { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400 },
    ],
    cssStack: "'Inter', system-ui, -apple-system, sans-serif",
  },
  'roboto-flex': {
    id: 'roboto-flex',
    name: 'Roboto Flex',
    family: 'Roboto Flex',
    category: 'sans-serif',
    axes: [
      { tag: 'wght', name: 'Weight', min: 100, max: 1000, default: 400 },
      { tag: 'wdth', name: 'Width', min: 25, max: 151, default: 100 },
      { tag: 'slnt', name: 'Slant', min: -10, max: 0, default: 0 },
      { tag: 'GRAD', name: 'Grade', min: -200, max: 150, default: 0 },
    ],
    cssStack: "'Roboto Flex', system-ui, -apple-system, sans-serif",
  },
  'bricolage-grotesque': {
    id: 'bricolage-grotesque',
    name: 'Bricolage Grotesque',
    family: 'Bricolage Grotesque',
    category: 'sans-serif',
    axes: [
      { tag: 'wght', name: 'Weight', min: 200, max: 800, default: 400 },
      { tag: 'wdth', name: 'Width', min: 75, max: 100, default: 100 },
      { tag: 'opsz', name: 'Optical Size', min: 12, max: 96, default: 12 },
    ],
    cssStack: "'Bricolage Grotesque', system-ui, -apple-system, sans-serif",
  },
  fraunces: {
    id: 'fraunces',
    name: 'Fraunces',
    family: 'Fraunces',
    category: 'serif',
    axes: [
      { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400 },
      { tag: 'SOFT', name: 'Softness', min: 0, max: 100, default: 50 },
      { tag: 'WONK', name: 'Wonk', min: 0, max: 1, default: 0 },
      { tag: 'opsz', name: 'Optical Size', min: 9, max: 144, default: 12 },
    ],
    cssStack: "'Fraunces', Georgia, serif",
  },
  anybody: {
    id: 'anybody',
    name: 'Anybody',
    family: 'Anybody',
    category: 'sans-serif',
    axes: [
      { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400 },
      { tag: 'wdth', name: 'Width', min: 50, max: 150, default: 100 },
    ],
    cssStack: "'Anybody', system-ui, -apple-system, sans-serif",
  },
  'instrument-serif': {
    id: 'instrument-serif',
    name: 'Instrument Serif',
    family: 'Instrument Serif',
    category: 'serif',
    axes: [
      { tag: 'wght', name: 'Weight', min: 400, max: 700, default: 400 },
    ],
    cssStack: "'Instrument Serif', Georgia, serif",
  },
  'jetbrains-mono': {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    family: 'JetBrains Mono',
    category: 'monospace',
    axes: [
      { tag: 'wght', name: 'Weight', min: 100, max: 800, default: 400 },
    ],
    cssStack: "'JetBrains Mono', ui-monospace, Menlo, monospace",
  },
  'archivo-expanded': {
    id: 'archivo-expanded',
    name: 'Archivo Expanded',
    family: 'Archivo Expanded',
    category: 'sans-serif',
    axes: [
      { tag: 'wght', name: 'Weight', min: 400, max: 900, default: 400 },
      { tag: 'wdth', name: 'Width', min: 62, max: 125, default: 100 },
    ],
    cssStack: "'Archivo Expanded', system-ui, -apple-system, sans-serif",
  },
};

export const FONTS_ARRAY: FontFamily[] = Object.values(FONTS);

export function getFontById(id: FontFamilyId): FontFamily {
  return FONTS[id];
}

export function getFontAxes(fontId: FontFamilyId): VariableAxis[] {
  const font = getFontById(fontId);
  return font?.axes ?? [];
}

export function fontVariationString(
  fontId: FontFamilyId,
  settings: Record<string, number>
): string {
  const axes = getFontAxes(fontId);
  if (axes.length === 0) return '';

  const parts: string[] = [];
  for (const axis of axes) {
    const value = settings[axis.tag] ?? axis.default;
    const clamped = Math.max(axis.min, Math.min(axis.max, value));
    parts.push(`'${axis.tag}' ${clamped}`);
  }
  return parts.join(', ');
}
