import { ListSkeleton, LoadingLabel } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div>
      <LoadingLabel text="Loading dashboard…" />
      <div className="skeleton h-8 w-32 sm:h-9" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-4">
        <ListSkeleton rows={5} />
      </div>
    </div>
  );
}
