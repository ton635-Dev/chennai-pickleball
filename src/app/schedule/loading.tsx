import { Skeleton } from "@/components/bits";

export default function ScheduleLoading() {
  return (
    <div className="pt-1">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-pill" />
        </div>
        <div className="card p-4">
          <Skeleton className="mb-3 h-4 w-24" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3.5 py-3">
              <Skeleton className="h-12 w-12" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-14 rounded-pill" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
