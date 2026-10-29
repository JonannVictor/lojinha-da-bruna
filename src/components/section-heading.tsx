import type { ReactNode } from "react";

/** Eyebrow + serif title, with an optional action aligned to the right. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-2 font-display text-3xl leading-tight font-medium sm:text-4xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
