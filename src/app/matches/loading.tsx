import { Skeleton } from "@/components/bits";

export default function MatchesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-28 rounded-pill" />
      </div>
      <div className="card mb-3 p-4">
        <Skeleton className="mb-3 h-4 w-40" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="mb-2 h-6 w-full" />
        ))}
      </div>
      <div className="card p-4">
        <Skeleton className="mb-3 h-4 w-28" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="mb-3 h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
