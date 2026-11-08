"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import { cancelUnpaidOrders } from "./actions";

// Bulk cancel for the "Awaiting payment" tab: tick orders (or pick all / older than a day)
// and cancel them in one go. Cancelling puts their stock back.

type Row = { id: string; createdAt: string };
type Ctx = { selected: Set<string>; toggle: (id: string) => void; enabled: boolean };

const BulkCtx = createContext<Ctx>({ selected: new Set(), toggle: () => {}, enabled: false });

const DAY = 24 * 60 * 60 * 1000;

export function BulkCancelProvider({ rows, children }: { rows: Row[]; children: React.ReactNode }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Drop ticks for orders that are no longer on the page (paid or cancelled since).
  const visible = new Set(rows.map((r) => r.id));
  const picked = [...selected].filter((id) => visible.has(id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allPicked = rows.length > 0 && picked.length === rows.length;
  const old = rows.filter((r) => Date.now() - new Date(r.createdAt).getTime() > DAY);

  function cancel() {
    if (picked.length === 0 || pending) return;
    const n = picked.length;
    if (!confirm(`Cancel ${n} unpaid order${n === 1 ? "" : "s"}? Their stock goes back on sale.`)) return;
    setMessage(null);
    startTransition(async () => {
      const res = await cancelUnpaidOrders(picked);
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error });
        return;
      }
      const skipped = n - res.cancelled;
      setMessage({
        tone: "ok",
        text:
          `Cancelled ${res.cancelled} order${res.cancelled === 1 ? "" : "s"}.` +
          (skipped > 0 ? ` ${skipped} skipped because they're no longer awaiting payment.` : ""),
      });
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <BulkCtx.Provider value={{ selected, toggle, enabled: true }}>
      {rows.length > 0 && (
        <div className="sticky top-16 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel-2/95 p-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setSelected(allPicked ? new Set() : new Set(rows.map((r) => r.id)))}
            className="btn btn-ghost min-h-11 px-4 py-2 text-sm lg:min-h-0"
          >
            {allPicked ? "Clear selection" : `Select all (${rows.length})`}
          </button>
          {old.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set(old.map((r) => r.id)))}
              className="btn btn-ghost min-h-11 px-4 py-2 text-sm lg:min-h-0"
            >
              Older than 1 day ({old.length})
            </button>
          )}
          <span className="text-sm text-muted">{picked.length} selected</span>
          <button
            type="button"
            onClick={cancel}
            disabled={picked.length === 0 || pending}
            className="btn ml-auto min-h-11 bg-hot px-4 py-2 text-sm text-white hover:bg-hot/90 disabled:cursor-not-allowed disabled:opacity-40 lg:min-h-0"
          >
            {pending ? "Cancelling…" : `Cancel selected${picked.length ? ` (${picked.length})` : ""}`}
          </button>
          {message && (
            <p role="status" className={`w-full text-sm ${message.tone === "ok" ? "text-emerald-300" : "text-hot"}`}>
              {message.text}
            </p>
          )}
        </div>
      )}
      {children}
    </BulkCtx.Provider>
  );
}

/** Tick box for one order. Renders nothing outside the bulk-cancel tab. */
export function SelectBox({ id, label }: { id: string; label: string }) {
  const { selected, toggle, enabled } = useContext(BulkCtx);
  if (!enabled) return null;
  return (
    <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={selected.has(id)}
        onChange={() => toggle(id)}
        aria-label={`Select ${label}`}
        className="h-5 w-5 cursor-pointer accent-hot"
      />
    </label>
  );
}
