import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="group flex min-h-11 shrink-0 items-center gap-2 sm:gap-2.5" aria-label="PS GAMING HUB home">
      <Image
        src="/logo.png"
        alt=""
        width={36}
        height={36}
        priority
        className="h-8 w-8 shrink-0 drop-shadow-[0_0_12px_rgba(47,139,255,0.35)] sm:h-9 sm:w-9"
      />
      <span className="whitespace-nowrap font-display text-sm font-bold leading-none tracking-wide min-[360px]:text-base min-[360px]:tracking-wider sm:text-lg">
        PS GAMING <span className="text-gradient">HUB</span>
      </span>
    </Link>
  );
}
