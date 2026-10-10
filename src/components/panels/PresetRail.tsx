import { useLabStore } from '../../store/lab';
import { Button } from '../ui/Button';
import clsx from 'clsx';
import { PRESETS, PRESET_CATEGORIES, getPresetDefaults, type Preset, type PresetCategory, type RangeParam } from '../../presets';

function Thumb({ name }: { name: string }) {
  const letters = (name.slice(0, 3) || 'XYZ').toUpperCase();
  return (
    <div className="w-8 h-8 rounded border border-[--line] flex items-center justify-center font-mono text-[8px] overflow-hidden text-[--dim]">
      {letters}
    </div>
  );
}

function randomizeParams(preset: Preset): Record<string, number | string | boolean> {
  const out: Record<string, number | string | boolean> = {};
  for (const spec of preset.params) {
    if (spec.type === 'range') {
      const r = spec as RangeParam;
      const val = r.min + Math.random() * (r.max - r.min);
      const stepped = Math.round(val / r.step) * r.step;
      out[spec.id] = Math.round(stepped * 1000) / 1000;
    } else {
      out[spec.id] = spec.default;
    }
  }
  return out;
}

export default function PresetRail() {
  const { presetSearch, setPresetSearch, presetId, setPreset } = useLabStore();

  const q = presetSearch.trim().toLowerCase();

  const grouped = new Map<PresetCategory, Preset[]>();
  for (const cat of PRESET_CATEGORIES) grouped.set(cat, []);
  for (const p of PRESETS) {
    if (q && !p.name.toLowerCase().includes(q)) continue;
    const arr = grouped.get(p.category);
    if (arr) arr.push(p);
  }

  const handleClick = (preset: Preset) => {
    setPreset(preset.id, getPresetDefaults(preset));
  };

  const handleRandom = () => {
    if (PRESETS.length === 0) return;
    const pick = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    setPreset(pick.id, randomizeParams(pick));
  };

  return (
    <aside className="w-[240px] shrink-0 h-full bg-[--panel] border-r border-[--line] flex flex-col">
      <div className="p-3">
        <input
          type="text"
          value={presetSearch}
          onChange={(e) => setPresetSearch(e.target.value)}
          placeholder="Search presets…"
          className="w-full bg-[--bg] border border-[--line] rounded-md px-3 py-2 text-sm placeholder:text-[--dim] text-[--text] focus:outline-none focus:ring-2 focus:ring-[--accent] focus:border-transparent"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {PRESET_CATEGORIES.map((category) => {
          const list = grouped.get(category) ?? [];
          return (
            <div key={category}>
              <div className="font-mono uppercase text-[10px] text-[--dim] mt-4 mb-2 tracking-wider">
                {category}
              </div>
              <div className="space-y-0.5">
                {list.map((preset) => {
                  const active = preset.id === presetId;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleClick(preset)}
                      className={clsx(
                        'flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                        active
                          ? 'bg-[--line] border-l-2 border-[--accent] pl-[10px]'
                          : 'bg-transparent hover:bg-[--line]',
                      )}
                    >
                      <Thumb name={preset.name} />
                      <span className="text-[--text] truncate">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-[--line]">
        <Button variant="secondary" size="sm" className="w-full" onClick={handleRandom}>
          Random
        </Button>
      </div>
    </aside>
  );
}
