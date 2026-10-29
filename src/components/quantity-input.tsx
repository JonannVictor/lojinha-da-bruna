"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  max: number;
  onChange: (value: number) => void;
  /** Accessible name, e.g. "Quantidade de Produto X". */
  label: string;
  min?: number;
};

export function QuantityInput({ value, max, onChange, label, min = 1 }: Props) {
  const buttonClass =
    "flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-foreground";

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-surface"
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Diminuir quantidade"
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label="Quantidade"
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          if (Number.isNaN(next)) return;
          onChange(Math.max(min, Math.min(next, max)));
        }}
        className="w-9 [appearance:textfield] bg-transparent text-center text-sm font-semibold tabular-nums focus-visible:rounded focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
