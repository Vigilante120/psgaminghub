"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import { useCart } from "./CartContext";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/collections/playstation-games", label: "PlayStation Games" },
  { href: "/#slots", label: "Primary vs Secondary" },
  { href: "/#how-it-works", label: "How it works" },
];

export default function Header({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setMenu(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <button
          className="grid h-10 w-10 place-items-center rounded-lg border border-line lg:hidden"
          onClick={() => setMenu((m) => !m)}
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {menu ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <Logo />

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href.split("#")[0]) && !n.href.startsWith("/#");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white/5 text-white" : "text-muted hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={onSearch} className="hidden md:block">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games…"
              className="input h-10 w-56 py-0 text-sm"
              aria-label="Search games"
            />
          </form>

          {isAdmin && (
            <Link href="/admin" className="btn btn-ghost hidden h-10 px-3 text-xs sm:inline-flex">
              Admin
            </Link>
          )}

          <Link
            href={signedIn ? "/orders" : "/login"}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line hover:border-[#33405f]"
            aria-label={signedIn ? "My orders" : "Sign in"}
            title={signedIn ? "My orders" : "Sign in"}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          </Link>

          <button
            onClick={() => setOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-lg border border-line hover:border-[#33405f]"
            aria-label="Open cart"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6.2" />
              <circle cx="10" cy="20" r="1.3" />
              <circle cx="17" cy="20" r="1.3" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-hot px-1 text-[11px] font-bold">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {menu && (
        <div className="border-t border-line bg-ink px-4 pb-4 lg:hidden">
          <form onSubmit={onSearch} className="pt-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games…" className="input" />
          </form>
          <nav className="mt-2 grid">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className="border-b border-line/60 py-3 text-sm">
                {n.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMenu(false)} className="py-3 text-sm text-brand-2">
                Admin panel
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
