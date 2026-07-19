import { Skeleton } from "@/components/bits";

export default function MoreLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <Skeleton className="mb-4 h-7 w-40" />
      <div className="card mb-3 p-4">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="card p-4">
        <Skeleton className="mb-3 h-4 w-40" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
