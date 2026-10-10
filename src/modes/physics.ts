import type { SplitUnit } from '../lib/split';
import { useLabStore } from '../store/lab';

export type GravityDir = 'down' | 'up' | 'left' | 'right' | 'zero';

export type PhysicsParams = {
  gravity: number;
  restitution: number;
  friction: number;
  airResistance: number;
  gravityDir: GravityDir | { x: number; y: number };
};

export type PhysicsAPI = {
  enable: (container: HTMLElement, getSplitUnits: () => SplitUnit[]) => Promise<void>;
  disable: () => void;
  shake: () => void;
  pour: () => void;
  setParams: (p: Partial<PhysicsParams>) => void;
  setGravityDir: (dir: GravityDir) => void;
  isEnabled: () => boolean;
};

let _matterPromise: Promise<typeof import('matter-js')> | null = null;
let _Matter: typeof import('matter-js') | null = null;

async function ensureMatterLoaded() {
  if (!_matterPromise) {
    _matterPromise = import('matter-js').then((m) => {
      _Matter = m.default;
      return m.default;
    });
  }
  return _matterPromise;
}

const MAX_UNITS = 160;
const WALL_THICKNESS = 40;

type InitialCenter = { x: number; y: number };

type MatterType = typeof import('matter-js');
type Engine = ReturnType<MatterType['Engine']['create']>;
type Runner = ReturnType<MatterType['Runner']['create']>;
type Body = ReturnType<MatterType['Bodies']['rectangle']>;
type MouseConstraint = ReturnType<MatterType['MouseConstraint']['create']>;
type Mouse = ReturnType<MatterType['Mouse']['create']>;

let enabled = false;
let engine: Engine | null = null;
let runner: Runner | null = null;
let currentContainer: HTMLElement | null = null;
let initialCenters: Map<number, InitialCenter> = new Map();
let wallsObjs: Body[] = [];
let mouseConstraint: MouseConstraint | null = null;
let mouse: Mouse | null = null;
let resizeObserver: ResizeObserver | null = null;
let trackedSpans: HTMLElement[] = [];
let currentParams: {
  gravity: number;
  restitution: number;
  friction: number;
  airResistance: number;
  gravityDirVec: { x: number; y: number };
} = {
  gravity: 1,
  restitution: 0.6,
  friction: 0.1,
  airResistance: 0.02,
  gravityDirVec: { x: 0, y: 1 },
};

function dirToVec(dir: GravityDir | { x: number; y: number }): { x: number; y: number } {
  if (typeof dir === 'object') return dir;
  switch (dir) {
    case 'down':
      return { x: 0, y: 1 };
    case 'up':
      return { x: 0, y: -1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'zero':
      return { x: 0, y: 0 };
  }
}

function applyGravity() {
  if (!engine) return;
  engine.gravity.x = currentParams.gravityDirVec.x * currentParams.gravity;
  engine.gravity.y = currentParams.gravityDirVec.y * currentParams.gravity;
}

function createWalls(container: HTMLElement): Body[] {
  const M = _Matter!;
  const w = container.clientWidth;
  const h = container.clientHeight;
  const t = WALL_THICKNESS;

  const floor = M.Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, {
    isStatic: true,
    friction: 0.5,
    restitution: 0.3,
  });
  const ceiling = M.Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, {
    isStatic: true,
    friction: 0.5,
    restitution: 0.3,
  });
  const leftWall = M.Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, {
    isStatic: true,
    friction: 0.5,
    restitution: 0.3,
  });
  const rightWall = M.Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, {
    isStatic: true,
    friction: 0.5,
    restitution: 0.3,
  });

  return [floor, ceiling, leftWall, rightWall];
}

