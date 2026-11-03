import { LoadingLabel } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <LoadingLabel text="Loading game…" />
      <div className="skeleton mb-6 h-3 w-48" />
      <div className="grid gap-6 sm:gap-10 md:grid-cols-[minmax(0,300px)_1fr] lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="skeleton mx-auto aspect-[3/4] w-full max-w-[280px] rounded-3xl md:max-w-none" />
        <div className="space-y-4">
          <div className="skeleton h-10 w-4/5" />
          <div className="skeleton h-8 w-32" />
          <div className="flex gap-2 pt-2">
            <div className="skeleton h-11 w-20 rounded-xl" />
            <div className="skeleton h-11 w-20 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
