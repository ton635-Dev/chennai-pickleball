import { EmptyState } from "@/components/bits";

export default function TournamentsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <h1 className="mb-4 text-[22px] font-extrabold">大会</h1>
      <EmptyState
        title="大会管理は Phase 3 で提供予定です"
        hint="トーナメント表・リーグ星取表・次の試合表示などを実装します"
      />
    </div>
  );
}
