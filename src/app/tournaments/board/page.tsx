import Link from "next/link";
import { getBoardPosts } from "@/lib/data";
import { EmptyState } from "@/components/bits";
import { BoardPostCard, TournamentTabs } from "@/components/BoardBits";
import type { BoardKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: { key: "all" | BoardKind; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "external", label: "外部大会" },
  { key: "circle", label: "サークル" },
  { key: "other", label: "その他" },
];

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; past?: string }>;
}) {
  const sp = await searchParams;
  const past = sp.past === "1";
  const kind = FILTERS.some((f) => f.key === sp.kind) ? (sp.kind as BoardKind | "all") : "all";
  const posts = (await getBoardPosts({ past })).filter(
    (p) => kind === "all" || p.kind === kind
  );
  const href = (k: string, pst: boolean) => {
    const q = new URLSearchParams();
    if (k !== "all") q.set("kind", k);
    if (pst) q.set("past", "1");
    const s = q.toString();
    return `/tournaments/board${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <h1 className="mb-3 text-[22px] font-extrabold">大会</h1>
      <TournamentTabs active="board" />

      <div className="mb-3 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={href(f.key, past)}
              className={`rounded-pill px-3 py-1.5 text-xs font-bold ${
                kind === f.key
                  ? "bg-primary text-white"
                  : "border border-line bg-surface text-muted"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        {!past && (
          <Link
            href="/tournaments/board/new"
            className="btn-pill shrink-0 bg-primary px-4 py-2 text-sm text-white"
          >
            ＋ 投稿
          </Link>
        )}
      </div>

      {past && (
        <p className="mb-2 text-sm font-extrabold text-muted">終了した大会・イベント</p>
      )}

      {posts.length === 0 ? (
        <EmptyState
          title={past ? "終了した投稿はありません" : "まだ投稿がありません"}
          hint={
            past
              ? undefined
              : "TurfTownなどで見つけた大会や、合宿などのサークルイベントを「＋ 投稿」から共有しましょう"
          }
        />
      ) : (
        posts.map((p) => <BoardPostCard key={p.id} post={p} />)
      )}

      <div className="mt-3 text-center">
        <Link href={href(kind, !past)} className="text-xs font-bold text-primary underline">
          {past ? "← 開催予定の投稿に戻る" : "終了した投稿を見る"}
        </Link>
      </div>
    </div>
  );
}
