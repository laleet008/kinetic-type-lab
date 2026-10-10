import type { AspectRatio } from '../../store/lab';

type GuidesProps = { showGrid: boolean; showSafeArea: boolean; aspectRatio: AspectRatio; width: number; height: number };

const RATIOS: Record<Exclude<AspectRatio, 'free'>, number> = { '1:1': 1, '16:9': 16 / 9, '9:16': 9 / 16, '4:5': 4 / 5 };

function safeRect(ratio: AspectRatio, w: number, h: number) {
  if (ratio === 'free') return null;
  const t = RATIOS[ratio as Exclude<AspectRatio, 'free'>];
  const [rw, rh] = w / h > t ? [h * t, h] : [w, w / t];
  return { x: (w - rw) / 2, y: (h - rh) / 2, width: rw, height: rh };
}

const T = 8;

export default function Guides({ showGrid, showSafeArea, aspectRatio, width, height }: GuidesProps) {
  const lines: number[] = [];
  if (showGrid) for (let i = 1; i < 8; i++) lines.push(i);
  const r = showSafeArea ? safeRect(aspectRatio, width, height) : null;
  const ticks = r ? [[r.x, r.y, 1, 0, 0, 1], [r.x + r.width, r.y, -1, 0, 0, 1], [r.x, r.y + r.height, 1, 0, 0, -1], [r.x + r.width, r.y + r.height, -1, 0, 0, -1]] : [];
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      {showGrid && lines.map(i => <line key={'v' + i} x1={(width / 8) * i} y1={0} x2={(width / 8) * i} y2={height} stroke="var(--line)" strokeWidth={1} strokeOpacity={0.3} />)}
      {showGrid && lines.map(i => <line key={'h' + i} x1={0} y1={(height / 8) * i} x2={width} y2={(height / 8) * i} stroke="var(--line)" strokeWidth={1} strokeOpacity={0.3} />)}
      {showGrid && <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="var(--dim)" strokeWidth={1.5} strokeOpacity={0.5} />}
      {showGrid && <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke="var(--dim)" strokeWidth={1.5} strokeOpacity={0.5} />}
      {r && <rect x={r.x} y={r.y} width={r.width} height={r.height} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeOpacity={0.7} strokeDasharray="4 4" />}
      {r && ticks.map(([cx, cy, dx, , , dy], i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={cx + dx * T} y2={cy} stroke="var(--accent)" strokeWidth={2} />
          <line x1={cx} y1={cy} x2={cx} y2={cy + dy * T} stroke="var(--accent)" strokeWidth={2} />
        </g>
      ))}
    </svg>
  );
}