function repositionWalls(container: HTMLElement, walls: Body[]) {
  const M = _Matter!;
  const w = container.clientWidth;
  const h = container.clientHeight;
  const t = WALL_THICKNESS;
  const [floor, ceiling, leftWall, rightWall] = walls;
  if (floor) M.Body.setPosition(floor, { x: w / 2, y: h + t / 2 });
  if (ceiling) M.Body.setPosition(ceiling, { x: w / 2, y: -t / 2 });
  if (leftWall) M.Body.setPosition(leftWall, { x: -t / 2, y: h / 2 });
  if (rightWall) M.Body.setPosition(rightWall, { x: w + t / 2, y: h / 2 });
}

function onVisibilityChange() {
  if (!_Matter || !runner || !engine) return;
  const M = _Matter;
  if (document.hidden) {
    M.Runner.stop(runner);
  } else {
    M.Runner.run(runner, engine);
  }
}

function afterUpdateHandler() {
  if (!_Matter || !engine) return;
  const M = _Matter;
  const bodies = M.Composite.allBodies(engine.world);
  for (const body of bodies) {
    if (body.isStatic) continue;
    const span = (body as any).__span as HTMLElement | undefined;
    const initial = initialCenters.get(body.id);
    if (!span || !initial) continue;
    const dx = body.position.x - initial.x;
    const dy = body.position.y - initial.y;
    span.style.transform = `translate(${dx}px, ${dy}px) rotate(${body.angle}rad)`;
  }
}

function mouseStartHandler() {
  if (currentContainer) {
    currentContainer.style.touchAction = 'none';
  }
}

function mouseEndHandler() {
  if (currentContainer) {
    currentContainer.style.touchAction = '';
  }
}

