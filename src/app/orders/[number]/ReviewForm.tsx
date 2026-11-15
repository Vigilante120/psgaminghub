"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Stars from "@/components/Stars";
import { createClient } from "@/lib/supabase/client";
import { reviewImageUrl } from "@/lib/store";
import type { Review } from "@/lib/types";

// Rate and review one delivered game. New and edited reviews wait for the admin
// to approve them before other visitors can see them.

const MAX_IMAGES = 3;
const MAX_CHARS = 1000;
const LABELS = ["", "Poor", "Okay", "Good", "Great", "Excellent"];
const STATUS: Record<Review["status"], { label: string; className: string; help: string }> = {
  pending: { label: "Waiting for approval", className: "bg-amber-400/15 text-amber-200", help: "We'll check it and put it live soon." },
  approved: { label: "Live on the website", className: "bg-emerald-400/15 text-emerald-300", help: "Thanks for helping other gamers!" },
  rejected: { label: "Not approved", className: "bg-hot/15 text-hot", help: "Edit your review and send it again." },
};

/**
 * Large phone photos can be over the upload limit, and HEIC can't be read on the
 * server: redraw those as a JPEG in the browser first. The server then makes the .webp.
 */
async function prepare(file: File): Promise<File> {
  const easy = ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 3 * 1024 * 1024;
  if (easy) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], "screenshot.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export default function ReviewForm({
  productId,
  title,
  platform,
  defaultName,
  existing,
}: {
  productId: string;
  title: string;
  platform: string;
  defaultName: string;
  existing: Review | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!existing);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [name, setName] = useState(existing?.display_name ?? defaultName);
  const [kept, setKept] = useState<string[]>(existing?.image_paths ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  const room = MAX_IMAGES - kept.length - files.length;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    setError(picked.length > room ? `You can add up to ${MAX_IMAGES} screenshots.` : null);
    setFiles((f) => [...f, ...picked].slice(0, MAX_IMAGES - kept.length));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return setError("Tap the stars to rate the game.");
    if (!name.trim()) return setError("Enter the name to show with your review.");
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const fail = (m: string) => {
      setError(m);
      setBusy(false);
      inFlight.current = false;
    };

    const paths = [...kept];
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", await prepare(f));
      const res = await fetch("/api/reviews/upload", { method: "POST", body: fd }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok || !json.path) return fail(json.error ?? "Could not upload your screenshot. Please try again.");
      paths.push(json.path);
    }

    const { error: rpcErr } = await createClient().rpc("submit_review", {
      p_product_id: productId,
      p_rating: rating,
      p_body: body,
      p_display_name: name,
      p_image_paths: paths,
    });
    if (rpcErr) return fail(rpcErr.message);

    setFiles([]);
    setKept(paths);
    setEditing(false);
    setBusy(false);
    inFlight.current = false;
    router.refresh();
  }

  const header = (
    <div className="min-w-0">
      <div className="truncate font-semibold">{title}</div>
      <div className="text-xs text-muted">{platform}</div>
    </div>
  );

  if (!editing && existing) {
    const s = STATUS[existing.status];
    return (
      <div className="rounded-xl border border-line bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {header}
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}>{s.label}</span>
        </div>
        <Stars value={existing.rating} size={18} className="mt-3" />
        {existing.body && <p className="mt-2 whitespace-pre-line text-sm text-muted">{existing.body}</p>}
        {existing.status === "rejected" && existing.admin_note && <p className="mt-2 text-sm text-hot">Note from us: {existing.admin_note}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted">{s.help}</p>
          <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost ml-auto min-h-11 px-4 py-2 text-sm lg:min-h-0">
            Edit review
          </button>
        </div>
      </div>
    );
  }

  const shown = hover || rating;

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-ink/40 p-4">
      {header}

      <div className="mt-4">
        <span className="text-sm font-semibold">Your rating</span>
        <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}: ${LABELS[n]}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="flex h-11 w-11 items-center justify-center rounded-lg transition active:scale-90"
            >
              <svg viewBox="0 0 24 24" className={`h-8 w-8 transition ${n <= shown ? "fill-amber-400" : "fill-white/15"}`} aria-hidden="true">
                <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-muted">{LABELS[shown]}</span>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Your review <span className="font-normal text-muted">(optional)</span></span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_CHARS))}
          rows={4}
          placeholder="How was the delivery? Is the game working well?"
          className="input mt-1 resize-y"
        />
        <span className="mt-1 block text-right text-xs text-muted">{body.length}/{MAX_CHARS}</span>
      </label>

      <div className="mt-2">
        <span className="text-sm font-semibold">Screenshots <span className="font-normal text-muted">(optional, up to {MAX_IMAGES})</span></span>
        <div className="mt-2 flex flex-wrap gap-2">
          {kept.map((p) => (
            <div key={p} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={reviewImageUrl(p)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setKept((k) => k.filter((x) => x !== p))} aria-label="Remove screenshot" className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-sm">✕</button>
            </div>
          ))}
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-line bg-panel-2 p-1 text-center text-[10px] text-muted">
              <span className="line-clamp-3 break-all">{f.name}</span>
              <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-sm text-white">✕</button>
            </div>
          ))}
          {room > 0 && (
            <button type="button" onClick={() => input.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted transition hover:border-brand hover:text-white">
              <span className="text-2xl leading-none">+</span>
              Add
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Show my name as</span>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} className="input mt-1" autoComplete="off" />
      </label>

      {error && <p role="alert" className="mt-3 rounded-lg border border-hot/30 bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-primary min-h-11 px-5 py-2.5 disabled:opacity-60">
          {busy ? "Sending…" : existing ? "Update review" : "Post review"}
        </button>
        {existing && !busy && (
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted hover:text-white">
            Cancel
          </button>
        )}
        <p className="w-full text-xs text-muted">Reviews show on the website after we approve them.</p>
      </div>
    </form>
  );
}
