import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

export const buttonStyles = {
  primary: `${base} bg-accent text-accent-foreground hover:bg-accent-hover disabled:hover:bg-accent`,
  secondary: `${base} border border-accent/30 bg-transparent text-accent hover:border-accent hover:bg-accent-soft`,
  /** Low-emphasis action: underlined wine text, no box. */
  text: "inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline decoration-rose/60 underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-accent",
};

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return <Link className={`${buttonStyles[variant]} ${className}`} {...props} />;
}
