import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { useState } from 'react';
import { Slider } from '../ui/Slider';
import NumberField from '../ui/NumberField';
import { Button } from '../ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Switch } from '../ui/Switch';
import { useLabStore } from '../../store/lab';
import {
  getPresetById,
  type ParamSpec,
  type RangeParam,
  type SelectParam,
  type ToggleParam,
  type ColorParam,
  type EasingParam,
} from '../../presets';
import { getFontAxes } from '../../lib/fonts';
import type { CursorWeightOptions } from '../../modes/cursorWeight';
import { physics, type GravityDir } from '../../modes/physics';
import { PATH_PRESETS, type PathPresetId } from '../../modes/textPath';
import EasingPicker from './EasingPicker';

const SWATCHES = ['#ECECEE', '#C6FF4F', '#FFFFFF', '#FF6B6B', '#4ECDC4', '#000000'];

const STAGGER_ORIGIN_OPTIONS = [
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
  { value: 'center', label: 'Center' },
  { value: 'edges', label: 'Edges' },
  { value: 'random', label: 'Random' },
];

const REPEAT_MODE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'loop', label: 'Loop' },
  { value: 'pingpong', label: 'Pingpong' },
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono uppercase text-[10px] text-[--dim] mt-4 mb-2 tracking-wider">
    {children}
  </div>
);

const Row = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx('space-y-2', className)}>{children}</div>
);

const FieldLabel = ({
  label,
  onDoubleClick,
}: {
  label: string;
  onDoubleClick?: () => void;
}) => (
  <div
    className="flex items-center justify-between px-1"
    onDoubleClick={onDoubleClick}
  >
    <span className="text-sm text-[--dim]">{label}</span>
  </div>
);

function RangeControl({
  spec,
  value,
  onChange,
}: {
  spec: RangeParam;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Row>
      <FieldLabel label={spec.label} onDoubleClick={() => onChange(spec.default)} />
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1">
          <Slider
            value={[value]}
            onValueChange={([v]) => onChange(v)}
            min={spec.min}
            max={spec.max}
            step={spec.step}
          />
        </div>
        <NumberField
          value={value}
          unit={spec.unit}
          onChange={onChange}
          min={spec.min}
          max={spec.max}
          step={spec.step}
        />
      </div>
    </Row>
  );
}

function SelectControl({
  spec,
  value,
  onChange,
}: {
  spec: SelectParam;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Row>
      <FieldLabel label={spec.label} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {spec.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Row>
  );
}

function ToggleControl({
  spec,
  value,
  onChange,
}: {
  spec: ToggleParam;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-[--dim]">{spec.label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function ColorControl({
  spec,
  value,
  onChange,
}: {
  spec: ColorParam;
  value: string;
  onChange: (v: string) => void;
}) {
  const [hex, setHex] = useState(value);
  return (
    <Row>
      <FieldLabel label={spec.label} />
      <div className="flex items-center gap-3">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              className="w-8 h-8 rounded border border-[--line] focus:outline-none focus:ring-2 focus:ring-[--accent] hover:scale-110 transition-transform"
              style={{ backgroundColor: value }}
              aria-label={spec.label}
            />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 rounded-md border border-[--line] bg-[--panel] p-3 shadow-lg w-56"
              sideOffset={8}
            >
              <div className="grid grid-cols-6 gap-2 mb-3">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onChange(c);
                      setHex(c);
                    }}
                    className={clsx(
                      'w-7 h-7 rounded border hover:scale-110 transition-transform',
                      value.toLowerCase() === c.toLowerCase()
                        ? 'border-[--accent] ring-2 ring-[--accent]/30'
                        : 'border-[--line]'
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[--dim]">
                  #
                </span>
                <input
                  type="text"
                  value={hex.replace('#', '')}
                  onChange={(e) => {
                    const v = '#' + e.target.value;
                    setHex(v);
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
                  }}
                  maxLength={6}
                  className="flex-1 h-8 rounded-md border border-[--line] bg-[--bg] px-2 text-sm font-mono text-[--text] uppercase focus:outline-none focus:ring-1 focus:ring-[--accent]"
                />
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <span className="text-xs font-mono text-[--dim] uppercase">
          {value}
        </span>
      </div>
    </Row>
  );
}

function EasingControl({
  spec,
  value,
  onChange,
}: {
  spec: EasingParam;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Row>
      <FieldLabel label={spec.label} />
      <EasingPicker value={value} onChange={onChange} />
    </Row>
  );
}

function ParamControl({
  spec,
  value,
  onChange,
}: {
  spec: ParamSpec;
  value: number | string | boolean;
  onChange: (v: number | string | boolean) => void;
}) {
  switch (spec.type) {
    case 'range':
      return (
        <RangeControl
          spec={spec}
          value={value as number}
          onChange={(v) => onChange(v)}
        />
      );
    case 'select':
      return (
        <SelectControl
          spec={spec}
          value={value as string}
          onChange={(v) => onChange(v)}
        />
      );
    case 'toggle':
      return (
        <ToggleControl
          spec={spec}
          value={value as boolean}
          onChange={(v) => onChange(v)}
        />
      );
    case 'color':
      return (
        <ColorControl
          spec={spec}
          value={value as string}
          onChange={(v) => onChange(v)}
        />
      );
    case 'easing':
      return (
        <EasingControl
          spec={spec}
          value={value as string}
          onChange={(v) => onChange(v)}
        />
      );
    default:
      return null;
  }
}

const FALLOFF_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'gaussian', label: 'Gaussian' },
];

