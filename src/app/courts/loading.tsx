import { Skeleton } from "@/components/bits";

export default function CourtsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-20 rounded-pill" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-card border border-line">
            <Skeleton className="h-32 w-full rounded-none" />
            <div className="p-3.5">
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
