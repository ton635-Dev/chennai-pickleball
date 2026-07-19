import Link from "next/link";
import { getMatches, getPlayerStats } from "@/lib/data";
import { MatchRow } from "@/components/MatchRow";
import { EmptyState } from "@/components/bits";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const [matches, stats] = await Promise.all([getMatches(), getPlayerStats()]);

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold">試合履歴</h1>
        <Link
          href="/scoreboard"
          className="btn-pill bg-primary px-5 py-2.5 text-sm text-white"
        >
          スコアをつける
        </Link>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="保存された試合結果はまだありません"
          hint="スコアボードで試合をつけ、終了後に「この結果を保存する」で記録できます"
        />
      ) : (
        <>
          {/* 戦績(名前ベース集計) */}
          {stats.length > 0 && (
            <div className="card mb-3 p-4">
              <h2 className="mb-2.5 text-sm font-extrabold text-muted">
                戦績(勝敗が記録された試合)
              </h2>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 pb-1.5 text-[11px] font-bold text-muted">
                  <span className="w-6 shrink-0" />
                  <span className="flex-1">選手</span>
                  <span className="w-16 text-right">勝-敗</span>
                  <span className="w-12 text-right">勝率</span>
                </div>
                {stats.map((s, i) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-2 border-t border-line py-2 text-sm"
                  >
                    <span className="w-6 shrink-0 text-center text-xs font-extrabold text-muted">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-bold">{s.name}</span>
                    <span className="tabnum w-16 text-right">
                      {s.wins}-{s.losses}
                    </span>
                    <span className="tabnum w-12 text-right font-extrabold text-primary-dark">
                      {s.winRate}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                ※ スコアボードで入力した選手名で集計しています。
              </p>
            </div>
          )}

          {/* 試合一覧 */}
          <div className="card p-4">
            <h2 className="mb-1 text-sm font-extrabold text-muted">
              試合一覧({matches.length}件)
            </h2>
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} showEvent />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
