import "server-only";
import { getServerSupabase } from "./supabase/server";
import type {
  AttendanceStatus,
  AttendanceWithMember,
  EventRow,
  EventWithAttendance,
  MatchRow,
  Member,
} from "./types";
import { isUpcoming } from "./format";

function emptyCounts(): Record<AttendanceStatus, number> {
  return { join: 0, maybe: 0, no: 0 };
}

/** attendances 配列から集計を作る */
function withCounts(
  ev: EventRow,
  atts: AttendanceWithMember[]
): EventWithAttendance {
  const counts = emptyCounts();
  for (const a of atts) counts[a.status] += 1;
  return { ...ev, attendances: atts, counts };
}

/** メンバー一覧(名前順) */
export async function getMembers(): Promise<Member[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("members")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });
  return (data as Member[]) ?? [];
}

/** アーカイブ以外の全イベント(日付昇順)+ 出欠 */
export async function getEventsWithAttendance(): Promise<EventWithAttendance[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data: events } = await sb
    .from("events")
    .select("*")
    .eq("archived", false)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (!events || events.length === 0) return [];

  const ids = (events as EventRow[]).map((e) => e.id);
  const { data: atts } = await sb
    .from("attendances")
    .select("*, member:members(id, name)")
    .in("event_id", ids);

  const byEvent = new Map<string, AttendanceWithMember[]>();
  for (const a of (atts as AttendanceWithMember[]) ?? []) {
    const list = byEvent.get(a.event_id) ?? [];
    list.push(a);
    byEvent.set(a.event_id, list);
  }
  return (events as EventRow[]).map((e) =>
    withCounts(e, byEvent.get(e.id) ?? [])
  );
}

/** 次回(今日以降の最も近い)イベント */
export async function getNextEvent(): Promise<EventWithAttendance | null> {
  const all = await getEventsWithAttendance();
  const upcoming = all.filter((e) => isUpcoming(e.event_date));
  return upcoming[0] ?? null;
}

/** 単一イベント + 出欠 */
export async function getEventWithAttendance(
  id: string
): Promise<EventWithAttendance | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data: ev } = await sb
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return null;
  const { data: atts } = await sb
    .from("attendances")
    .select("*, member:members(id, name)")
    .eq("event_id", id)
    .order("updated_at", { ascending: true });
  return withCounts(ev as EventRow, (atts as AttendanceWithMember[]) ?? []);
}

export interface MemberStat {
  id: string;
  name: string;
  joinCount: number;
}

/** メンバーごとの参加回数(status='join')集計 */
export async function getMemberStats(): Promise<MemberStat[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const [{ data: members }, { data: atts }] = await Promise.all([
    sb.from("members").select("id, name"),
    sb.from("attendances").select("member_id").eq("status", "join"),
  ]);
  const counts = new Map<string, number>();
  for (const a of (atts as { member_id: string }[]) ?? []) {
    counts.set(a.member_id, (counts.get(a.member_id) ?? 0) + 1);
  }
  return ((members as { id: string; name: string }[]) ?? [])
    .map((m) => ({ id: m.id, name: m.name, joinCount: counts.get(m.id) ?? 0 }))
    .sort((a, b) => b.joinCount - a.joinCount || a.name.localeCompare(b.name));
}

/** 最近の試合(保存済み) */
export async function getRecentMatches(limit = 5): Promise<MatchRow[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as MatchRow[]) ?? [];
}
