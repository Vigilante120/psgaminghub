"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Launch popup for GTA VI: a live countdown and a "Book now" button that opens the
// search results for it. Shows once per visit (closing it keeps it closed until the
// browser tab is closed), never on admin, checkout, order or login pages.
// After launch it switches to "Out now" for a few days, then stops showing.

export const GTA_LAUNCH = {
  releaseAt: "2026-11-19T00:00:00+05:30", // 19 Nov 2026, 12:00 AM IST
  showOutNowUntil: "2026-11-23T00:00:00+05:30",
  searchHref: `/search?q=${encodeURIComponent("grand theft auto vi")}`,
  cover: "https://dlhdnvufopkbjynwwvke.supabase.co/storage/v1/object/public/product-images/grand-theft-auto-vi.webp",
};

const DISMISS_KEY = "psgh-gta6-popup-closed";
const HIDDEN_ON = ["/admin", "/checkout", "/orders", "/login", "/signup", "/search", "/auth"];

function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

export default function GtaCountdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const button = useRef<HTMLAnchorElement>(null);

  const release = new Date(GTA_LAUNCH.releaseAt).getTime();
  const outNowUntil = new Date(GTA_LAUNCH.showOutNowUntil).getTime();
  const released = now >= release;

  // Open shortly after the page loads, once per visit.
  useEffect(() => {
    if (Date.now() >= outNowUntil) return;
    if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Storage blocked (private mode): still show it, it just may show again.
    }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [pathname, outNowUntil]);

  // Tick every second while open.
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Escape closes, the page behind doesn't scroll, focus starts on "Book now".
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    button.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  if (!open) return null;
  const t = left(release - now);
  const units = [
    { label: "Days", value: t.days },
    { label: "Hours", value: t.hours },
    { label: "Mins", value: t.minutes },
    { label: "Secs", value: t.seconds },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="gta6-title">
      <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm animate-[fadeIn_.25s_ease-out]" />

      <div className="relative max-h-[100dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-line bg-panel shadow-2xl shadow-fuchsia-500/20 animate-[gtaUp_.35s_cubic-bezier(.2,.8,.2,1)] sm:rounded-3xl">
        <div className="relative h-44 shrink-0 sm:h-52 [@media(max-height:700px)]:h-28">
          <Image src={GTA_LAUNCH.cover} alt="Grand Theft Auto VI" fill sizes="448px" className="object-cover object-top" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/40 to-transparent" />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-lg text-white backdrop-blur transition hover:bg-black/80"
          >
            ✕
          </button>
          <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow">
            {released ? "Out now" : "Coming 19 Nov"}
          </span>
        </div>

        <div className="px-5 pb-6 pt-1 text-center sm:px-6">
          <h2 id="gta6-title" className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            {released ? (
              <>GTA VI is <span className="bg-gradient-to-r from-fuchsia-400 to-orange-300 bg-clip-text text-transparent">out now!</span></>
            ) : (
              <>GTA VI launches in</>
            )}
          </h2>

          {released ? (
            <p className="mt-2 text-sm text-muted">Get Grand Theft Auto VI on your PS5 today. Pay with UPI, fast delivery.</p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-4 gap-2" aria-live="off">
                {units.map((u) => (
                  <div key={u.label} className="rounded-xl border border-line bg-ink/60 py-3">
                    <div className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{String(u.value).padStart(2, "0")}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">{u.label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">
                19 Nov 2026 · 12:00 AM IST. Book your copy now and play on day one.
              </p>
            </>
          )}

          <Link
            ref={button}
            href={GTA_LAUNCH.searchHref}
            onClick={close}
            className="btn mt-5 w-full bg-gradient-to-r from-fuchsia-500 to-orange-400 py-3.5 text-base text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110"
          >
            {released ? "Buy now" : "Book now"} →
          </Link>
          <button type="button" onClick={close} className="mt-2 min-h-11 w-full text-sm text-muted hover:text-white">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
