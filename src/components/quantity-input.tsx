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
    "flex size-10 items-center justify-center text-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-full border border-border bg-surface"
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
        className="w-10 [appearance:textfield] bg-transparent text-center text-sm font-semibold focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
