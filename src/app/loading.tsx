import { Skeleton } from "@/components/bits";

export default function HomeLoading() {
  return (
    <div className="mx-auto w-full max-w-app pt-1 md:grid md:grid-cols-[1.5fr_1fr] md:gap-5">
      <div>
        {/* ヒーロー */}
        <div className="mb-3 rounded-card bg-gradient-to-br from-primary to-primary-dark p-5 md:p-7">
          <Skeleton className="h-3 w-24 bg-white/30" />
          <Skeleton className="mt-3 h-8 w-40 bg-white/30" />
          <Skeleton className="mt-2 h-4 w-28 bg-white/20" />
          <Skeleton className="mt-4 h-11 w-full bg-white/20" />
        </div>
        <Skeleton className="mb-4 h-12 w-full" />
        {/* 今後の予定 */}
        <div className="card mb-3 p-4">
          <Skeleton className="mb-3 h-4 w-24" />
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3.5 py-3">
              <Skeleton className="h-12 w-12" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-14 rounded-pill" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="card p-4">
          <Skeleton className="mb-3 h-4 w-24" />
          {[0, 1].map((i) => (
            <Skeleton key={i} className="mb-2 h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
