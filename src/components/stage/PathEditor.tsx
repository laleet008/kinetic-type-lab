import { useEffect, useMemo, useRef, useState } from 'react';

type PathEditorProps = {
  containerSize: { w: number; h: number };
  onPathChange: (d: string) => void;
  initialD?: string;
};

type MoveCmd = { type: 'M'; x: number; y: number };
type CurveCmd = {
  type: 'C';
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
  x: number;
  y: number;
};
type PathCmd = MoveCmd | CurveCmd;

type DragTarget =
  | { kind: 'anchor'; idx: number }
  | { kind: 'ctrl'; cmdIdx: number; which: 1 | 2 };

const DEFAULT_D =
  'M 10% 50% C 25% 20%, 45% 80%, 60% 50% C 75% 20%, 85% 80%, 95% 50%';

function parsePctOrNum(tok: string): number {
  if (tok.endsWith('%')) return parseFloat(tok) / 100;
  return parseFloat(tok);
}

function tokenizeD(d: string): string[] {
  return d.replace(/([MmLlHhVvCcSsQqTtAaZz,])/g, ' $1 ').trim().split(/\s+/);
}

function parseCommands(d: string): PathCmd[] {
  const toks = tokenizeD(d);
  const cmds: PathCmd[] = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (t === 'M' || t === 'm') {
      const x = parsePctOrNum(toks[i + 1]);
      const y = parsePctOrNum(toks[i + 2]);
      cmds.push({ type: 'M', x, y });
      i += 3;
    } else if (t === 'C' || t === 'c') {
      const cp1x = parsePctOrNum(toks[i + 1]);
      const cp1y = parsePctOrNum(toks[i + 2]);
      const cp2x = parsePctOrNum(toks[i + 3]);
      const cp2y = parsePctOrNum(toks[i + 4]);
      const x = parsePctOrNum(toks[i + 5]);
      const y = parsePctOrNum(toks[i + 6]);
      cmds.push({ type: 'C', cp1x, cp1y, cp2x, cp2y, x, y });
      i += 7;
    } else {
      i++;
    }
  }
  if (cmds.length === 0 || cmds[0].type !== 'M') {
    cmds.unshift({ type: 'M', x: 0.1, y: 0.5 });
  }
  return cmds;
}

function commandsToD(cmds: PathCmd[]): string {
  let d = '';
  for (const c of cmds) {
    if (c.type === 'M') {
      d += `M ${(c.x * 100).toFixed(2)}% ${(c.y * 100).toFixed(2)}% `;
    } else {
      d +=
        `C ${(c.cp1x * 100).toFixed(2)}% ${(c.cp1y * 100).toFixed(2)}%, ` +
        `${(c.cp2x * 100).toFixed(2)}% ${(c.cp2y * 100).toFixed(2)}%, ` +
        `${(c.x * 100).toFixed(2)}% ${(c.y * 100).toFixed(2)}% `;
    }
  }
  return d.trim();
}

function anchorCount(cmds: PathCmd[]): number {
  if (cmds.length === 0) return 0;
  return cmds.filter((c) => c.type === 'C').length + 1;
}

function getAnchorPos(cmds: PathCmd[], idx: number): { x: number; y: number } {
  if (idx === 0) {
    const m = cmds[0] as MoveCmd;
    return { x: m.x, y: m.y };
  }
  const cmd = cmds[idx] as CurveCmd;
  return { x: cmd.x, y: cmd.y };
}

