import { Skeleton } from "@/components/bits";

export default function EventLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
      {/* 基本情報 */}
      <div className="card mb-3 p-4">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-2 h-4 w-32" />
        <Skeleton className="mt-2 h-4 w-44" />
      </div>
      {/* あなたの出欠 */}
      <div className="card mb-3 p-4">
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 flex-1 rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="mb-3 h-24 w-full rounded-card" />
      {/* 参加者 */}
      <div className="card p-4">
        <Skeleton className="mb-3 h-4 w-20" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5 py-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
