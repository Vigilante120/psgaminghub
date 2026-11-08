"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

// Search box for the admin products list. Filters as you type by updating ?q=,
// so the results survive opening a game and pressing Back. "/" focuses it.
export default function ProductSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === (params.get("q") ?? "")) return;
      startTransition(() => router.replace(next ? `${pathname}?q=${encodeURIComponent(next)}` : pathname, { scroll: false }));
    }, 250);
    return () => clearTimeout(t);
  }, [q, params, pathname, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative mt-5">
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={input}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setQ("")}
        placeholder="Search products by name…  ( / )"
        aria-label="Search products"
        className="input pl-10 pr-10"
        autoComplete="off"
        enterKeyHint="search"
      />
      {pending && (
        <span className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-brand-2 border-t-transparent" aria-hidden="true" />
      )}
    </div>
  );
}
