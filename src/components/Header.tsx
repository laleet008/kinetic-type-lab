import { useState } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { Button } from "./ui/Button";
import { Toggle } from "./ui/Toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/Dialog";
import { useLabStore } from "../store/lab";
import type { Theme } from "../store/lab";
import { EXAMPLES } from "../store/examples";

export default function Header() {
  const { theme, setTheme, loadExample, resetAll, showToast } = useLabStore();
  const isDark = theme === "dark";
  const [resetOpen, setResetOpen] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast({
        title: "Share link copied!",
        description: "Paste it anywhere to share your creation.",
        variant: "success",
      });
    } catch (err) {
      showToast({
        title: "Couldn't copy link",
        description: err instanceof Error ? err.message : "Clipboard unavailable.",
        variant: "error",
      });
    }
  };

  const toggleTheme = () => {
    setTheme((isDark ? "light" : "dark") as Theme);
  };

  const entranceExamples = EXAMPLES.filter((e) => e.category === "Entrance");
  const loopExamples = EXAMPLES.filter((e) => e.category === "Loop");

  return (
    <header className="h-14 bg-[--panel] border-b border-[--line] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center">
        <span className="font-mono font-bold tracking-[0.2em] text-sm text-[--text]">
          KINETIC TYPE LAB
        </span>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <Button variant="ghost" size="sm" aria-label="Examples">
              <SparklesIcon />
              <span className="hidden sm:inline">Examples</span>
              <ChevronIcon />
            </Button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              sideOffset={6}
              className={clsx(
                "z-50 min-w-[240px] rounded-md border border-[--line] bg-[--panel] p-1.5 shadow-lg",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              )}
            >
              <DropdownMenuPrimitive.Label className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[--dim]">
                Entrance
              </DropdownMenuPrimitive.Label>
              {entranceExamples.map((ex) => (
                <DropdownMenuPrimitive.Item
                  key={ex.id}
                  onSelect={() => loadExample(ex.id)}
                  className={clsx(
                    "flex cursor-pointer flex-col gap-0.5 rounded-sm px-3 py-2 outline-none transition-colors",
                    "focus:bg-[--line] focus:text-[--text] hover:bg-[--line]",
                  )}
                >
                  <span className="text-sm font-medium text-[--text]">{ex.name}</span>
                  <span className="text-[11px] text-[--dim]">{ex.description}</span>
                </DropdownMenuPrimitive.Item>
              ))}
              <DropdownMenuPrimitive.Separator className="my-1.5 h-px bg-[--line]" />
              <DropdownMenuPrimitive.Label className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[--dim]">
                Loop
              </DropdownMenuPrimitive.Label>
              {loopExamples.map((ex) => (
                <DropdownMenuPrimitive.Item
                  key={ex.id}
                  onSelect={() => loadExample(ex.id)}
                  className={clsx(
                    "flex cursor-pointer flex-col gap-0.5 rounded-sm px-3 py-2 outline-none transition-colors",
                    "focus:bg-[--line] focus:text-[--text] hover:bg-[--line]",
                  )}
                >
                  <span className="text-sm font-medium text-[--text]">{ex.name}</span>
                  <span className="text-[11px] text-[--dim]">{ex.description}</span>
                </DropdownMenuPrimitive.Item>
              ))}
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>

        <Button
          variant="ghost"
          size="sm"
          aria-label="Reset"
          onClick={() => setResetOpen(true)}
        >
          <ResetIcon />
          <span className="hidden sm:inline">Reset</span>
        </Button>

        <Button variant="ghost" size="sm" aria-label="About">
          About
        </Button>
        <Toggle
          pressed={isDark}
          onPressedChange={toggleTheme}
          variant="small"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </Toggle>
        <Button variant="primary" size="sm" aria-label="Share" onClick={handleShare}>
          <ShareIcon />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to defaults?</DialogTitle>
            <DialogDescription>
              This will clear the current text, font, preset, and mode settings and
              return everything to the original lab state.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetAll();
                setResetOpen(false);
              }}
            >
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="absolute left-0 right-0 top-14 h-px bg-[--line] pointer-events-none" />
    </header>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 10 9 10" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
