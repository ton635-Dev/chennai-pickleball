import Link from "next/link";
import { notFound } from "next/navigation";
import { getBoardPost, getMembers } from "@/lib/data";
import { getAppUrl } from "@/lib/supabase/config";
import { formatDateJa } from "@/lib/format";
import {
  CATEGORY_LABEL,
  CATEGORY_SHORT,
  KIND_CLASS,
  KIND_LABEL,
  buildBoardAnnouncementText,
  buildBoardCalendarUrl,
  deadlineBadge,
  formatPostWhen,
  statusLabel,
  usesPairing,
} from "@/lib/board";
import { Avatar } from "@/components/bits";
import { ShareButton } from "@/components/ShareButton";
import { BoardResponsePanel } from "@/components/BoardResponsePanel";
import { BoardPostActions } from "@/components/BoardPostActions";
import type { BoardResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** DUPRは種目に合わせて表示(シングルス希望ならS、それ以外はD) */
function duprText(r: BoardResponse): string | null {
  const v = r.category === "singles" ? r.member.dupr_singles : r.member.dupr;
  if (v == null) return null;
  const label = r.category === "singles" ? "S" : "D";
  return `${label} ${Number(v).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}`;
}

export default async function BoardPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ posted?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [post, members] = await Promise.all([getBoardPost(id), getMembers()]);
  if (!post || post.archived) notFound();

  const appUrl = getAppUrl();
  const pairing = usesPairing(post.kind);
  const dl = deadlineBadge(post.entry_deadline);
  const announce = buildBoardAnnouncementText(post, appUrl);

  const seeking = post.responses.filter((r) => r.status === "seeking");
  const going = post.responses.filter((r) => r.status === "going");
  const interested = post.responses.filter((r) => r.status === "interested");

  // 出場予定はペア単位にまとめる(互いにペア登録している2人は1行)
  const byId = new Map(going.map((r) => [r.member_id, r]));
  const shown = new Set<string>();
  const goingRows: { names: string; category: string | null }[] = [];
  for (const r of going) {
    if (shown.has(r.member_id)) continue;
    shown.add(r.member_id);
    const p = r.partner_member_id ? byId.get(r.partner_member_id) : undefined;
    if (p && p.partner_member_id === r.member_id) {
      shown.add(p.member_id);
      goingRows.push({
        names: `${r.member.name}・${p.member.name}`,
        category: r.category ? CATEGORY_SHORT[r.category] : null,
      });
    } else {
      goingRows.push({
        names: r.member.name,
        category: r.category ? CATEGORY_SHORT[r.category] : null,
      });
    }
  }

  const info = (icon: string, children: React.ReactNode) => (
    <div className="flex items-start gap-2 border-b border-line py-2.5 text-sm last:border-none">
      <span className="w-5 shrink-0 text-center">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/tournaments/board"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <span
          className={`rounded-pill px-2.5 py-1 text-[11px] font-extrabold ${KIND_CLASS[post.kind]}`}
        >
          {KIND_LABEL[post.kind]}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-xs text-muted">
          {post.authorName && `投稿: ${post.authorName}`}
        </span>
        <BoardPostActions postId={post.id} />
      </div>

      {/* 投稿直後: WhatsAppグループへの告知を案内 */}
      {sp.posted === "1" && (
        <div className="card mb-3 border-primary bg-[#E2F3EE] p-4">
          <p className="mb-2 text-sm font-extrabold text-primary-dark">
            投稿しました。WhatsAppグループに告知しましょう
          </p>
          <ShareButton text={announce} label="WhatsAppで告知" />
        </div>
      )}

      <h1 className="mb-3 text-[22px] font-extrabold leading-snug">{post.title}</h1>

      <div className="card mb-3 p-4">
        {info("📅", <b>{formatPostWhen(post)}</b>)}
        {post.place_name &&
          info(
            "📍",
            <>
              {post.place_name}{" "}
              {post.maps_url && (
                <a
                  href={post.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary underline"
                >
                  地図
                </a>
              )}
            </>
          )}
        {post.entry_deadline &&
          info(
            "⏰",
            <>
              申込締切 {formatDateJa(post.entry_deadline)}
              {dl && (
                <span
                  className={`ml-2 rounded-pill px-2 py-0.5 text-[11px] font-extrabold ${
                    dl.urgent ? "bg-[#FAEEDA] text-[#633806]" : "bg-[#EDF1EF] text-muted"
                  }`}
                >
                  {dl.text}
                </span>
              )}
            </>
          )}
        {post.categories.length > 0 &&
          info("🏓", post.categories.map((c) => CATEGORY_LABEL[c]).join("・"))}
        {post.level && info("📊", `レベル: ${post.level}`)}
        {post.fee && info("💰", `参加費: ${post.fee}`)}
        {post.note && info("📝", <span className="whitespace-pre-line">{post.note}</span>)}
      </div>

      {post.image_url && (
        <a href={post.image_url} target="_blank" rel="noopener noreferrer" className="mb-3 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image_url}
            alt={`${post.title}のチラシ`}
            className="max-h-[480px] w-full rounded-card border border-line bg-surface object-contain"
          />
        </a>
      )}

      <div className="mb-3 space-y-2">
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill flex w-full items-center justify-center bg-primary py-3 text-[15px] text-white"
          >
            申込ページを開く ↗
          </a>
        )}
        <div className="flex gap-2">
          <a
            href={buildBoardCalendarUrl(post, appUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill flex flex-1 items-center justify-center border border-line bg-surface py-2.5 text-[13px] text-primary-dark"
          >
            📅 カレンダーに追加
          </a>
          <ShareButton text={announce} label="WhatsAppで共有" size="mini" className="flex-1 py-2.5" />
        </div>
      </div>

      {/* あなたの状況 */}
      <div className="card mb-3 p-4">
        <h2 className="mb-2.5 text-sm font-extrabold text-muted">あなたの状況</h2>
        <BoardResponsePanel
          key={post.responses.map((r) => `${r.member_id}:${r.status}:${r.partner_member_id}`).join(",")}
          postId={post.id}
          kind={post.kind}
          categories={post.categories}
          responses={post.responses}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
        />
      </div>

      {/* みんなの状況 */}
      <div className="card p-4">
        {post.responses.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted">まだ誰も表明していません</p>
        ) : (
          <>
            {pairing && seeking.length > 0 && (
              <section className="mb-3">
                <h3 className="mb-1 text-[13px] font-extrabold text-[#993C1D]">
                  ペア探し中 {seeking.length}人
                </h3>
                {seeking.map((r) => {
                  const d = duprText(r);
                  return (
                    <div
                      key={r.id}
                      className="flex items-start gap-2.5 border-b border-line py-2 last:border-none"
                    >
                      <Avatar name={r.member.name} className="h-8 w-8 shrink-0 text-xs" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <b className="text-sm">{r.member.name}</b>
                          {d && (
                            <span className="rounded-pill bg-[#E2F3EE] px-2 py-0.5 text-[10px] font-extrabold text-primary-dark">
                              {d}
                            </span>
                          )}
                          {r.category && (
                            <span className="text-[11px] text-muted">
                              {CATEGORY_SHORT[r.category]}
                            </span>
                          )}
                        </div>
                        {r.comment && <p className="text-xs text-muted">{r.comment}</p>}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
            {goingRows.length > 0 && (
              <section className="mb-3">
                <h3 className="mb-1 text-[13px] font-extrabold text-primary-dark">
                  {statusLabel("going", post.kind)} {going.length}人
                </h3>
                <ul className="space-y-0.5 text-sm">
                  {goingRows.map((g) => (
                    <li key={g.names}>
                      {g.names}
                      {g.category && <span className="ml-1 text-xs text-muted">({g.category})</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {interested.length > 0 && (
              <section>
                <h3 className="mb-1 text-[13px] font-extrabold text-muted">
                  興味あり {interested.length}人
                </h3>
                <p className="text-sm">{interested.map((r) => r.member.name).join("、")}</p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
