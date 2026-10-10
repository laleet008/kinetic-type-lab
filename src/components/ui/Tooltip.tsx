'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import clsx from 'clsx';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={clsx(
      'z-50 overflow-hidden rounded-md border border-[--line] bg-[--panel] px-3 py-1.5 text-xs text-[--text] shadow-md',
      'animate-in fade-in-0 zoom-in-95',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
}

const Tooltip = ({
  children,
  content,
  side = 'top',
  sideOffset = 4,
}: TooltipProps) => (
  <TooltipProvider>
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </TooltipPrimitive.Root>
  </TooltipProvider>
);

export {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
};
