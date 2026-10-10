'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import clsx from 'clsx';

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  ariaValueText?: (v: number) => string;
  ariaLabel?: string;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      value,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      ariaValueText,
      ariaLabel,
      ...props
    },
    ref,
  ) => {
    const initialValue = React.useRef(value[0] ?? min);
    const [inputValue, setInputValue] = React.useState<string>(
      String(value[0] ?? min),
    );

    React.useEffect(() => {
      setInputValue(String(value[0] ?? min));
    }, [value, min]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInputValue(raw);
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        const clamped = Math.min(max, Math.max(min, num));
        onValueChange([clamped]);
      }
    };

    const handleInputBlur = () => {
      setInputValue(String(value[0] ?? min));
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
    };

    const handleDoubleClick = () => {
      onValueChange([initialValue.current]);
    };

    const ariaValueNow = value[0] ?? 0;
    const ariaValuetext = ariaValueText
      ? ariaValueText(ariaValueNow)
      : String(ariaValueNow);

    return (
      <div className={clsx('flex items-center gap-3 w-full', className)}>
        <SliderPrimitive.Root
          ref={ref}
          className={clsx(
            'relative flex w-full touch-none select-none items-center focus-visible:outline-none',
            disabled && 'opacity-50 pointer-events-none',
          )}
          value={value}
          onValueChange={onValueChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-valuetext={ariaValuetext}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[--line]">
            <SliderPrimitive.Range className="absolute h-full bg-[--accent]" />
          </SliderPrimitive.Track>
          {value.map((_, index) => (
            <SliderPrimitive.Thumb
              key={index}
              className="block w-4 h-4 rounded-full bg-[--text] border-2 border-[--panel] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent]"
              aria-label={ariaLabel ?? `Value ${index + 1}`}
            />
          ))}
        </SliderPrimitive.Root>
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onDoubleClick={handleDoubleClick}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={ariaLabel ? `${ariaLabel} value input` : 'Slider value input'}
          className="w-16 h-8 rounded-md border border-[--line] bg-[--panel] px-2 text-right text-sm text-[--text] font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg] focus-visible:ring-[--accent] disabled:opacity-50"
        />
      </div>
    );
  },
);

Slider.displayName = 'Slider';

export { Slider };
