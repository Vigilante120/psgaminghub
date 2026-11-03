import { ListSkeleton, LoadingLabel } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <LoadingLabel text="Loading your orders…" />
      <div className="skeleton h-9 w-48 sm:h-10" />
      <div className="skeleton mt-2 h-4 w-56" />
      <div className="mt-8">
        <ListSkeleton />
      </div>
    </div>
  );
}