const SUPPORTED_AXIS_TAGS = ['wght', 'wdth', 'slnt', 'opsz'] as const;

const GRAVITY_DIRS: { value: GravityDir; label: string; vec: { x: number; y: number } }[] = [
  { value: 'down', label: 'Down', vec: { x: 0, y: 1 } },
  { value: 'up', label: 'Up', vec: { x: 0, y: -1 } },
  { value: 'left', label: 'Left', vec: { x: -1, y: 0 } },
  { value: 'right', label: 'Right', vec: { x: 1, y: 0 } },
  { value: 'zero', label: 'Zero', vec: { x: 0, y: 0 } },
];

function vecToGravityDir(v: { x: number; y: number }): GravityDir {
  for (const d of GRAVITY_DIRS) {
    if (d.vec.x === v.x && d.vec.y === v.y) return d.value;
  }
  if (Math.abs(v.y) > Math.abs(v.x)) {
    return v.y > 0 ? 'down' : 'up';
  }
  if (v.x === 0 && v.y === 0) return 'zero';
  return v.x > 0 ? 'right' : 'left';
}

export default function ParamPanel() {
  const {
    presetId,
    params,
    duration,
    delay,
    staggerAmount,
    staggerOrigin,
    easing,
    repeatMode,
    cursorWeightMode,
    physicsMode,
    textPathMode,
    fontFamily,
    setParam,
    setTiming,
    toggleMode,
    setModeParams,
  } = useLabStore();

  const preset = getPresetById(presetId);
  const fontAxes = getFontAxes(fontFamily);
  const availableAxisOptions = fontAxes
    .filter((a) => (SUPPORTED_AXIS_TAGS as readonly string[]).includes(a.tag))
    .map((a) => ({ value: a.tag, label: a.name }));
  const wghtAxis = fontAxes.find((a) => a.tag === 'wght');
  const selectedAxisObj = fontAxes.find((a) => a.tag === cursorWeightMode.params.axis);
  const minWeightAxisMin = selectedAxisObj?.min ?? wghtAxis?.min ?? 100;
  const minWeightAxisMax = selectedAxisObj?.max ?? wghtAxis?.max ?? 900;
  const maxWeightAxisMin = minWeightAxisMin;
  const maxWeightAxisMax = minWeightAxisMax;

  return (
    <aside className="w-[300px] shrink-0 h-full bg-[--panel] border-l border-[--line] flex flex-col">
      <ScrollArea.Root className="flex-1 w-full h-full overflow-hidden">
        <ScrollArea.Viewport className="w-full h-full px-4">
          <div className="pb-4 space-y-1">
            <SectionLabel>Preset Parameters</SectionLabel>
            {preset && preset.params.length > 0 ? (
              <div className="space-y-3 border border-[--line] rounded-md p-3 bg-[--bg]/30">
                {preset.params.map((spec) => (
                  <ParamControl
                    key={spec.id}
                    spec={spec}
                    value={
                      params[spec.id] !== undefined
                        ? params[spec.id]
                        : spec.default
                    }
                    onChange={(v) => setParam(spec.id, v)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[--line] p-4">
                <p className="text-sm text-[--dim] text-center">
                  No preset parameters
                </p>
              </div>
            )}

            <SectionLabel>Timing</SectionLabel>
            <div className="space-y-3 border border-[--line] rounded-md p-3 bg-[--bg]/30">
              <Row>
                <FieldLabel
                  label="Duration"
                  onDoubleClick={() => setTiming({ duration: 2 })}
                />
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1">
                    <Slider
                      value={[duration]}
                      onValueChange={([v]) => setTiming({ duration: v })}
                      min={0.2}
                      max={10}
                      step={0.1}
                    />
                  </div>
                  <NumberField
                    value={duration}
                    unit="s"
                    onChange={(v) => setTiming({ duration: v })}
                    min={0.2}
                    max={10}
                    step={0.1}
                  />
                </div>
              </Row>

              <Row>
                <FieldLabel
                  label="Delay"
                  onDoubleClick={() => setTiming({ delay: 0 })}
                />
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1">
                    <Slider
                      value={[delay]}
                      onValueChange={([v]) => setTiming({ delay: v })}
                      min={0}
                      max={5}
                      step={0.05}
                    />
                  </div>
                  <NumberField
                    value={delay}
                    unit="s"
                    onChange={(v) => setTiming({ delay: v })}
                    min={0}
                    max={5}
                    step={0.05}
                  />
                </div>
              </Row>

              <EasingPicker
                value={easing}
                onChange={(e) => setTiming({ easing: e })}
              />

              <Row>
                <FieldLabel
                  label="Stagger Amount"
                  onDoubleClick={() => setTiming({ staggerAmount: 0.03 })}
                />
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1">
                    <Slider
                      value={[staggerAmount]}
                      onValueChange={([v]) => setTiming({ staggerAmount: v })}
                      min={0}
                      max={0.5}
                      step={0.01}
                    />
                  </div>
                  <NumberField
                    value={staggerAmount}
                    unit="s"
                    onChange={(v) => setTiming({ staggerAmount: v })}
                    min={0}
                    max={0.5}
                    step={0.01}
                  />
                </div>
              </Row>

              <Row>
                <FieldLabel label="Stagger Origin" />
                <Select
                  value={staggerOrigin}
                  onValueChange={(v) =>
                    setTiming({ staggerOrigin: v as typeof staggerOrigin })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGGER_ORIGIN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>

              <Row>
                <FieldLabel label="Repeat Mode" />
                <Select
                  value={repeatMode}
                  onValueChange={(v) =>
                    setTiming({ repeatMode: v as typeof repeatMode })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPEAT_MODE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
            </div>

            <SectionLabel>Modes</SectionLabel>
            <div className="space-y-2 border border-[--line] rounded-md p-3 bg-[--bg]/30">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-[--dim]">Cursor Weight</span>
                <Switch
                  checked={cursorWeightMode.enabled}
                  onCheckedChange={() => toggleMode('cursorWeightMode')}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-[--dim]">Physics</span>
                <Switch
                  checked={physicsMode.enabled}
                  onCheckedChange={() => toggleMode('physicsMode')}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-[--dim]">Text Path</span>
                <Switch
                  checked={textPathMode.enabled}
                  onCheckedChange={() => toggleMode('textPathMode')}
                />
              </div>
            </div>

            {cursorWeightMode.enabled && (
              <div className="space-y-3 mt-3 border border-[--accent]/40 rounded-md p-3 bg-[--accent]/5">
                <Row>
                  <FieldLabel
                    label="Radius"
                    onDoubleClick={() =>
                      setModeParams('cursorWeightMode', { radius: 150 })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[cursorWeightMode.params.radius]}
                        onValueChange={([v]) =>
                          setModeParams('cursorWeightMode', { radius: v })
                        }
                        min={20}
                        max={500}
                        step={5}
                      />
                    </div>
                    <NumberField
                      value={cursorWeightMode.params.radius}
                      unit="px"
                      onChange={(v) =>
                        setModeParams('cursorWeightMode', { radius: v })
                      }
                      min={20}
                      max={500}
                      step={5}
                    />
                  </div>
                </Row>

                <Row>
                  <FieldLabel
                    label={`Min ${selectedAxisObj?.name ?? 'Weight'}`}
                    onDoubleClick={() =>
                      setModeParams('cursorWeightMode', {
                        minWeight: minWeightAxisMin,
                      })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[cursorWeightMode.params.minWeight]}
                        onValueChange={([v]) =>
                          setModeParams('cursorWeightMode', { minWeight: v })
                        }
                        min={minWeightAxisMin}
                        max={minWeightAxisMax}
                        step={10}
                      />
                    </div>
                    <NumberField
                      value={cursorWeightMode.params.minWeight}
                      onChange={(v) =>
                        setModeParams('cursorWeightMode', { minWeight: v })
                      }
                      min={minWeightAxisMin}
                      max={minWeightAxisMax}
                      step={10}
                    />
                  </div>
                </Row>

                <Row>
                  <FieldLabel
                    label={`Max ${selectedAxisObj?.name ?? 'Weight'}`}
                    onDoubleClick={() =>
                      setModeParams('cursorWeightMode', {
                        maxWeight: maxWeightAxisMax,
                      })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[cursorWeightMode.params.maxWeight]}
                        onValueChange={([v]) =>
                          setModeParams('cursorWeightMode', { maxWeight: v })
                        }
                        min={maxWeightAxisMin}
                        max={maxWeightAxisMax}
                        step={10}
                      />
                    </div>
                    <NumberField
                      value={cursorWeightMode.params.maxWeight}
                      onChange={(v) =>
                        setModeParams('cursorWeightMode', { maxWeight: v })
                      }
                      min={maxWeightAxisMin}
                      max={maxWeightAxisMax}
                      step={10}
                    />
                  </div>
                </Row>

                <Row>
                  <FieldLabel label="Falloff" />
                  <Select
                    value={cursorWeightMode.params.falloff}
                    onValueChange={(v) =>
                      setModeParams('cursorWeightMode', {
                        falloff: v as CursorWeightOptions['falloff'],
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FALLOFF_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>

                {availableAxisOptions.length > 0 && (
                  <Row>
                    <FieldLabel label="Axis" />
                    <Select
                      value={
                        (SUPPORTED_AXIS_TAGS as readonly string[]).includes(
                          cursorWeightMode.params.axis
                        )
                          ? cursorWeightMode.params.axis
                          : availableAxisOptions[0]?.value ?? 'wght'
                      }
                      onValueChange={(v) =>
                        setModeParams('cursorWeightMode', {
                          axis: v as CursorWeightOptions['axis'],
                        })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAxisOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Row>
                )}

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-[--dim]">Invert</span>
                  <Switch
                    checked={cursorWeightMode.params.invert}
                    onCheckedChange={(v) =>
                      setModeParams('cursorWeightMode', { invert: v })
                    }
                  />
                </div>
              </div>
            )}

            {physicsMode.enabled && (
              <div className="space-y-3 mt-3 border border-[--accent]/40 rounded-md p-3 bg-[--accent]/5">
                <Row>
                  <FieldLabel
                    label="Gravity magnitude"
                    onDoubleClick={() =>
                      setModeParams('physicsMode', { gravity: 1 })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[physicsMode.params.gravity]}
                        onValueChange={([v]) =>
                          setModeParams('physicsMode', { gravity: v })
                        }
                        min={0}
                        max={5}
                        step={0.1}
                      />
                    </div>
                    <NumberField
                      value={physicsMode.params.gravity}
                      onChange={(v) =>
                        setModeParams('physicsMode', { gravity: v })
                      }
                      min={0}
                      max={5}
                      step={0.1}
                    />
                  </div>
                </Row>

                <Row>
                  <FieldLabel
                    label="Restitution"
                    onDoubleClick={() =>
                      setModeParams('physicsMode', { restitution: 0.6 })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[physicsMode.params.restitution]}
                        onValueChange={([v]) =>
                          setModeParams('physicsMode', { restitution: v })
                        }
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                    <NumberField
                      value={physicsMode.params.restitution}
                      onChange={(v) =>
                        setModeParams('physicsMode', { restitution: v })
                      }
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </div>
                </Row>

                <Row>
                  <FieldLabel
                    label="Friction"
                    onDoubleClick={() =>
                      setModeParams('physicsMode', { friction: 0.1 })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[physicsMode.params.friction]}
                        onValueChange={([v]) =>
                          setModeParams('physicsMode', { friction: v })
                        }
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                    <NumberField
                      value={physicsMode.params.friction}
                      onChange={(v) =>
                        setModeParams('physicsMode', { friction: v })
                      }
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </div>
                </Row>

                <Row>
                  <FieldLabel
                    label="Air resistance"
                    onDoubleClick={() =>
                      setModeParams('physicsMode', { airResistance: 0.02 })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[physicsMode.params.airResistance]}
                        onValueChange={([v]) =>
                          setModeParams('physicsMode', { airResistance: v })
                        }
                        min={0}
                        max={0.25}
                        step={0.01}
                      />
                    </div>
                    <NumberField
                      value={physicsMode.params.airResistance}
                      onChange={(v) =>
                        setModeParams('physicsMode', { airResistance: v })
                      }
                      min={0}
                      max={0.25}
                      step={0.01}
                    />
                  </div>
                </Row>

                <Row>
                  <FieldLabel label="Gravity direction" />
                  <div className="grid grid-cols-5 gap-1.5">
                    {GRAVITY_DIRS.map((d) => {
                      const active =
                        vecToGravityDir(physicsMode.params.gravityDir) === d.value;
                      return (
                        <button
                          key={d.value}
                          onClick={() =>
                            setModeParams('physicsMode', { gravityDir: d.vec })
                          }
                          className={clsx(
                            'h-9 rounded-md flex items-center justify-center transition-all font-mono text-[10px] uppercase tracking-wider',
                            active
                              ? 'bg-[--accent] text-[#0B0B0C]'
                              : 'bg-[--panel] border border-[--line] text-[--dim] hover:text-[--text] hover:bg-[--line]'
                          )}
                          title={d.label}
                        >
                          {d.value === 'down' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 5v14M19 12l-7 7-7-7" />
                            </svg>
                          )}
                          {d.value === 'up' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                          )}
                          {d.value === 'left' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                          )}
                          {d.value === 'right' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          )}
                          {d.value === 'zero' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="8" />
                              <circle cx="12" cy="12" r="2.5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Row>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => physics.shake()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12h2M6 8l-2-2M6 16l-2 2M20 12h2M18 8l2-2M18 16l2 2M8 12h8" />
                    </svg>
                    Shake
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => physics.pour()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v4M8 7l4-4 4 4M6 12a6 6 0 0 0 12 0" />
                      <circle cx="8" cy="18" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="16" cy="18" r="1.5" />
                    </svg>
                    Pour
                  </Button>
                </div>
              </div>
            )}

            {textPathMode.enabled && (
              <div className="space-y-3 mt-3 border border-[--accent]/40 rounded-md p-3 bg-[--accent]/5">
                <Row>
                  <FieldLabel label="Path preset" />
                  <Select
                    value={textPathMode.params.pathId}
                    onValueChange={(v) =>
                      setModeParams('textPathMode', { pathId: v as PathPresetId })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(PATH_PRESETS) as [
                          PathPresetId,
                          { name: string },
                        ][]
                      ).map(([id, { name }]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>

                <Row>
                  <FieldLabel
                    label="Start offset"
                    onDoubleClick={() =>
                      setModeParams('textPathMode', { startOffset: 0 })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[textPathMode.params.startOffset]}
                        onValueChange={([v]) =>
                          setModeParams('textPathMode', { startOffset: v })
                        }
                        min={0}
                        max={1}
                        step={0.01}
                      />
                    </div>
                    <NumberField
                      value={textPathMode.params.startOffset}
                      onChange={(v) =>
                        setModeParams('textPathMode', { startOffset: v })
                      }
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>
                </Row>

                <Row>
                  <FieldLabel
                    label="Spacing"
                    onDoubleClick={() =>
                      setModeParams('textPathMode', { spacing: 1 })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[textPathMode.params.spacing]}
                        onValueChange={([v]) =>
                          setModeParams('textPathMode', { spacing: v })
                        }
                        min={0.5}
                        max={3}
                        step={0.05}
                      />
                    </div>
                    <NumberField
                      value={textPathMode.params.spacing}
                      unit="×"
                      onChange={(v) =>
                        setModeParams('textPathMode', { spacing: v })
                      }
                      min={0.5}
                      max={3}
                      step={0.05}
                    />
                  </div>
                </Row>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-[--dim]">Flip side</span>
                    <Switch
                      checked={textPathMode.params.flipSide}
                      onCheckedChange={(v) =>
                        setModeParams('textPathMode', { flipSide: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-[--dim]">Rotate with path</span>
                    <Switch
                      checked={textPathMode.params.rotateWithPath}
                      onCheckedChange={(v) =>
                        setModeParams('textPathMode', { rotateWithPath: v })
                      }
                    />
                  </div>
                </div>

                <Row>
                  <FieldLabel
                    label="Animation speed"
                    onDoubleClick={() =>
                      setModeParams('textPathMode', { animSpeed: 1 })
                    }
                  />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <Slider
                        value={[textPathMode.params.animSpeed]}
                        onValueChange={([v]) =>
                          setModeParams('textPathMode', { animSpeed: v })
                        }
                        min={0}
                        max={5}
                        step={0.1}
                      />
                    </div>
                    <NumberField
                      value={textPathMode.params.animSpeed}
                      unit="c/s"
                      onChange={(v) =>
                        setModeParams('textPathMode', { animSpeed: v })
                      }
                      min={0}
                      max={5}
                      step={0.1}
                    />
                  </div>
                </Row>
              </div>
            )}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex w-1.5 select-none touch-none p-0.5 transition-colors data-[orientation=vertical]:h-full"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-[--line]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </aside>
  );
}
