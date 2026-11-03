import { LoadingLabel, ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <LoadingLabel text="Searching…" />
      <div className="skeleton h-9 w-64 max-w-full" />
      <div className="mt-8">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
