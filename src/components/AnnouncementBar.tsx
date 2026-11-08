import Link from "next/link";
import { DIWALI_OFFER, offerActive } from "@/lib/store";

export default function AnnouncementBar() {
  if (!offerActive()) return null;
  return (
    <Link
      href="/collections/all"
      className="block bg-gradient-to-r from-[#ff7a18] via-hot to-[#8b5cf6] px-3 py-2 text-center font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-white sm:text-xs sm:tracking-[0.18em]"
    >
      {DIWALI_OFFER.text}
    </Link>
  );
}
