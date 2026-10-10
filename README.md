# Kinetic Type Lab

A single-screen typography animation playground: type text, pick from 12 animation presets, tune parameters, and export GIF / WebM (or MP4 via WebCodecs) / CSS + HTML / GSAP JS / React TSX / PNG. Everything is shareable via a URL hash that encodes the entire state.

Built as a portfolio-quality "foundry lab bench" dark studio tool with monospace labels, hairline rules, restrained palette, and all the personality lives on stage.

---

## 60-second demo path

1. Load the app. The stage is preloaded with **"Kinetic Type"** running the **Wave** preset.
2. Click the stage text and type something. Change fonts and size using the floating toolbar above the stage.
3. In the left rail pick a different preset: try **Glitch (Effect)** or **Variable Wave**.
4. Tune params in the right panel: for Variable Wave, try **axis = wght+wdth** and raise **wave speed**.
5. Toggle **Physics Mode** → letters fall. Shake them with the Shake button.
6. In the right panel toggle **Text on Path → Custom** → drag the bezier handles on stage.
7. Press **Space** to play / pause. **R** restarts. **←/→** step a frame.
8. Click **Export** → **GIF** → 15 fps → export. Or open Code tab and copy the React component.
9. Click **Share** → paste the URL into a new tab. The exact configuration loads.
10. Open **Examples** in the header → try **Neon Scramble** or **Heavy Drop**.

---

## Interesting technical bits

**The splitter (`src/lib/split.ts`)**
Uses `Intl.Segmenter({granularity:'grapheme'})` with a fallback to `Array.from()` so emoji ZWJ sequences like 👨‍👩‍👧 and regional flags 🇺🇸 are never torn. Lines are detected after layout by grouping words by `offsetTop` with a ±2px tolerance. Every span is `aria-hidden="true"` and the container retains an `aria-label` with the original string so screen readers get a clean read. Unit metadata (`normX`, `normY`, `distFromCenter`) is derived from bounding rects and used by presets for stagger math and center-origin effects. A ResizeObserver re-splits on container resize; teardownSplit kills GSAP tweens and restores plain text.

**Per-frame rasterizer (`src/lib/stageToCanvas.ts`)**
DOM → SVG foreignObject → canvas, but the trick is getting fonts to render without tainting. Before each export: fetch Google Fonts' CSS for every family currently in use (with a Chrome UA so we get WOFF2 URLs), download every `@font-face src:url(...)` WOFF2 as binary, base64-encode it, and rebuild the font rules as `data:font/woff2;base64,…` inlined inside `<defs><style>` of the SVG. All ~85 computed style properties (typography, layout, transforms) on every DOM node are inlined inline as `style.cssText` (we don't clone 500+ props — that explodes SVG size). Results are cached so 2nd+ frames are fast enough for 30 fps scrub captures on a 1080p stage.

**Self-rendering param system (`src/presets/index.ts` + ParamPanel)**
Each preset exports a typed `ParamSpec[]` discriminated union (`range | select | toggle | color | easing | string`). The right panel renders itself from the spec with zero per-preset UI code. A `ParamControl` dispatches on `spec.type`: range gets Radix Slider + a tiny NumberField + double-click-to-reset; select/easing get Radix Select or the EasingPicker curve editor; color gets a swatch Popover with 6 presets + hex input. Adding a preset is one new file + one import in the registry.

**Perf-preserving cursor weight mode (`src/modes/cursorWeight.ts`)**
Proximity-driven variable axes at 60 fps with 120 chars. All 5 event listeners (pointer/touch) are on the `window` (never per char). Per-char `gsap.quickSetter` are created once on enable, stored in a Map, and reused every frame. Every frame's writes are batched in a single `gsap.ticker` callback. Churn guard: DOM writes are skipped when `|value - lastWrite| < 0.05`, and with no pointer on stage the loop body is a single early-return (0 DOM writes / 0 allocations per frame).

**Zero-leak physics teardown (`src/modes/physics.ts` disable())**
Toggling the mode 20× in a row mustn't leak. In order: stop the Runner, clear the Engine, remove all bodies from the Composite world, remove every event listener with `Matter.Events.off`, disconnect the ResizeObserver, remove the visibility change handler, remove the MouseConstraint from the world and null out Mouse source events, restore every span's `style.transform` and delete the `__body` cross-reference so GC collects both bodies and spans, finally null every internal reference (engine / runner / walls array / mouseConstraint / mouse / initialCenters Map / resizeObserver / all 3 handler closures).

---

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview the build
npm test         # Vitest suites (split, urlState, codegen, easing)
npm run lint     # tsc --noEmit strict
```

## Deploy

Vercel: `vercel.json` is included. Push to GitHub → Import Project. Or CLI:
```bash
npm i -g vercel
vercel
```
Any static host works (the export is all client-side; no server required).
