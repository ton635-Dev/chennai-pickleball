import Link from "next/link";
import type { BoardPostSummary } from "@/lib/types";
import {
  CATEGORY_SHORT,
  KIND_CLASS,
  KIND_LABEL,
  deadlineBadge,
  formatPostWhen,
  statusLabel,
  usesPairing,
} from "@/lib/board";

/** 「大会」タブ上部の切り替え(サークル大会 / 掲示板) */
export function TournamentTabs({ active }: { active: "tournaments" | "board" }) {
  const item = (key: "tournaments" | "board", href: string, label: string) => (
    <Link
      href={href}
      className={`flex-1 rounded-pill py-2 text-center text-[13px] font-extrabold ${
        active === key ? "bg-surface text-primary-dark shadow-sm" : "text-muted"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-4 flex rounded-pill bg-[#E2EAE5] p-1">
      {item("tournaments", "/tournaments", "サークル大会")}
      {item("board", "/tournaments/board", "大会・イベント掲示板")}
    </div>
  );
}

/** 掲示板の投稿カード(一覧・ホーム共通) */
export function BoardPostCard({
  post,
  compact = false,
}: {
  post: BoardPostSummary;
  compact?: boolean;
}) {
  const dl = deadlineBadge(post.entry_deadline);
  const pairing = usesPairing(post.kind);
  return (
    <Link
      href={`/tournaments/board/${post.id}`}
      className={`block ${
        compact
          ? "border-b border-line py-2.5 last:border-none"
          : `card mb-2.5 p-4 ${dl?.urgent ? "border-amber" : ""}`
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold ${KIND_CLASS[post.kind]}`}
        >
          {KIND_LABEL[post.kind]}
        </span>
        {dl && (
          <span
            className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold ${
              dl.urgent ? "bg-[#FAEEDA] text-[#633806]" : "bg-[#EDF1EF] text-muted"
            }`}
          >
            {dl.text}
          </span>
        )}
        {!compact &&
          post.categories.map((c) => (
            <span
              key={c}
              className="rounded-pill bg-[#EDF4F1] px-2 py-0.5 text-[10px] font-bold text-primary-dark"
            >
              {CATEGORY_SHORT[c]}
            </span>
          ))}
      </div>
      <b className={`mt-1 block ${compact ? "text-sm" : "text-[15px]"}`}>{post.title}</b>
      <div className="mt-0.5 text-xs text-muted">
        📅 {formatPostWhen(post)}
        {post.place_name && !compact && <> ・📍 {post.place_name}</>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        {pairing && post.counts.seeking > 0 && (
          <span className="rounded-pill bg-[#FAECE7] px-2 py-0.5 font-extrabold text-[#712B13]">
            ペア募集中 {post.counts.seeking}人
          </span>
        )}
        {post.counts.going > 0 && (
          <span>
            {statusLabel("going", post.kind)} {post.counts.going}
          </span>
        )}
        {post.counts.interested > 0 && <span>興味あり {post.counts.interested}</span>}
      </div>
    </Link>
  );
}
