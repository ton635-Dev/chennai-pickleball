import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventWithAttendance } from "@/lib/data";
import {
  formatDateJa,
  formatTimeRange,
  formatDeadline,
} from "@/lib/format";
import { getAppUrl } from "@/lib/supabase/config";
import { buildAnnouncementText, buildRosterText } from "@/lib/whatsapp";
import { EventRsvpPanel } from "@/components/EventRsvpPanel";
import { EventActions } from "@/components/EventActions";
import { ShareButton } from "@/components/ShareButton";
import { AnnouncementShare } from "@/components/AnnouncementShare";
import { Avatar } from "@/components/bits";
import type { AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const GROUPS: { key: AttendanceStatus; label: string; dot: string; text: string }[] =
  [
    { key: "join", label: "参加", dot: "bg-primary", text: "text-primary-dark" },
    { key: "maybe", label: "未定", dot: "bg-amber", text: "text-[#9A6B14]" },
    { key: "no", label: "不参加", dot: "bg-gray", text: "text-muted" },
  ];

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ev = await getEventWithAttendance(id);
  if (!ev || ev.archived) notFound();

  const appUrl = getAppUrl();
  const statusByMember: Record<string, AttendanceStatus> = {};
  const commentByMember: Record<string, string> = {};
  for (const a of ev.attendances) {
    statusByMember[a.member_id] = a.status;
    if (a.comment) commentByMember[a.member_id] = a.comment;
  }

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/schedule"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <h1 className="flex-1 text-lg font-extrabold">活動日詳細</h1>
        <EventActions eventId={ev.id} />
      </div>

      {/* 基本情報 */}
      <div className="card mb-3 p-4">
        <div className="text-2xl font-extrabold">
          {formatDateJa(ev.event_date)}{" "}
          {formatTimeRange(ev.start_time, ev.end_time)}
        </div>
        <div className="mt-2.5">
          {ev.place_name && (
            <div className="flex items-center gap-2 border-b border-line py-2.5 text-sm">
              <span className="w-5 text-center">📍</span>
              <span>
                <b>{ev.place_name}</b>{" "}
                {ev.maps_url && (
                  <a
                    href={ev.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary underline"
                  >
                    地図
                  </a>
                )}
              </span>
            </div>
          )}
          {ev.fee && (
            <div className="flex items-center gap-2 border-b border-line py-2.5 text-sm">
              <span className="w-5 text-center">💰</span>
              <span>参加費 {ev.fee}</span>
            </div>
          )}
          {ev.rsvp_deadline && (
            <div className="flex items-center gap-2 border-b border-line py-2.5 text-sm">
              <span className="w-5 text-center">⏰</span>
              <span>出欠締切 {formatDeadline(ev.rsvp_deadline)}</span>
            </div>
          )}
          {ev.note && (
            <div className="flex items-center gap-2 py-2.5 text-sm">
              <span className="w-5 text-center">📝</span>
              <span>{ev.note}</span>
            </div>
          )}
        </div>
      </div>

      {/* あなたの出欠 */}
      <div className="card mb-3 p-4">
        <h2 className="mb-2.5 text-sm font-extrabold text-muted">あなたの出欠</h2>
        <EventRsvpPanel
          eventId={ev.id}
          statusByMember={statusByMember}
          commentByMember={commentByMember}
        />
      </div>

      {/* 告知(通知)を共有 — 参加者リストは含めない */}
      <div className="mb-3">
        <AnnouncementShare initialText={buildAnnouncementText(ev, appUrl)} />
      </div>

      {/* 参加者 */}
      <div className="card p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-muted">参加者</h2>
          <ShareButton
            text={buildRosterText(ev, appUrl)}
            label="参加状況を共有"
            size="mini"
          />
        </div>
        {ev.attendances.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">
            まだ誰も出欠を登録していません
          </p>
        ) : (
          GROUPS.map((g) => {
            const list = ev.attendances.filter((a) => a.status === g.key);
            if (list.length === 0) return null;
            return (
              <div key={g.key}>
                <div
                  className={`mb-1.5 mt-3.5 flex items-center gap-2 text-[13px] font-extrabold ${g.text}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${g.dot}`} />
                  {g.label} {list.length}名
                </div>
                {list.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 border-b border-line py-2 text-sm last:border-none"
                  >
                    <Avatar name={a.member.name} className="h-8 w-8 text-xs" />
                    {a.member.name}
                    {a.comment && (
                      <small className="ml-auto max-w-[55%] text-right text-xs text-muted">
                        {a.comment}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
