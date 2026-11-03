"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "az", label: "Alphabetically, A–Z" },
  { value: "za", label: "Alphabetically, Z–A" },
] as const;

const PLATFORMS = ["PS5", "PS4"] as const;

export default function CollectionControls({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const platform = params.get("platform");

  return (
    <div className="flex flex-wrap items-center gap-3 border-y border-line py-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => set("platform", null)}
          className={`min-h-11 rounded-full border px-4 py-1.5 text-xs font-semibold lg:min-h-0 sm:px-3.5 ${!platform ? "border-brand bg-brand/15" : "border-line text-muted hover:text-white"}`}
        >
          All platforms
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => set("platform", platform === p ? null : p)}
            className={`min-h-11 rounded-full border px-4 py-1.5 text-xs font-semibold lg:min-h-0 sm:px-3.5 ${
              platform === p ? "border-brand bg-brand/15" : "border-line text-muted hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => set("sale", params.get("sale") ? null : "1")}
          className={`min-h-11 rounded-full border px-4 py-1.5 text-xs font-semibold lg:min-h-0 sm:px-3.5 ${
            params.get("sale") ? "border-hot bg-hot/15" : "border-line text-muted hover:text-white"
          }`}
        >
          On sale
        </button>
      </div>

      <span className="text-xs text-muted sm:ml-auto">{total} items</span>
      <label className="ml-auto flex items-center gap-2 text-xs text-muted sm:ml-0">
        Sort
        <select
          value={params.get("sort") ?? "featured"}
          onChange={(e) => set("sort", e.target.value === "featured" ? null : e.target.value)}
          className="input h-11 w-auto py-0 text-white sm:text-sm lg:h-9"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
