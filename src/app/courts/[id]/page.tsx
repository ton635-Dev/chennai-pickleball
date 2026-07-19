import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourtDetail } from "@/lib/data";
import { CourtActions } from "@/components/CourtActions";
import { CourtReviewForm } from "@/components/CourtReviewForm";
import { CourtPhotoUpload } from "@/components/CourtPhotoUpload";
import { Avatar } from "@/components/bits";
import { formatDateJa } from "@/lib/format";

export const dynamic = "force-dynamic";

function tag(isIndoor: boolean | null, surface: string | null): string {
  const io = isIndoor === true ? "屋内" : isIndoor === false ? "屋外" : null;
  return [io, surface].filter(Boolean).join("・") || "コート";
}

export default async function CourtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCourtDetail(id);
  if (!detail || detail.court.archived) notFound();
  const { court, photos, reviews, itemAverages, reviewerCount } = detail;

  const itemNames: Record<string, string> = Object.fromEntries(
    itemAverages.map((ia) => [ia.item.id, ia.item.name])
  );

  const specs: [string, string | null][] = [
    ["面数", court.court_count ? `${court.court_count}面` : null],
    ["路面", court.surface],
    ["設備", court.facilities],
    ["料金", court.fee],
    ["予約", court.booking],
    ["屋外メモ", court.outdoor_note],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/courts"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <h1 className="flex-1 text-lg font-extrabold">コート詳細</h1>
        <CourtActions courtId={court.id} />
      </div>

      {/* 写真ヘッダー */}
      <div className="relative mb-3 flex h-40 items-end overflow-hidden rounded-card p-3.5 text-white">
        {photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[0].url}
            alt={court.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-navy" />
        )}
        <span className="absolute left-3 top-3 rounded-pill bg-white/90 px-3 py-1 text-[11px] font-extrabold text-ink">
          {tag(court.is_indoor, court.surface)}
        </span>
        <div className="relative text-xl font-extrabold drop-shadow">
          {court.name}
        </div>
      </div>

      {/* 基本情報 */}
      <div className="card mb-3 p-4">
        <h2 className="mb-2.5 text-sm font-extrabold text-muted">基本情報</h2>
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {specs
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[13px]">
                <span className="shrink-0 text-[11px] font-bold text-muted">
                  {k}
                </span>
                <span>{v}</span>
              </div>
            ))}
        </div>
        {court.address && (
          <p className="mt-2.5 text-[13px] text-muted">{court.address}</p>
        )}
        {court.maps_url && (
          <a
            href={court.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[13px] font-bold text-primary underline"
          >
            📍 Googleマップで開く
          </a>
        )}
        {court.note && (
          <p className="mt-3 whitespace-pre-line border-t border-line pt-3 text-[13px] leading-relaxed">
            {court.note}
          </p>
        )}
      </div>

      {/* 写真管理 */}
      <div className="mb-3">
        <CourtPhotoUpload courtId={court.id} photos={photos} />
      </div>

      {/* みんなの評価 */}
      <div className="card mb-3 p-4">
        <h2 className="mb-2.5 text-sm font-extrabold text-muted">
          みんなの評価{reviewerCount > 0 && `(${reviewerCount}名)`}
        </h2>
        {reviewerCount === 0 ? (
          <p className="py-2 text-center text-xs text-muted">
            まだ評価がありません。最初の評価をつけましょう
          </p>
        ) : (
          <>
            <div className="space-y-1">
              {itemAverages.map((ia) => (
                <div
                  key={ia.item.id}
                  className="flex items-center gap-2.5 py-1.5"
                >
                  <span className="w-28 shrink-0 text-[13px] font-bold">
                    {ia.item.name}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded bg-[#EDF1EF]">
                    <span
                      className="block h-full rounded bg-primary"
                      style={{
                        width: `${ia.average ? (ia.average / 5) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="tabnum w-14 shrink-0 text-right text-xs font-extrabold text-primary-dark">
                    {ia.average !== null ? `${ia.average.toFixed(1)} ★` : "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* コメント一覧(コメントのある評価のみ) */}
            <div className="mt-3 border-t border-line pt-2">
              {reviews.filter((r) => r.comment).length === 0 ? (
                <p className="py-1 text-center text-xs text-muted">
                  コメントはまだありません
                </p>
              ) : (
                reviews
                  .filter((r) => r.comment)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex gap-2.5 border-b border-line py-2.5 last:border-none"
                    >
                      <Avatar
                        name={r.member.name}
                        className="h-7 w-7 shrink-0 text-[11px]"
                      />
                      <div>
                        <div className="text-[12px]">
                          <b>{r.member.name}</b>
                          <span className="ml-1.5 text-muted">
                            {itemNames[r.review_item_id]} {r.score}★・
                            {formatDateJa(r.updated_at.slice(0, 10))}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] leading-relaxed">
                          {r.comment}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 自分の評価(クライアントで自分の既存評価を反映) */}
      <CourtReviewForm
        courtId={court.id}
        items={itemAverages.map((ia) => ia.item)}
        allReviews={reviews.map((r) => ({
          review_item_id: r.review_item_id,
          member_id: r.member_id,
          score: r.score,
          comment: r.comment,
        }))}
      />
    </div>
  );
}
