import { SECONDARY_WARNING, SLOTS } from "@/lib/store";

/** Explains the Primary, Secondary and Rent slots, with the Secondary internet warning. */
export default function SlotInfo({ compact = false, showRent = true }: { compact?: boolean; showRent?: boolean }) {
  const slots = showRent ? SLOTS : SLOTS.filter((s) => s.slot !== "Rent");
  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${compact ? "" : slots.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {slots.map((s, i) => (
          <div key={s.slot} className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/15 font-display text-sm font-bold text-brand-2">
                {i + 1}
              </span>
              <h3 className="font-display text-lg font-bold uppercase tracking-wide">{s.title}</h3>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              {s.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-brand-2">•</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
        ⚠️ <b>Secondary slot and Rent:</b> {SECONDARY_WARNING}
      </p>
    </div>
  );
}
