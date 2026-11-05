"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { CATEGORIES, CONSOLES, categoryLabel } from "@/lib/store";
import Spinner from "@/components/Spinner";
import { deleteProduct, saveProduct } from "../actions";

export default function ProductForm({ product }: { product?: Product }) {
  const p = product;
  const router = useRouter();
  // busy: saving. done: saved, showing the green button before going back to the list.
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // A ref, not state: it blocks a second click in the same tick, before React re-renders.
  const inFlight = useRef(false);
  const locked = status !== "idle" || deleting;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    // Read the fields before locking: a disabled fieldset leaves its inputs out of FormData.
    const data = new FormData(e.currentTarget);
    setError(null);
    setStatus("busy");

    const result = await saveProduct(data).catch(() => ({
      ok: false as const,
      error: "Couldn't reach the server. Check your connection and try again.",
    }));
    if (!result.ok) {
      setError(result.error);
      setStatus("idle");
      inFlight.current = false;
      return;
    }
    // Stays locked: the green button shows briefly, then back to the product list.
    setStatus("done");
    setTimeout(() => {
      router.push("/admin/products");
      router.refresh();
    }, 900);
  }

  function confirmDelete(e: React.FormEvent<HTMLFormElement>) {
    if (locked || !window.confirm(`Delete "${p?.title}" permanently? This can't be undone.`)) {
      e.preventDefault();
      return;
    }
    setDeleting(true);
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={submit} aria-busy={locked} className="space-y-5 rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <fieldset disabled={locked} className={`space-y-5 transition-opacity duration-200 ${locked ? "opacity-60" : ""}`}>
        {p && <input type="hidden" name="id" value={p.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={p?.title} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="slug">URL slug (auto if empty)</label>
            <input id="slug" name="slug" defaultValue={p?.slug} className="input font-mono sm:text-sm" placeholder="spider-man-2" />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue={p?.category ?? "playstation-games"} className="input">
              {CATEGORIES.filter((c) => c.slug !== "all").map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
              {/* Keep hidden categories (PC, PS Plus) selectable for products already in them. */}
              {p && !CATEGORIES.some((c) => c.slug === p.category) && <option value={p.category}>{categoryLabel(p.category)} (hidden)</option>}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="price">Primary slot price (₹)</label>
            <input id="price" name="price" type="number" min={0} step="1" defaultValue={p?.price} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="secondary">Secondary slot price (₹, leave empty if not offered)</label>
            <input
              id="secondary"
              name="secondary_price"
              type="number"
              min={0}
              step="1"
              defaultValue={p?.secondary_price ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="rent">Rent price, 30 days (₹, Secondary slot — leave empty if not offered)</label>
            <input id="rent" name="rent_price" type="number" min={0} step="1" defaultValue={p?.rent_price ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="compare">Original price (₹, optional — shows as strikethrough)</label>
            <input id="compare" name="compare_at_price" type="number" min={0} step="1" defaultValue={p?.compare_at_price ?? ""} className="input" />
          </div>
        </div>

        <fieldset>
          <legend className="label">Platforms</legend>
          <div className="flex flex-wrap gap-x-4">
            {CONSOLES.map((pl) => (
              <label key={pl} className="flex min-h-11 items-center gap-2 text-sm lg:min-h-0">
                <input type="checkbox" className="h-5 w-5 accent-brand lg:h-4 lg:w-4" name="platforms" value={pl} defaultChecked={p ? p.platforms.includes(pl) : pl === "PS5"} />
                {pl}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={5} defaultValue={p?.description ?? ""} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="image">Cover image (portrait 3:4 works best)</label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/20 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-brand-2"
          />
          {p?.cover_url && <p className="mt-1.5 text-xs text-muted">Leave empty to keep the current image.</p>}
        </div>

        <div className="flex flex-wrap gap-x-6">
          <label className="flex min-h-11 items-center gap-2 text-sm lg:min-h-0">
            <input type="checkbox" className="h-5 w-5 accent-brand lg:h-4 lg:w-4" name="is_active" defaultChecked={p ? p.is_active : true} /> Live on store
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm lg:min-h-0">
            <input type="checkbox" className="h-5 w-5 accent-brand lg:h-4 lg:w-4" name="is_featured" defaultChecked={p?.is_featured} /> Featured on homepage
          </label>
        </div>

        </fieldset>

        {error && (
          <p key={error} role="alert" className="animate-shake rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">
            {error}
          </p>
        )}

        <button
          className={`btn w-full sm:w-auto ${status === "done" ? "bg-emerald-500 text-white disabled:opacity-100" : "btn-primary"}`}
          disabled={locked}
          aria-busy={status === "busy"}
        >
          {status === "busy" ? (
            <>
              <Spinner />
              {p ? "Saving…" : "Creating…"}
            </>
          ) : status === "done" ? (
            <>
              <svg viewBox="0 0 24 24" className="animate-pop h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {p ? "Changes saved" : "Product created"}
            </>
          ) : p ? (
            "Save changes"
          ) : (
            "Create product"
          )}
        </button>
      </form>

      {p && (
        <form action={deleteProduct} onSubmit={confirmDelete} className="mt-4">
          <input type="hidden" name="id" value={p.id} />
          <button disabled={locked} className="min-h-11 text-sm text-hot hover:underline disabled:opacity-50 lg:min-h-0">
            {deleting ? "Deleting…" : "Delete product permanently"}
          </button>
          <p className="text-xs text-muted">Tip: untick “Live on store” to hide it instead. Past orders keep their item names either way.</p>
        </form>
      )}
    </div>
  );
}
