import { LoadingLabel, ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <LoadingLabel text="Loading games…" />
      <div className="skeleton h-3 w-20" />
      <div className="skeleton mt-3 h-9 w-56 sm:h-11" />
      <div className="skeleton mt-3 h-4 w-72 max-w-full" />
      <div className="mt-6 flex gap-2 border-y border-line py-3 sm:mt-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-9 w-16 rounded-full" />
        ))}
      </div>
      <div className="mt-6">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