export default function PathEditor({
  containerSize,
  onPathChange,
  initialD,
}: PathEditorProps) {
  const [commands, setCommands] = useState<PathCmd[]>(() =>
    parseCommands(initialD || DEFAULT_D)
  );
  const dragRef = useRef<{
    target: DragTarget;
    startX: number;
    startY: number;
    origCmds: PathCmd[];
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { w, h } = containerSize;

  useEffect(() => {
    onPathChange(commandsToD(commands));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands]);

  const anchors = useMemo(() => {
    const result: { idx: number; x: number; y: number }[] = [];
    const n = anchorCount(commands);
    for (let i = 0; i < n; i++) {
      const p = getAnchorPos(commands, i);
      result.push({ idx: i, x: p.x * w, y: p.y * h });
    }
    return result;
  }, [commands, w, h]);

  const handleLocalPt = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    return {
      x: Math.max(0, Math.min(1, w > 0 ? px / w : 0)),
      y: Math.max(0, Math.min(1, h > 0 ? py / h : 0)),
    };
  };

  const onPointerDownAnchor = (e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = handleLocalPt(e.clientX, e.clientY);
    dragRef.current = {
      target: { kind: 'anchor', idx },
      startX: p.x,
      startY: p.y,
      origCmds: commands.map((c) => ({ ...c })),
    };
  };

  const onPointerDownCtrl = (
    e: React.PointerEvent,
    cmdIdx: number,
    which: 1 | 2
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = handleLocalPt(e.clientX, e.clientY);
    dragRef.current = {
      target: { kind: 'ctrl', cmdIdx, which },
      startX: p.x,
      startY: p.y,
      origCmds: commands.map((c) => ({ ...c })),
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { target, startX, startY, origCmds } = dragRef.current;
    const p = handleLocalPt(e.clientX, e.clientY);
    const ddx = p.x - startX;
    const ddy = p.y - startY;

    const next = origCmds.map((c) => ({ ...c })) as PathCmd[];

    if (target.kind === 'anchor') {
      const ai = target.idx;
      if (ai === 0) {
        const m = next[0] as MoveCmd;
        m.x = Math.max(0, Math.min(1, m.x + ddx));
        m.y = Math.max(0, Math.min(1, m.y + ddy));
        if (next.length > 1 && next[1].type === 'C') {
          const c = next[1] as CurveCmd;
          c.cp1x = Math.max(0, Math.min(1, c.cp1x + ddx));
          c.cp1y = Math.max(0, Math.min(1, c.cp1y + ddy));
        }
      } else {
        const cmd = next[ai] as CurveCmd;
        cmd.x = Math.max(0, Math.min(1, cmd.x + ddx));
        cmd.y = Math.max(0, Math.min(1, cmd.y + ddy));
        cmd.cp2x = Math.max(0, Math.min(1, cmd.cp2x + ddx));
        cmd.cp2y = Math.max(0, Math.min(1, cmd.cp2y + ddy));
        if (ai + 1 < next.length && next[ai + 1].type === 'C') {
          const nc = next[ai + 1] as CurveCmd;
          nc.cp1x = Math.max(0, Math.min(1, nc.cp1x + ddx));
          nc.cp1y = Math.max(0, Math.min(1, nc.cp1y + ddy));
        }
      }
    } else {
      const cmd = next[target.cmdIdx] as CurveCmd;
      if (target.which === 1) {
        cmd.cp1x = Math.max(0, Math.min(1, cmd.cp1x + ddx));
        cmd.cp1y = Math.max(0, Math.min(1, cmd.cp1y + ddy));
      } else {
        cmd.cp2x = Math.max(0, Math.min(1, cmd.cp2x + ddx));
        cmd.cp2y = Math.max(0, Math.min(1, cmd.cp2y + ddy));
      }
    }

    setCommands(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  };

  const dAttr = commandsToD(commands);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-10"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ touchAction: 'none' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <path
        d={dAttr}
        fill="none"
        stroke="var(--accent, #C6FF4F)"
        strokeWidth={2}
        strokeDasharray="4 4"
        opacity={0.7}
      />

      {commands.map((cmd, i) => {
        if (cmd.type !== 'C') return null;
        const anchor = getAnchorPos(commands, i - 1);
        const ax = anchor.x * w;
        const ay = anchor.y * h;
        const cp1x = cmd.cp1x * w;
        const cp1y = cmd.cp1y * h;
        const cp2x = cmd.cp2x * w;
        const cp2y = cmd.cp2y * h;
        const endx = cmd.x * w;
        const endy = cmd.y * h;

        return (
          <g key={`ctrl-${i}`}>
            <line
              x1={ax}
              y1={ay}
              x2={cp1x}
              y2={cp1y}
              stroke="var(--dim, #888)"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.6}
            />
            <line
              x1={endx}
              y1={endy}
              x2={cp2x}
              y2={cp2y}
              stroke="var(--dim, #888)"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.6}
            />
            <circle
              cx={cp1x}
              cy={cp1y}
              r={6}
              fill="var(--panel, #1a1a1a)"
              stroke="var(--accent, #C6FF4F)"
              strokeWidth={1.5}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => onPointerDownCtrl(e, i, 1)}
            />
            <circle
              cx={cp2x}
              cy={cp2y}
              r={6}
              fill="var(--panel, #1a1a1a)"
              stroke="var(--accent, #C6FF4F)"
              strokeWidth={1.5}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => onPointerDownCtrl(e, i, 2)}
            />
          </g>
        );
      })}

      {anchors.map((a) => (
        <circle
          key={`a-${a.idx}`}
          cx={a.x}
          cy={a.y}
          r={8}
          fill="var(--accent, #C6FF4F)"
          stroke="#0B0B0C"
          strokeWidth={2}
          style={{ cursor: 'grab' }}
          onPointerDown={(e) => onPointerDownAnchor(e, a.idx)}
        />
      ))}
    </svg>
  );
}
