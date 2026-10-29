// Decorative composition for the home hero: an arch with the store monogram
// and a line-drawn sprig. Purely ornamental (no product is depicted), so it
// is hidden from assistive technology.

const leaves = [
  { x: 118, y: 418, r: -70 },
  { x: 128, y: 392, r: 200 },
  { x: 146, y: 366, r: -55 },
  { x: 160, y: 340, r: 215 },
  { x: 182, y: 318, r: -40 },
  { x: 198, y: 296, r: 230 },
];

export function HeroArt() {
  return (
    <svg
      viewBox="0 0 400 500"
      aria-hidden
      focusable="false"
      className="h-auto w-full"
    >
      <path d="M0 500V200a200 200 0 0 1 400 0v300z" fill="var(--rose-light)" />
      <path
        d="M26 500V204a174 174 0 0 1 348 0v296"
        fill="none"
        stroke="var(--rose)"
        strokeWidth="1"
      />
      <text
        x="212"
        y="388"
        textAnchor="middle"
        fill="var(--accent)"
        style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontWeight: 500, fontSize: 300 }}
      >
        B
      </text>

      <g fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M96 500c8-60 34-118 74-168s58-66 66-80" />
        {leaves.map(({ x, y, r }) => (
          <path
            key={`${x}-${y}`}
            d="M0 0c9-11 27-12 38 0-11 12-29 11-38 0z"
            transform={`translate(${x} ${y}) rotate(${r})`}
          />
        ))}
        <path d="M236 252c6-10 14-16 24-18" />
      </g>

      <circle cx="350" cy="96" r="30" fill="var(--accent)" />
      <circle cx="350" cy="96" r="44" fill="none" stroke="var(--rose)" strokeWidth="1" />
      <circle cx="58" cy="168" r="4" fill="var(--rose)" />
    </svg>
  );
}
