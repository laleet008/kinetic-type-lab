'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import clsx from 'clsx';

interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, checked, onCheckedChange, label, ...props }, ref) => (
  <div className="flex items-center gap-3">
    <SwitchPrimitives.Root
      className={clsx(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[--line] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[--accent]',
        className,
      )}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={props['aria-label'] ?? label ?? undefined}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={clsx(
          'pointer-events-none block h-4 w-4 rounded-full bg-[--text] shadow-lg transition-transform will-change-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5',
        )}
      />
    </SwitchPrimitives.Root>
    {label ? (
      <span className="text-sm text-[--text] select-none">{label}</span>
    ) : null}
  </div>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
