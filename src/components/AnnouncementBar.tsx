import Link from "next/link";
import { BUNDLE_OFFER } from "@/lib/store";

export default function AnnouncementBar() {
  return (
    <Link
      href="/collections/all"
      className="block bg-gradient-to-r from-brand via-[#5b4bff] to-brand-2 px-3 py-2 text-center font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-white sm:text-xs sm:tracking-[0.18em]"
    >
      {BUNDLE_OFFER.text}
    </Link>
  );
}
