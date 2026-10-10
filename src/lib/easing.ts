export type EaseItem = {
  id: string;
  label: string;
  path: string;
};

export type EasingParsed =
  | { type: "gsap"; value: string }
  | { type: "cubicBezier"; value: [number, number, number, number] };

export const EASE_LIST: EaseItem[] = [
  { id: "none", label: "None", path: "none" },
  { id: "power1.in", label: "Power 1 In", path: "power1.in" },
  { id: "power1.out", label: "Power 1 Out", path: "power1.out" },
  { id: "power1.inOut", label: "Power 1 In Out", path: "power1.inOut" },
  { id: "power2.in", label: "Power 2 In", path: "power2.in" },
  { id: "power2.out", label: "Power 2 Out", path: "power2.out" },
  { id: "power2.inOut", label: "Power 2 In Out", path: "power2.inOut" },
  { id: "power3.in", label: "Power 3 In", path: "power3.in" },
  { id: "power3.out", label: "Power 3 Out", path: "power3.out" },
  { id: "power3.inOut", label: "Power 3 In Out", path: "power3.inOut" },
  { id: "power4.in", label: "Power 4 In", path: "power4.in" },
  { id: "power4.out", label: "Power 4 Out", path: "power4.out" },
  { id: "power4.inOut", label: "Power 4 In Out", path: "power4.inOut" },
  { id: "back.in", label: "Back In", path: "back.in" },
  { id: "back.out", label: "Back Out", path: "back.out" },
  { id: "back.inOut", label: "Back In Out", path: "back.inOut" },
  { id: "elastic.in", label: "Elastic In", path: "elastic.in" },
  { id: "elastic.out", label: "Elastic Out", path: "elastic.out" },
  { id: "elastic.inOut", label: "Elastic In Out", path: "elastic.inOut" },
  { id: "bounce.in", label: "Bounce In", path: "bounce.in" },
  { id: "bounce.out", label: "Bounce Out", path: "bounce.out" },
  { id: "bounce.inOut", label: "Bounce In Out", path: "bounce.inOut" },
  { id: "circ.in", label: "Circ In", path: "circ.in" },
  { id: "circ.out", label: "Circ Out", path: "circ.out" },
  { id: "circ.inOut", label: "Circ In Out", path: "circ.inOut" },
  { id: "expo.in", label: "Expo In", path: "expo.in" },
  { id: "expo.out", label: "Expo Out", path: "expo.out" },
  { id: "expo.inOut", label: "Expo In Out", path: "expo.inOut" },
  { id: "sine.in", label: "Sine In", path: "sine.in" },
  { id: "sine.out", label: "Sine Out", path: "sine.out" },
  { id: "sine.inOut", label: "Sine In Out", path: "sine.inOut" },
];

export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const clampX = (n: number) => Math.max(0, Math.min(1, n));
  const clampY = (n: number) => Math.max(-0.5, Math.min(1.5, n));
  const cx1 = clampX(x1);
  const cy1 = clampY(y1);
  const cx2 = clampX(x2);
  const cy2 = clampY(y2);
  return `cubic-bezier(${cx1}, ${cy1}, ${cx2}, ${cy2})`;
}

export function isCubicBezier(str: string): boolean {
  const regex = /^cubic-bezier\(\s*([0-9.]+)\s*,\s*(-?[0-9.]+)\s*,\s*([0-9.]+)\s*,\s*(-?[0-9.]+)\s*\)$/;
  return regex.test(str.trim());
}

export function parseEasing(str: string): EasingParsed {
  const trimmed = str.trim();

  if (isCubicBezier(trimmed)) {
    const regex = /^cubic-bezier\(\s*([0-9.]+)\s*,\s*(-?[0-9.]+)\s*,\s*([0-9.]+)\s*,\s*(-?[0-9.]+)\s*\)$/;
    const match = trimmed.match(regex);
    if (match) {
      const [, x1, y1, x2, y2] = match;
      return {
        type: "cubicBezier",
        value: [
          parseFloat(x1),
          parseFloat(y1),
          parseFloat(x2),
          parseFloat(y2),
        ],
      };
    }
  }

  const gsapIds = new Set(EASE_LIST.map((e) => e.id));
  if (gsapIds.has(trimmed)) {
    return { type: "gsap", value: trimmed };
  }

  return { type: "gsap", value: "power2.out" };
}
