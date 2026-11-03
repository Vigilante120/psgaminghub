import type { Product } from "@/lib/types";
import { CATEGORIES, CONSOLES, categoryLabel } from "@/lib/store";
import { deleteProduct, saveProduct } from "../actions";

export default function ProductForm({ product }: { product?: Product }) {
  const p = product;
  return (
    <div className="max-w-3xl">
      <form action={saveProduct} className="space-y-5 rounded-2xl border border-line bg-panel p-6">
        {p && <input type="hidden" name="id" value={p.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={p?.title} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="slug">URL slug (auto if empty)</label>
            <input id="slug" name="slug" defaultValue={p?.slug} className="input font-mono text-sm" placeholder="spider-man-2" />
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
            <label className="label" htmlFor="compare">Original price (₹, optional — shows as strikethrough)</label>
            <input id="compare" name="compare_at_price" type="number" min={0} step="1" defaultValue={p?.compare_at_price ?? ""} className="input" />
          </div>
        </div>

        <fieldset>
          <legend className="label">Platforms</legend>
          <div className="flex gap-4">
            {CONSOLES.map((pl) => (
              <label key={pl} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="platforms" value={pl} defaultChecked={p ? p.platforms.includes(pl) : pl === "PS5"} />
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
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-2"
          />
          {p?.cover_url && <p className="mt-1.5 text-xs text-muted">Leave empty to keep the current image.</p>}
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={p ? p.is_active : true} /> Live on store
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_featured" defaultChecked={p?.is_featured} /> Featured on homepage
          </label>
        </div>

        <button className="btn btn-primary">{p ? "Save changes" : "Create product"}</button>
      </form>

      {p && (
        <form action={deleteProduct} className="mt-4">
          <input type="hidden" name="id" value={p.id} />
          <button className="text-sm text-hot hover:underline">Delete product permanently</button>
          <p className="text-xs text-muted">Tip: untick “Live on store” to hide it instead. Past orders keep their item names either way.</p>
        </form>
      )}
    </div>
  );
}
