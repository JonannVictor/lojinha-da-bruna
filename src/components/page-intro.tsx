import type { ReactNode } from "react";

/** Top of a storefront page: eyebrow, serif h1 and a short description. */
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl leading-tight font-medium sm:text-5xl">{title}</h1>
      {children && <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{children}</p>}
    </header>
  );
}
