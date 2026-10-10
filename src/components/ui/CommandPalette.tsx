import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import clsx from 'clsx';
import { useLabStore, type Theme } from '../../store/lab';
import { useUIStore } from '../../store/ui';
import { PRESETS, getPresetDefaults, type Preset } from '../../presets';
import { FONTS_ARRAY, type FontFamily } from '../../lib/fonts';
import { EXAMPLES } from '../../store/examples';

type CommandGroup = 'PRESETS' | 'FONTS' | 'MODES' | 'EXPORT' | 'APP';

type CommandItem = {
  id: string;
  group: CommandGroup;
  name: string;
  shortcut?: string;
  icon?: string;
  run: () => void;
};

function BulletIcon(): JSX.Element {
  return <span className="text-[--dim] text-lg leading-none">&middot;</span>;
}

function PresetIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[--dim]">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function FontIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[--dim]">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function ModeIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[--dim]">
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="m4.93 4.93 2.83 2.83" />
      <path d="m16.24 16.24 2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="m4.93 19.07 2.83-2.83" />
      <path d="m16.24 7.76 2.83-2.83" />
    </svg>
  );
}

function ExportIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[--dim]">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function AppIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[--dim]">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function buildCommands(
  copyCSS: () => Promise<void>,
  copyShareLink: () => Promise<void>
): CommandItem[] {
  const commands: CommandItem[] = [];
  const lab = useLabStore.getState;
  const ui = useUIStore.setState;

  PRESETS.forEach((preset: Preset, i: number) => {
    const num = i + 1;
    commands.push({
      id: `preset-${preset.id}`,
      group: 'PRESETS',
      name: `Apply ${preset.name}`,
      shortcut: num <= 9 ? `⌘${num}` : undefined,
      icon: 'preset',
      run: () => lab().setPreset(preset.id, getPresetDefaults(preset)),
    });
  });

  FONTS_ARRAY.forEach((font: FontFamily) => {
    commands.push({
      id: `font-${font.id}`,
      group: 'FONTS',
      name: `Use ${font.name}`,
      icon: 'font',
      run: () => lab().setFont(font.id),
    });
  });

  commands.push({
    id: 'mode-cursor-weight',
    group: 'MODES',
    name: 'Toggle Cursor Weight',
    icon: 'mode',
    run: () => lab().toggleMode('cursorWeightMode'),
  });
  commands.push({
    id: 'mode-physics',
    group: 'MODES',
    name: 'Toggle Physics',
    icon: 'mode',
    run: () => lab().toggleMode('physicsMode'),
  });
  commands.push({
    id: 'mode-text-path',
    group: 'MODES',
    name: 'Toggle Text Path',
    icon: 'mode',
    run: () => lab().toggleMode('textPathMode'),
  });

  commands.push({
    id: 'export-gif',
    group: 'EXPORT',
    name: 'Export GIF',
    icon: 'export',
    run: () => {
      ui({ exportDialogOpen: true });
      setTimeout(() => {
        const trigger = document.querySelector<HTMLButtonElement>('[data-state="inactive"][value="gif"]');
        trigger?.click();
      }, 0);
    },
  });
  commands.push({
    id: 'export-video',
    group: 'EXPORT',
    name: 'Export Video',
    icon: 'export',
    run: () => {
      ui({ exportDialogOpen: true });
      setTimeout(() => {
        const trigger = document.querySelector<HTMLButtonElement>('[data-state="inactive"][value="video"]');
        trigger?.click();
      }, 0);
    },
  });
  commands.push({
    id: 'export-copy-css',
    group: 'EXPORT',
    name: 'Copy CSS',
    shortcut: '⌘C',
    icon: 'export',
    run: () => void copyCSS(),
  });
  commands.push({
    id: 'export-share',
    group: 'EXPORT',
    name: 'Share link',
    icon: 'export',
    run: () => void copyShareLink(),
  });

  EXAMPLES.forEach((ex) => {
    commands.push({
      id: `app-example-${ex.id}`,
      group: 'APP',
      name: `Load: ${ex.name}`,
      icon: 'app',
      run: () => lab().loadExample(ex.id),
    });
  });

  commands.push({
    id: 'app-reset',
    group: 'APP',
    name: 'Reset',
    icon: 'app',
    run: () => lab().resetAll(),
  });
  commands.push({
    id: 'app-theme',
    group: 'APP',
    name: 'Toggle theme',
    icon: 'app',
    run: () => {
      const s = lab();
      s.setTheme((s.theme === 'dark' ? 'light' : 'dark') as Theme);
    },
  });
  commands.push({
    id: 'app-grid',
    group: 'APP',
    name: 'Toggle grid',
    icon: 'app',
    run: () => {
      const s = lab();
      s.setShowGrid(!s.showGrid);
    },
  });
  commands.push({
    id: 'app-safe-area',
    group: 'APP',
    name: 'Toggle safe area',
    icon: 'app',
    run: () => {
      const s = lab();
      s.setShowSafeArea(!s.showSafeArea);
    },
  });

  return commands;
}

function GroupIcon({ kind }: { kind: string }): JSX.Element {
  switch (kind) {
    case 'preset':
      return <PresetIcon />;
    case 'font':
      return <FontIcon />;
    case 'mode':
      return <ModeIcon />;
    case 'export':
      return <ExportIcon />;
    case 'app':
      return <AppIcon />;
    default:
      return <BulletIcon />;
  }
}

const GROUP_ORDER: CommandGroup[] = ['PRESETS', 'FONTS', 'MODES', 'EXPORT', 'APP'];

type GroupedResult = { group: CommandGroup; items: CommandItem[] };

