import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { gsap } from 'gsap';
import NumberField from '../ui/NumberField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Button } from '../ui/Button';
import { EASE_LIST, parseEasing, type EasingParsed } from '../../lib/easing';

type Props = {
  value: string;
  onChange: (easing: string) => void;
  className?: string;
};

const SZ = 150;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const toSx = (x: number) => x * SZ;
const toSy = (y: number) => SZ - y * SZ;

function sampleGsap(easeId: string): string {
  let fn: (t: number) => number = (t) => t;
  try {
    const p = gsap.parseEase(easeId);
    if (typeof p === 'function') fn = p as (t: number) => number;
    else if (p && typeof (p as any).getRatio === 'function')
      fn = (t) => (p as any).getRatio(t);
  } catch {}
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    pts.push(`${i === 0 ? 'M' : 'L'}${toSx(t).toFixed(2)},${toSy(fn(t)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const bezierD = (x1: number, y1: number, x2: number, y2: number) =>
  `M${toSx(0)},${toSy(1)} C${toSx(x1)},${toSy(y1)} ${toSx(x2)},${toSy(y2)} ${toSx(1)},${toSy(0)}`;

export default function EasingPicker({ value, onChange, className = '' }: Props) {
  const parsed: EasingParsed = useMemo(() => parseEasing(value), [value]);
  const isCustom = parsed.type === 'cubicBezier';
  const [customMode, setCustomMode] = useState(isCustom);

  useEffect(() => setCustomMode(isCustom), [isCustom]);

  const bv = useMemo<[number, number, number, number]>(
    () => (parsed.type === 'cubicBezier' ? parsed.value : [0.25, 0.1, 0.25, 1]),
    [parsed]
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<'p1' | 'p2' | null>(null);

  const onPDown = (w: 'p1' | 'p2') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = w;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const nx = clamp((e.clientX - r.left) / r.width, 0, 1);
    const ny = clamp(1 - (e.clientY - r.top) / r.height, -0.5, 1.5);
    const [x1, y1, x2, y2] = bv;
    if (dragRef.current === 'p1') onChange(`cubic-bezier(${nx}, ${ny}, ${x2}, ${y2})`);
    else onChange(`cubic-bezier(${x1}, ${y1}, ${nx}, ${ny})`);
  };

  const onPUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
      dragRef.current = null;
    }
  };

  const [x1, y1, x2, y2] = bv;

  const curveD = useMemo(() => {
    if (customMode && parsed.type === 'cubicBezier') return bezierD(x1, y1, x2, y2);
    return sampleGsap(parsed.type === 'gsap' ? parsed.value : 'power2.out');
  }, [customMode, parsed, x1, y1, x2, y2]);

  const toggleCust = () => {
    if (customMode) { setCustomMode(false); onChange('power2.out'); }
    else { setCustomMode(true); onChange(`cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`); }
  };

  const updF = (i: 0 | 1 | 2 | 3, v: number, mn: number, mx: number) => {
    const a = [...bv] as [number, number, number, number];
    a[i] = clamp(v, mn, mx);
    onChange(`cubic-bezier(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]})`);
  };

  const onSelCh = (v: string) => {
    if (v === '__custom__') {
      setCustomMode(true);
      onChange(`cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`);
      return;
    }
    setCustomMode(false);
    onChange(v);
  };

  const selVal = customMode ? '__custom__' : parsed.type === 'gsap' ? parsed.value : 'power2.out';

  return (
    <div className={clsx('flex flex-col gap-2 w-full', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono uppercase text-[10px] text-[--dim] tracking-wider shrink-0">
          Easing
        </span>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Select value={selVal} onValueChange={onSelCh}>
            <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__custom__">Custom bezier</SelectItem>
              {EASE_LIST.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={customMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={toggleCust}
            className="h-8 px-2 text-[10px]"
          >
            Custom
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <svg
          ref={svgRef}
          width={SZ}
          height={SZ}
          viewBox={`0 0 ${SZ} ${SZ}`}
          className={clsx(
            'bg-[--panel] border border-[--line] rounded select-none touch-none',
            customMode && 'cursor-crosshair'
          )}
          onPointerMove={onPMove}
          onPointerUp={onPUp}
          onPointerCancel={onPUp}
        >
          <rect x={0.5} y={0.5} width={SZ - 1} height={SZ - 1} fill="none" stroke="var(--line)" />
          <line x1={0} y1={SZ - 0.5} x2={SZ} y2={0.5} stroke="var(--line)" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.5} />
          <path d={curveD} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {customMode && (
            <>
              <line x1={toSx(0)} y1={toSy(1)} x2={toSx(x1)} y2={toSy(y1)} stroke="var(--dim)" strokeWidth={1} opacity={0.6} />
              <line x1={toSx(1)} y1={toSy(0)} x2={toSx(x2)} y2={toSy(y2)} stroke="var(--dim)" strokeWidth={1} opacity={0.6} />
              <circle cx={toSx(0)} cy={toSy(1)} r={3} fill="var(--dim)" opacity={0.5} />
              <circle cx={toSx(1)} cy={toSy(0)} r={3} fill="var(--dim)" opacity={0.5} />
              <circle cx={toSx(x1)} cy={toSy(y1)} r={8} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5}
                className="cursor-grab active:cursor-grabbing" onPointerDown={onPDown('p1')} />
              <circle cx={toSx(x2)} cy={toSy(y2)} r={8} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5}
                className="cursor-grab active:cursor-grabbing" onPointerDown={onPDown('p2')} />
            </>
          )}
        </svg>
      </div>

      {customMode && (
        <div className="grid grid-cols-4 gap-2">
          {(['x1', 'y1', 'x2', 'y2'] as const).map((k, i) => {
            const mn = k.startsWith('x') ? 0 : -0.5;
            const mx = k.startsWith('x') ? 1 : 1.5;
            return (
              <div key={k} className="flex flex-col gap-1 items-center">
                <span className="font-mono text-[9px] text-[--dim] uppercase">{k}</span>
                <NumberField
                  value={bv[i]}
                  onChange={(v) => updF(i as 0 | 1 | 2 | 3, v, mn, mx)}
                  min={mn}
                  max={mx}
                  step={0.01}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
