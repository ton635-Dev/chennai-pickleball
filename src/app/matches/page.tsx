import { EmptyState } from "@/components/bits";

export default function MatchesPlaceholder() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <h1 className="mb-4 text-[22px] font-extrabold">試合履歴</h1>
      <EmptyState title="準備中です" hint="まもなく実装します" />
    </div>
  );
}
