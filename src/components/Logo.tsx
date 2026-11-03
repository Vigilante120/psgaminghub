import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="group flex min-h-11 shrink-0 items-center gap-2 sm:gap-2.5" aria-label="PS GAMING HUB home">
      <span className="relative grid h-8 w-8 place-items-center rounded-xl sm:h-9 sm:w-9 bg-gradient-to-br from-brand to-brand-2 shadow-[0_0_24px_-6px] shadow-brand">
        {/* Hexagon "hub" mark */}
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 2.5 20.5 7.25v9.5L12 21.5 3.5 16.75v-9.5z" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="whitespace-nowrap font-display text-sm font-bold leading-none tracking-wide min-[360px]:text-base min-[360px]:tracking-wider sm:text-lg">
        PS GAMING <span className="text-gradient">HUB</span>
      </span>
    </Link>
  );
}
