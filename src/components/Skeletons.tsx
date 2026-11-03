// Placeholders shown by the loading.tsx files while Supabase data loads.
// Shapes match the real cards so nothing jumps when the content arrives.

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="skeleton aspect-[3/4] rounded-none" />
      <div className="space-y-2 p-3 sm:p-4">
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-2/3" />
        <div className="flex items-end justify-between pt-2">
          <div className="skeleton h-6 w-20" />
          <div className="skeleton h-11 w-11 rounded-xl lg:h-10 lg:w-10" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 sm:p-5">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-3/4" />
          </div>
          <div className="skeleton h-6 w-24 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

// Screen readers hear one short status instead of a pile of empty boxes.
export function LoadingLabel({ text = "Loading…" }: { text?: string }) {
  return (
    <span role="status" className="sr-only">
      {text}
    </span>
  );
}
