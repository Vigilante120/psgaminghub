"use client";

// − 2 + control for how many copies to buy. max already includes the stock limit.
export default function QtyStepper({
  value,
  max,
  onChange,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  size?: "sm" | "md";
}) {
  const btn =
    size === "sm"
      ? "grid h-8 w-8 place-items-center text-base"
      : "grid h-11 w-11 place-items-center text-lg";
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-ink/60">
      <button
        type="button"
        className={`${btn} rounded-l-xl text-muted transition hover:text-white active:scale-90 disabled:opacity-30`}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="One fewer copy"
      >
        −
      </button>
      <span className={`min-w-8 text-center font-display font-bold tabular-nums ${size === "sm" ? "text-sm" : "text-base"}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${btn} rounded-r-xl text-muted transition hover:text-white active:scale-90 disabled:opacity-30`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="One more copy"
      >
        +
      </button>
    </div>
  );
}