function groupResults(items: CommandItem[]): GroupedResult[] {
  const map = new Map<CommandGroup, CommandItem[]>();
  for (const it of items) {
    if (!map.has(it.group)) map.set(it.group, []);
    map.get(it.group)!.push(it);
  }
  return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
    group: g,
    items: map.get(g)!,
  }));
}

type Props = {
  copyCSS: () => Promise<void>;
  copyShareLink: () => Promise<void>;
};

export function CommandPalette({ copyCSS, copyShareLink }: Props) {
  const open = useLabStore((s) => s.showCommandPalette);
  const toggleCommandPalette = useLabStore((s) => s.toggleCommandPalette);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<number>(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      selectedRef.current = 0;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allCommands = useMemo(
    () => buildCommands(copyCSS, copyShareLink),
    [copyCSS, copyShareLink]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 15);
  }, [allCommands, query]);

  const flat: CommandItem[] = filtered;

  useEffect(() => {
    if (selected >= flat.length) {
      setSelected(Math.max(0, flat.length - 1));
      selectedRef.current = Math.max(0, flat.length - 1);
    }
  }, [flat.length, selected]);

  const grouped = useMemo(() => groupResults(filtered), [filtered]);

  function runAt(idx: number) {
    const cmd = flat[idx];
    if (!cmd) return;
    cmd.run();
    toggleCommandPalette();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(flat.length - 1, selectedRef.current + 1);
      setSelected(next);
      selectedRef.current = next;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(0, selectedRef.current - 1);
      setSelected(next);
      selectedRef.current = next;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runAt(selectedRef.current);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      toggleCommandPalette();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const current = flat[selectedRef.current];
      if (!current) return;
      const dir = e.shiftKey ? -1 : 1;
      let currentGroupIdx = GROUP_ORDER.indexOf(current.group);
      currentGroupIdx =
        (currentGroupIdx + dir + GROUP_ORDER.length) % GROUP_ORDER.length;
      for (let tries = 0; tries < GROUP_ORDER.length; tries++) {
        const target = GROUP_ORDER[currentGroupIdx];
        const firstIdx = flat.findIndex((c) => c.group === target);
        if (firstIdx >= 0) {
          setSelected(firstIdx);
          selectedRef.current = firstIdx;
          break;
        }
        currentGroupIdx =
          (currentGroupIdx + dir + GROUP_ORDER.length) % GROUP_ORDER.length;
      }
    }
  }

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${selected}"]`
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selected, open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={toggleCommandPalette}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[20vh] z-50 w-[600px] max-w-[90vw] -translate-x-1/2 rounded-lg border border-[--line] bg-[--panel] shadow-2xl overflow-hidden
          data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
              selectedRef.current = 0;
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="h-12 bg-[--bg] border-b border-[--line] w-full px-4 text-sm text-[--text] placeholder:text-[--dim] outline-none focus:outline-none"
            autoFocus
          />
          <ScrollArea.Root className="h-[min(400px,60vh)] w-full">
            <ScrollArea.Viewport className="w-full h-full">
              <div ref={listRef} className="py-2">
                {grouped.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[--dim]">
                    No commands found
                  </div>
                ) : (
                  grouped.map(({ group, items }) => (
                    <div key={group} className="mb-1">
                      <div className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[--dim]">
                        {group}
                      </div>
                      <div className="px-2">
                        {items.map((cmd) => {
                          const idx = flat.indexOf(cmd);
                          const isSel = idx === selected;
                          return (
                            <button
                              key={cmd.id}
                              data-idx={idx}
                              data-selected={isSel}
                              onMouseEnter={() => {
                                setSelected(idx);
                                selectedRef.current = idx;
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                              }}
                              onClick={() => runAt(idx)}
                              className={clsx(
                                'h-10 w-full flex items-center px-3 rounded-md text-sm cursor-default border-l-2 border-transparent text-left',
                                'hover:bg-[--line] text-[--text]',
                                isSel &&
                                  'bg-[--line] border-l-[--accent]'
                              )}
                            >
                              <div className="w-5 flex items-center justify-center mr-2 shrink-0">
                                <GroupIcon kind={cmd.icon ?? ''} />
                              </div>
                              <span className="flex-1 truncate">{cmd.name}</span>
                              {cmd.shortcut && (
                                <span className="font-mono text-[10px] text-[--dim] uppercase tracking-wider bg-[--panel] border border-[--line] px-2 py-0.5 rounded ml-3 shrink-0">
                                  {cmd.shortcut}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex select-none touch-none p-0.5 w-2.5 bg-transparent"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-[--line]" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
          <div className="h-9 border-t border-[--line] flex items-center justify-between px-4 text-[10px] font-mono text-[--dim]">
            <div className="flex gap-3">
              <span>
                <kbd className="px-1 py-0.5 border border-[--line] rounded bg-[--bg]">↑</kbd>
                <kbd className="px-1 py-0.5 border border-[--line] rounded bg-[--bg] ml-1">↓</kbd>
                <span className="ml-1.5">navigate</span>
              </span>
              <span>
                <kbd className="px-1 py-0.5 border border-[--line] rounded bg-[--bg]">↵</kbd>
                <span className="ml-1.5">run</span>
              </span>
            </div>
            <div className="flex gap-3">
              <span>
                <kbd className="px-1 py-0.5 border border-[--line] rounded bg-[--bg]">⎋</kbd>
                <span className="ml-1.5">close</span>
              </span>
              <span>
                <kbd className="px-1 py-0.5 border border-[--line] rounded bg-[--bg]">Tab</kbd>
                <span className="ml-1.5">sections</span>
              </span>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
