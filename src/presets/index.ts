export type ParamType = 'range' | 'select' | 'toggle' | 'color' | 'easing' | 'string';

export type RangeParam = {
  type: 'range';
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
};

export type SelectParam = {
  type: 'select';
  id: string;
  label: string;
  options: { value: string; label: string }[];
  default: string;
};

export type ToggleParam = {
  type: 'toggle';
  id: string;
  label: string;
  default: boolean;
};

export type ColorParam = {
  type: 'color';
  id: string;
  label: string;
  default: string;
};

export type EasingParam = {
  type: 'easing';
  id: string;
  label: string;
  default: string;
};

export type StringParam = {
  type: 'string';
  id: string;
  label: string;
  default: string;
};

export type ParamSpec =
  | RangeParam
  | SelectParam
  | ToggleParam
  | ColorParam
  | EasingParam
  | StringParam;

export type SplitMode = 'chars' | 'words' | 'lines';

export type PresetCategory = 'Entrance' | 'Loop' | 'Effect' | 'Physics' | 'Path';

export type SplitUnit = {
  index: number;
  total: number;
  lineIndex: number;
  charInWord: number;
  normX: number;
  normY: number;
  distFromCenter: number;
  el: HTMLElement;
};

export type PresetContext = {
  container: HTMLElement;
  units: SplitUnit[];
  text: string;
  params: Record<string, unknown>;
  timing: {
    duration: number;
    delay: number;
    staggerAmount: number;
    staggerOrigin: string;
    easing: string;
    repeatMode: string;
  };
  getFontVarSettings?: () => string;
};

export type Preset = {
  id: string;
  name: string;
  category: PresetCategory;
  splitMode: SplitMode;
  params: ParamSpec[];
  build: (ctx: PresetContext) => gsap.core.Timeline;
  cssExport?: boolean;
  description: string;
};

import wavePreset from './wave';
import glitchPreset from './glitch';
import explodePreset from './explode';
import gravityDropPreset from './gravityDrop';
import flip3dPreset from './flip3d';
import scramblePreset from './scramble';
import typewriterPreset from './typewriter';
import maskRevealPreset from './maskReveal';
import variableWavePreset from './variableWave';
import elasticStretchPreset from './elasticStretch';
import blurFocusPreset from './blurFocus';
import orbitPreset from './orbit';

export const PRESETS: Preset[] = [
  wavePreset,
  glitchPreset,
  explodePreset,
  gravityDropPreset,
  flip3dPreset,
  scramblePreset,
  typewriterPreset,
  maskRevealPreset,
  variableWavePreset,
  elasticStretchPreset,
  blurFocusPreset,
  orbitPreset,
];

export const PRESET_CATEGORIES: PresetCategory[] = [
  'Entrance',
  'Loop',
  'Effect',
  'Physics',
  'Path',
];

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function getPresetDefaults(
  preset: Preset
): Record<string, number | string | boolean> {
  const defaults: Record<string, number | string | boolean> = {};
  for (const spec of preset.params) {
    defaults[spec.id] = spec.default;
  }
  return defaults;
}
