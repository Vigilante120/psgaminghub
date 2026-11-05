"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { useCart } from "./CartContext";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/collections/playstation-games", label: "PlayStation Games" },
  { href: "/#slots", label: "Slots & Rent" },
  { href: "/#how-it-works", label: "How it works" },
];

const iconBtn =
  "relative grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line transition hover:border-[#33405f] hover:bg-white/5 active:scale-95 lg:h-10 lg:w-10";

export default function Header({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");

  // Close the menu on navigation and with Escape; stop the page scrolling behind it.
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [menu]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setMenu(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
          <button
            className={`${iconBtn} lg:hidden`}
            onClick={() => setMenu(true)}
            aria-label="Open menu"
            aria-expanded={menu}
            aria-controls="mobile-menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
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
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/5 active:scale-95 ${
                    active ? "bg-white/5 text-white" : "text-muted hover:text-white"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <form onSubmit={onSearch} className="hidden md:block">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search games…"
                className="input h-10 w-56 py-0 sm:text-sm"
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
              className={iconBtn}
              aria-label={signedIn ? "My orders" : "Sign in"}
              title={signedIn ? "My orders" : "Sign in"}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
            </Link>

            <button onClick={() => setOpen(true)} className={iconBtn} aria-label="Open cart">
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
      </header>

      {/* Mobile menu: slides in from the left, below lg. Outside <header>: its backdrop-blur would trap position: fixed. */}
      <div className={`fixed inset-0 z-50 overflow-hidden lg:hidden ${menu ? "" : "pointer-events-none"}`} aria-hidden={!menu}>
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${menu ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMenu(false)}
        />
        <aside
          id="mobile-menu"
          className={`absolute left-0 top-0 flex h-dvh w-[85%] max-w-xs flex-col border-r border-line bg-panel transition-transform duration-300 ${
            menu ? "translate-x-0" : "-translate-x-full"
          }`}
          inert={!menu}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-muted">Menu</span>
            <button onClick={() => setMenu(false)} className={iconBtn} aria-label="Close menu">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
            <form onSubmit={onSearch} className="pt-4" role="search">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search games…"
                className="input"
                aria-label="Search games"
                enterKeyHint="search"
              />
            </form>
            <nav className="mt-2 grid">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenu(false)}
                  className="flex min-h-12 items-center border-b border-line/60 text-[15px] font-medium transition-colors active:text-brand-2"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href={signedIn ? "/orders" : "/login"}
                onClick={() => setMenu(false)}
                className="flex min-h-12 items-center border-b border-line/60 text-[15px] font-medium transition-colors active:text-brand-2"
              >
                {signedIn ? "My orders" : "Sign in"}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMenu(false)}
                  className="flex min-h-12 items-center text-[15px] font-semibold text-brand-2"
                >
                  Admin panel
                </Link>
              )}
            </nav>
          </div>
        </aside>
      </div>
    </>
  );
}
