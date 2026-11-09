"use client";

import { useState } from "react";

// Short guides showing customers how the game gets added to their console.
// The videos are embedded from YouTube (not re-hosted). The player only loads when
// someone presses play, so the page stays fast.

type Console = "PS5" | "PS4";

const VIDEOS: Record<Console, { id: string; title: string }> = {
  PS5: { id: "BhZ09dXT4mI", title: "How we add your game on PS5" },
  PS4: { id: "Qp8CO5kOQj8", title: "How we add your game on PS4" },
};

export default function SetupVideos({
  consoles = ["PS5", "PS4"],
  compact = false,
}: {
  /** Which consoles to offer; the first one opens by default. */
  consoles?: readonly string[];
  /** Smaller heading and copy, for use inside a card. */
  compact?: boolean;
}) {
  // Keep PS5/PS4 only; anything else (or nothing) falls back to both.
  const known = consoles.filter((c): c is Console => c in VIDEOS);
  const list: Console[] = known.length ? known : ["PS5", "PS4"];
  const [active, setActive] = useState<Console>(list[0]);
  const [playing, setPlaying] = useState<Console | null>(null);
  const video = VIDEOS[active];

  return (
    <div className={compact ? "" : "rounded-2xl border border-line bg-panel p-4 sm:p-6"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={`font-display font-bold uppercase tracking-wide ${compact ? "text-base" : "text-lg"}`}>
          How the game is added to your console
        </h3>
        {list.length > 1 && (
          <div role="tablist" aria-label="Console" className="flex gap-1 rounded-full border border-line bg-ink/40 p-1">
            {list.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={active === c}
                onClick={() => setActive(c)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold transition lg:min-h-9 ${
                  active === c ? "bg-brand text-white" : "text-muted hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted">
        Watch this before delivery so you know what to expect. We'll guide you on WhatsApp, and when we ask,{" "}
        <b className="text-white">send us the code shown on your {active}</b> so we can finish adding the game.
      </p>

      <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-line bg-black">
        {playing === active ? (
          <iframe
            key={video.id}
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(active)}
            aria-label={`Play: ${video.title}`}
            className="group absolute inset-0 h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-70 transition group-hover:opacity-90"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-hot shadow-lg transition group-hover:scale-110 group-active:scale-95">
                <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              {active} guide
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
