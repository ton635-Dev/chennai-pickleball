import Link from "next/link";
import { getCourts } from "@/lib/data";
import { EmptyState } from "@/components/bits";

export const dynamic = "force-dynamic";

function courtTag(isIndoor: boolean | null, surface: string | null): string {
  const io = isIndoor === true ? "屋内" : isIndoor === false ? "屋外" : null;
  return [io, surface].filter(Boolean).join("・") || "コート";
}

export default async function CourtsPage() {
  const courts = await getCourts();

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold">コート情報</h1>
        <Link
          href="/courts/new"
          className="btn-pill bg-primary px-5 py-2.5 text-sm text-white"
        >
          ＋ 追加
        </Link>
      </div>

      {courts.length === 0 ? (
        <EmptyState
          title="登録されたコートはありません"
          hint="「＋ 追加」からよく使うコートを登録しましょう"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {courts.map((c) => (
            <Link
              key={c.id}
              href={`/courts/${c.id}`}
              className="overflow-hidden rounded-card border border-line bg-surface"
            >
              <div className="relative flex h-32 items-end p-3.5 text-white">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.photoUrl}
                    alt={c.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-navy" />
                )}
                <span className="absolute left-3 top-3 rounded-pill bg-white/90 px-3 py-1 text-[11px] font-extrabold text-ink">
                  {courtTag(c.is_indoor, c.surface)}
                </span>
                <div className="relative text-lg font-extrabold drop-shadow">
                  {c.name}
                </div>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 text-[13px]">
                <span className="text-muted">
                  {c.court_count ? `${c.court_count}面` : "面数未設定"}
                </span>
                <span className="font-extrabold text-primary-dark">
                  {c.overallAverage !== null
                    ? `${c.overallAverage.toFixed(1)} ★（${c.reviewerCount}名）`
                    : "評価なし"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
