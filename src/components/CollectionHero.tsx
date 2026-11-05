// Banner at the top of a collection page: glowing panel, drifting controller shapes,
// two-tone title and quick facts. Server component; the motion is pure CSS.

const SHAPES = [
  // [shape, colour, position/size classes, delay, base rotation]
  ["triangle", "#36d6ff", "hidden sm:block right-[30%] top-6 h-20 w-20", "0s", "-8deg"],
  ["circle", "#ff3d6e", "right-[8%] top-4 h-16 w-16 sm:h-24 sm:w-24", "-2s", "0deg"],
  ["cross", "#2f6bff", "hidden sm:block right-[20%] bottom-4 h-16 w-16", "-4s", "12deg"],
  ["square", "#8b5cf6", "right-[4%] bottom-6 h-10 w-10 sm:h-14 sm:w-14", "-1s", "18deg"],
] as const;

function Shape({ kind, color }: { kind: (typeof SHAPES)[number][0]; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_0_14px_currentColor]" style={{ color }} aria-hidden="true">
      {kind === "triangle" && <path d="M50 14 88 82H12z" {...common} />}
      {kind === "circle" && <circle cx="50" cy="50" r="36" {...common} />}
      {kind === "cross" && <path d="M20 20l60 60M80 20 20 80" {...common} />}
      {kind === "square" && <rect x="16" y="16" width="68" height="68" rx="6" {...common} />}
    </svg>
  );
}

export default function CollectionHero({ label, blurb, count }: { label: string; blurb: string; count: number }) {
  // Last word in the brand gradient: "PLAYSTATION GAMES" → PLAYSTATION + GAMES
  const words = label.split(" ");
  const last = words.pop();

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-line bg-panel px-5 py-7 sm:px-10 sm:py-12">
      {/* Glows and grid */}
      <div className="absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 right-10 -z-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" aria-hidden="true" />
      <div className="bg-grid absolute inset-0 -z-10 [mask-image:linear-gradient(to_right,transparent,black_60%)]" aria-hidden="true" />

      {/* Controller shapes: faint on phones so they never fight the title */}
      <div className="absolute inset-y-0 right-0 -z-10 w-full opacity-30 sm:w-1/2 sm:opacity-70" aria-hidden="true">
        {SHAPES.map(([kind, color, pos, delay, rot]) => (
          <div
            key={kind}
            className={`animate-drift absolute ${pos}`}
            style={{ animationDelay: delay, ["--r" as string]: rot, transform: `rotate(${rot})` }}
          >
            <Shape kind={kind} color={color} />
          </div>
        ))}
      </div>

      <p className="inline-flex items-center gap-2 rounded-full border border-brand-2/30 bg-brand-2/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-2 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-2" />
        </span>
        Collection · {count} {count === 1 ? "game" : "games"}
      </p>

      <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold uppercase leading-[0.95] tracking-wide sm:text-6xl md:text-7xl">
        {words.join(" ")} <span className="text-gradient">{last}</span>
      </h1>
      <p className="mt-3 max-w-xl text-muted sm:text-lg">{blurb}</p>

      <ul className="mt-6 flex flex-wrap gap-2 text-xs font-semibold sm:text-sm">
        {["🎮 PS5 & PS4", "🔑 Primary · Secondary", "⏳ Rent for 30 days", "⚡ Pay with UPI"].map((t) => (
          <li key={t} className="rounded-full border border-line bg-ink/60 px-3 py-1.5 backdrop-blur">
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
