'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import clsx from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

const toggleVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md border border-[--line] bg-[--panel] text-sm font-mono uppercase tracking-wider text-[--dim] transition-all hover:text-[--text] data-[state=on]:bg-[--accent] data-[state=on]:text-[#0B0B0C] data-[state=on]:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'h-9 px-3',
        small: 'h-7 px-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface ToggleProps
  extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>,
    VariantProps<typeof toggleVariants> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: 'default' | 'small';
}

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  ToggleProps
>(({ className, variant, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={clsx(toggleVariants({ variant }), className)}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
