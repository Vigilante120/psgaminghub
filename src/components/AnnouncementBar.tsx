import Link from "next/link";
import { BUNDLE_OFFER } from "@/lib/store";

export default function AnnouncementBar() {
  return (
    <Link
      href="/collections/all"
      className="block bg-gradient-to-r from-brand via-[#5b4bff] to-brand-2 py-2 text-center font-display text-xs font-semibold uppercase tracking-[0.18em] text-white"
    >
      {BUNDLE_OFFER.text}
    </Link>
  );
}
