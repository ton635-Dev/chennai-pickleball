import { initial } from "@/lib/format";
import type { AttendanceStatus } from "@/lib/types";

/** 読み込み中のスケルトン(パルスするグレーの箱) */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line/70 ${className}`} />;
}

/** カード型のスケルトン枠 */
export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return <div className="card mb-3 p-4">{children}</div>;
}

export function Avatar({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-[#EDF4F1] font-extrabold text-primary-dark ${className}`}
    >
      {initial(name)}
    </span>
  );
}

const CHIP: Record<AttendanceStatus | "none", string> = {
  join: "bg-[#E2F3EE] text-primary-dark",
  maybe: "bg-[#FBF0DC] text-[#9A6B14]",
  no: "bg-[#EDF1EF] text-muted",
  none: "bg-[#EDF1EF] text-muted",
};
const CHIP_LABEL: Record<AttendanceStatus | "none", string> = {
  join: "参加",
  maybe: "未定",
  no: "不参加",
  none: "未回答",
};

export function AttendanceChip({
  status,
}: {
  status: AttendanceStatus | "none";
}) {
  return (
    <span
      className={`rounded-pill px-3 py-1.5 text-xs font-extrabold ${CHIP[status]}`}
    >
      {CHIP_LABEL[status]}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