const physics: PhysicsAPI = {
  async enable(container, getSplitUnits) {
    const Matter = await ensureMatterLoaded();

    physics.disable();

    currentContainer = container;

    const storeState = useLabStore.getState?.();
    if (storeState?.physicsMode?.params) {
      const p = storeState.physicsMode.params;
      currentParams = {
        gravity: p.gravity ?? 1,
        restitution: p.restitution ?? 0.6,
        friction: p.friction ?? 0.1,
        airResistance: p.airResistance ?? 0.02,
        gravityDirVec: dirToVec(p.gravityDir ?? { x: 0, y: 1 }),
      };
    }

    engine = Matter.Engine.create();
    engine.enableSleeping = true;

    applyGravity();

    runner = Matter.Runner.create({ delta: 1000 / 60, isFixed: true });

    if (!document.hidden) {
      Matter.Runner.run(runner, engine);
    }

    wallsObjs = createWalls(container);
    Matter.Composite.add(engine.world, wallsObjs);

    const units = getSplitUnits();
    const containerRect = container.getBoundingClientRect();
    const limit = Math.min(units.length, MAX_UNITS);
    const newBodies: Body[] = [];
    trackedSpans = [];
    initialCenters.clear();

    for (let i = 0; i < limit; i++) {
      const unit = units[i];
      const el = unit.el;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const w = Math.max(r.width * 0.9, 4);
      const h = Math.max(r.height * 0.9, 4);
      const cx = (r.left + r.right) / 2 - containerRect.left;
      const cy = (r.top + r.bottom) / 2 - containerRect.top;
      const spawnY = -h * (i % 8);

      const body = Matter.Bodies.rectangle(cx, spawnY, w, h, {
        restitution: currentParams.restitution,
        friction: currentParams.friction,
        frictionAir: currentParams.airResistance,
        density: 0.001,
        chamfer: { radius: 2 },
      });

      (body as any).__span = el;
      (el as any).__body = body;
      initialCenters.set(body.id, { x: cx, y: cy });
      trackedSpans.push(el);
      newBodies.push(body);
    }

    Matter.Composite.add(engine.world, newBodies);

    Matter.Events.on(engine, 'afterUpdate', afterUpdateHandler);

    mouse = Matter.Mouse.create(container);
    mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        damping: 0.05,
      },
    });
    Matter.Composite.add(engine.world, mouseConstraint);

    Matter.Events.on(mouseConstraint, 'startdrag', mouseStartHandler);
    Matter.Events.on(mouseConstraint, 'enddrag', mouseEndHandler);

    resizeObserver = new ResizeObserver(() => {
      if (currentContainer && wallsObjs.length === 4) {
        repositionWalls(currentContainer, wallsObjs);
      }
    });
    resizeObserver.observe(container);

    document.addEventListener('visibilitychange', onVisibilityChange);

    enabled = true;
  },

  disable() {
    const M = _Matter;
    if (M && runner) {
      M.Runner.stop(runner);
    }

    if (M && mouseConstraint && engine) {
      M.Events.off(mouseConstraint, 'startdrag', mouseStartHandler);
      M.Events.off(mouseConstraint, 'enddrag', mouseEndHandler);
      try {
        M.Composite.remove(engine.world, mouseConstraint);
      } catch {
        /* noop */
      }
    }

    if (M && mouse) {
      try {
        (M.Mouse as any).clearSourceEvents?.(mouse);
      } catch {
        /* noop */
      }
    }

    if (M && engine) {
      M.Events.off(engine, 'afterUpdate', afterUpdateHandler);
      try {
        M.Composite.clear(engine.world, false);
      } catch {
        /* noop */
      }
      try {
        M.Engine.clear(engine);
      } catch {
        /* noop */
      }
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    document.removeEventListener('visibilitychange', onVisibilityChange);

    for (const span of trackedSpans) {
      span.style.transform = '';
      span.style.willChange = '';
      delete (span as any).__body;
    }

    enabled = false;
    engine = null;
    runner = null;
    currentContainer = null;
    wallsObjs = [];
    mouseConstraint = null;
    mouse = null;
    resizeObserver = null;
    trackedSpans = [];
    initialCenters.clear();
  },

  shake() {
    const M = _Matter;
    if (!M || !engine) return;
    const bodies = M.Composite.allBodies(engine.world);
    for (const body of bodies) {
      if (body.isStatic) continue;
      const fx = (Math.random() - 0.5) * currentParams.gravity * body.mass * 30;
      const fy = (Math.random() - 0.5) * currentParams.gravity * body.mass * 30;
      M.Body.applyForce(body, body.position, { x: fx, y: fy });
    }
  },

  pour() {
    const M = _Matter;
    if (!M || !engine || !currentContainer) return;
    const w = currentContainer.clientWidth;
    const bodies = M.Composite.allBodies(engine.world);
    for (const body of bodies) {
      if (body.isStatic) continue;
      const randomX = Math.random() * w;
      const randomY = -(Math.random() * 400 + 100);
      M.Body.setPosition(body, { x: randomX, y: randomY });
      M.Body.setVelocity(body, { x: 0, y: 0 });
      M.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.1);
    }
  },

  setParams(p) {
    const M = _Matter;
    if (p.gravity !== undefined) {
      currentParams.gravity = p.gravity;
    }
    if (p.restitution !== undefined || p.friction !== undefined || p.airResistance !== undefined) {
      currentParams.restitution = p.restitution ?? currentParams.restitution;
      currentParams.friction = p.friction ?? currentParams.friction;
      currentParams.airResistance = p.airResistance ?? currentParams.airResistance;
      if (M && engine) {
        const bodies = M.Composite.allBodies(engine.world);
        for (const body of bodies) {
          if (body.isStatic) continue;
          if (p.restitution !== undefined) body.restitution = p.restitution;
          if (p.friction !== undefined) body.friction = p.friction;
          if (p.airResistance !== undefined) body.frictionAir = p.airResistance;
        }
      }
    }
    if (p.gravityDir !== undefined) {
      currentParams.gravityDirVec = dirToVec(p.gravityDir);
    }
    applyGravity();
  },

  setGravityDir(dir) {
    currentParams.gravityDirVec = dirToVec(dir);
    applyGravity();
  },

  isEnabled() {
    return enabled;
  },
};

export { physics };
