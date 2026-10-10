import { useState } from 'react';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  unit?: string;
};

export default function NumberField({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  className = '',
  placeholder = '',
  unit,
}: Props) {
  const [input, setInput] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const validate = (raw: string) => {
    const num = parseFloat(raw);
    if (!isNaN(num) && isFinite(num)) {
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
      setInput(String(Math.round(clamped * 1000) / 1000));
    } else {
      setInput(String(Math.round(value * 1000) / 1000));
    }
  };

  const display = focused ? input : String(Math.round(value * 1000) / 1000);

  return (
    <div
      className={
        'flex items-center gap-1 h-8 w-16 border border-[--line] rounded bg-[--bg] px-2 text-sm ' +
        className
      }
    >
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={display}
        placeholder={placeholder}
        onFocus={() => {
          setFocused(true);
          setInput(String(Math.round(value * 1000) / 1000));
        }}
        onBlur={() => {
          setFocused(false);
          validate(input);
        }}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="bg-transparent border-0 outline-none w-full text-right text-[--text] text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {unit && (
        <span className="text-[10px] text-[--dim] font-mono uppercase shrink-0">
          {unit}
        </span>
      )}
    </div>
  );
}
