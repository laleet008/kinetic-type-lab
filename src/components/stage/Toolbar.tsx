import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as SliderPrimitive from '@radix-ui/react-slider';
import clsx from 'clsx';
import { useLabStore, type Align } from '../../store/lab';
import { FONTS_ARRAY, type FontFamilyId } from '../../lib/fonts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Toggle } from '../ui/Toggle';

const SWATCHES = ['#ECECEE', '#C6FF4F', '#FFFFFF', '#FF6B6B', '#4ECDC4', '#000000'];
const ALIGN_LINES: Record<Align, [number, number, number, number][]> = {
  left: [[3, 6, 21, 6], [3, 12, 15, 12], [3, 18, 18, 18]],
  center: [[3, 6, 21, 6], [6, 12, 18, 12], [4, 18, 20, 18]],
  right: [[3, 6, 21, 6], [9, 12, 21, 12], [6, 18, 21, 18]],
  justify: [[3, 6, 21, 6], [3, 12, 21, 12], [3, 18, 21, 18]],
};

function CompactSlider({ value, min, max, step, onChange, ariaLabel }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; ariaLabel?: string }) {
  return (
    <SliderPrimitive.Root
      className="relative flex w-24 touch-none select-none items-center focus-visible:outline-none"
      value={[value]}
      onValueChange={v => onChange(v[0])}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      aria-valuetext={String(value)}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[--line]">
        <SliderPrimitive.Range className="absolute h-full bg-[--accent]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block w-3 h-3 rounded-full bg-[--text] border-2 border-[--panel] hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent]" />
    </SliderPrimitive.Root>
  );
}

function AlignIcon({ align }: { align: Align }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      {ALIGN_LINES[align].map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
    </svg>
  );
}

const Divider = () => <div className="w-px h-6 bg-[--line]" />;
const Label = ({ children }: { children: React.ReactNode }) => <span className="font-mono text-[10px] uppercase tracking-wider text-[--dim] mr-1">{children}</span>;

export default function Toolbar() {
  const s = useLabStore();
  const [hex, setHex] = useState(s.textColor);
  const aligns: Align[] = ['left', 'center', 'right', 'justify'];
  return (
    <div className="h-12 rounded-lg bg-[--panel] border border-[--line] px-3 flex items-center gap-2 shadow-lg backdrop-blur-sm">
      <Label>Font</Label>
      <Select value={s.fontFamily} onValueChange={v => s.setFont(v as FontFamilyId)}>
        <SelectTrigger className="h-8 w-40 px-2 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{FONTS_ARRAY.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
      </Select>
      <Divider />
      <Label>Size</Label>
      <CompactSlider value={s.fontSize} min={24} max={240} step={1} onChange={s.setFontSize} ariaLabel={`Font size ${s.fontSize} pixels`} />
      <span className="font-mono text-xs text-[--text] w-10">{s.fontSize}px</span>
      <Divider />
      <Label>LH</Label>
      <CompactSlider value={s.lineHeight} min={0.8} max={2} step={0.05} onChange={s.setLineHeight} ariaLabel={`Line height ${s.lineHeight.toFixed(2)}`} />
      <span className="font-mono text-xs text-[--text] w-10">{s.lineHeight.toFixed(2)}×</span>
      <Divider />
      <Label>LS</Label>
      <CompactSlider value={s.letterSpacing} min={-0.1} max={0.3} step={0.01} onChange={s.setLetterSpacing} ariaLabel={`Letter spacing ${s.letterSpacing.toFixed(2)} em`} />
      <span className="font-mono text-xs text-[--text] w-12">{s.letterSpacing > 0 ? '+' : ''}{s.letterSpacing.toFixed(2)}em</span>
      <Divider />
      <div className="flex items-center gap-0.5">
        {aligns.map(a => (
          <Toggle key={a} variant="small" className="h-8 w-8 px-0" pressed={s.align === a} onPressedChange={p => p && s.setAlign(a)} aria-label={`Align ${a}`}>
            <AlignIcon align={a} />
          </Toggle>
        ))}
      </div>
      <Divider />
      <Popover.Root>
        <Popover.Trigger asChild>
          <button className="w-6 h-6 rounded border border-[--line] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent] hover:scale-110 transition-transform" style={{ backgroundColor: s.textColor }} aria-label="Text color" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-50 rounded-md border border-[--line] bg-[--panel] p-3 shadow-lg w-56" sideOffset={8}>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {SWATCHES.map(c => (
                <button key={c} onClick={() => { s.setTextColor(c); setHex(c); }} className={clsx('w-7 h-7 rounded border hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent]', s.textColor.toLowerCase() === c.toLowerCase() ? 'border-[--accent] ring-2 ring-[--accent]/30' : 'border-[--line]')} style={{ backgroundColor: c }} aria-label={`Color ${c}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[--dim]">#</span>
              <input type="text" value={hex.replace('#', '')} onChange={e => { const v = '#' + e.target.value; setHex(v); if (/^#[0-9A-Fa-f]{6}$/.test(v)) s.setTextColor(v); }} maxLength={6} className="flex-1 h-8 rounded-md border border-[--line] bg-[--bg] px-2 text-sm font-mono text-[--text] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent]" aria-label="Hex color input" />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
