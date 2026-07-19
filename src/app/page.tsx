import Link from "next/link";
import {
  getEventsWithAttendance,
  getRecentMatches,
} from "@/lib/data";
import {
  formatDateJa,
  formatTimeRange,
  isUpcoming,
  weekdayJa,
} from "@/lib/format";
import { getAppUrl } from "@/lib/supabase/config";
import { buildAnnouncementText } from "@/lib/whatsapp";
import { RsvpControl } from "@/components/RsvpControl";
import { ShareButton } from "@/components/ShareButton";
import { MyRsvpChip } from "@/components/MyRsvpChip";
import { Avatar, EmptyState } from "@/components/bits";
import type { AttendanceStatus, EventWithAttendance } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusMap(ev: EventWithAttendance): Record<string, AttendanceStatus> {
  const m: Record<string, AttendanceStatus> = {};
  for (const a of ev.attendances) m[a.member_id] = a.status;
  return m;
}

export default async function HomePage() {
  const [events, recent] = await Promise.all([
    getEventsWithAttendance(),
    getRecentMatches(3),
  ]);
  const appUrl = getAppUrl();

  const upcoming = events.filter((e) => isUpcoming(e.event_date));
  const next = upcoming[0] ?? null;
  const rest = upcoming.slice(1, 5);

  return (
    <div className="mx-auto w-full max-w-app pt-1 md:grid md:grid-cols-[1.5fr_1fr] md:gap-5">
      <div>
        {/* 次回の活動日ヒーロー */}
        {next ? (
          <div className="mb-3 overflow-hidden rounded-card bg-gradient-to-br from-primary to-primary-dark p-5 text-white md:p-7">
            <div className="text-[11px] font-extrabold tracking-[0.1em] text-accent">
              次回の活動日
            </div>
            <div className="mt-1.5 text-[26px] font-extrabold md:text-[32px]">
              {formatDateJa(next.event_date)}
            </div>
            <div className="text-[15px] opacity-90">
              {formatTimeRange(next.start_time, next.end_time) || "時間未定"}
            </div>
            {next.place_name && (
              <div className="mt-3 flex items-center gap-1.5 text-sm font-bold">
                📍 {next.place_name}
                {next.maps_url && (
                  <a
                    href={next.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-normal underline opacity-80"
                  >
                    地図を開く
                  </a>
                )}
              </div>
            )}

            {/* 参加者アバター行 */}
            <div className="mt-3.5 flex items-center">
              {next.attendances
                .filter((a) => a.status === "join")
                .slice(0, 4)
                .map((a) => (
                  <Avatar
                    key={a.id}
                    name={a.member.name}
                    className="-mr-2 h-[30px] w-[30px] border-2 border-primary-dark bg-white text-[11px]"
                  />
                ))}
              <span className="ml-4 text-[13px] font-bold">
                参加 {next.counts.join}名
                {next.counts.maybe > 0 && ` ・未定 ${next.counts.maybe}名`}
              </span>
            </div>

            <RsvpControl
              eventId={next.id}
              statusByMember={statusMap(next)}
              variant="hero"
            />

            <div className="mt-3">
              <ShareButton
                text={buildAnnouncementText(next, appUrl)}
                label="WhatsAppで告知を共有"
                size="compact"
              />
            </div>
            <div className="mt-3">
              <Link
                href={`/events/${next.id}`}
                className="text-[13px] font-bold text-accent underline"
              >
                詳細・参加者リストを見る →
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <EmptyState
              title="予定されている活動日はありません"
              hint="「活動日を作成」から次回の活動を登録しましょう"
            />
          </div>
        )}

        <Link
          href="/events/new"
          className="btn-pill mb-4 flex w-full items-center justify-center gap-2 border-2 border-primary bg-surface py-3 text-[15px] text-primary"
        >
          ＋ 活動日を作成
        </Link>

        {/* 今後の予定 */}
        <div className="card mb-3 p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-muted">今後の予定</h2>
            <Link href="/schedule" className="text-xs font-bold text-primary">
              すべて見る
            </Link>
          </div>
          {rest.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted">
              他の予定はまだありません
            </p>
          ) : (
            rest.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="flex items-center gap-3.5 border-b border-line py-3 last:border-none"
              >
                <div className="w-12 rounded-[10px] bg-[#EDF4F1] py-1.5 text-center">
                  <b className="block text-[17px] leading-tight">
                    {formatDateJa(ev.event_date).split(" ")[0]}
                  </b>
                  <span className="text-[11px] text-muted">
                    {weekdayJa(ev.event_date)}
                  </span>
                </div>
                <div className="flex-1">
                  <b className="block text-sm">
                    {ev.place_name || "場所未定"}
                  </b>
                  <span className="text-xs text-muted">
                    {formatTimeRange(ev.start_time, ev.end_time)}・参加{" "}
                    {ev.counts.join}名
                  </span>
                </div>
                <MyRsvpChip statusByMember={statusMap(ev)} />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 最近の試合 */}
      <div>
        <div className="card p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-muted">最近の試合</h2>
            <Link href="/matches" className="text-xs font-bold text-primary">
              すべて見る
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted">
              保存された試合結果はまだありません
            </p>
          ) : (
            recent.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between border-b border-line py-2.5 text-[13px] last:border-none"
              >
                <span className="pr-2">
                  {m.team1_names.join("・") || "チーム1"} vs{" "}
                  {m.team2_names.join("・") || "チーム2"}
                </span>
                <b className="tabnum rounded-lg bg-navy px-2.5 py-1 text-sm text-accent">
                  {m.team1_score} - {m.team2_score}
                </b>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
