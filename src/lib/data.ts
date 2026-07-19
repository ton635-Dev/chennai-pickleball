import "server-only";
import { getServerSupabase } from "./supabase/server";
import type {
  AttendanceStatus,
  AttendanceWithMember,
  CourtPhoto,
  CourtReviewWithMember,
  CourtRow,
  CourtSummary,
  EventRow,
  EventWithAttendance,
  ItemAverage,
  MatchRow,
  Member,
  ReviewItem,
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
  // どちらも URL の id をキーにするため並列取得できる
  const [{ data: ev }, { data: atts }] = await Promise.all([
    sb.from("events").select("*").eq("id", id).maybeSingle(),
    sb
      .from("attendances")
      .select("*, member:members(id, name)")
      .eq("event_id", id)
      .order("updated_at", { ascending: true }),
  ]);
  if (!ev) return null;
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

// ---------------------------------------------------------------------
// コート
// ---------------------------------------------------------------------

/** 有効な評価項目(表示順) */
export async function getReviewItems(): Promise<ReviewItem[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("review_items")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data as ReviewItem[]) ?? [];
}

/** コート一覧(集計込み・カード表示用) */
export async function getCourts(): Promise<CourtSummary[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data: courts } = await sb
    .from("courts")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (!courts || courts.length === 0) return [];
  const ids = (courts as CourtRow[]).map((c) => c.id);

  const [{ data: photos }, { data: reviews }] = await Promise.all([
    sb.from("court_photos").select("court_id, url, created_at").in("court_id", ids),
    sb.from("court_reviews").select("court_id, member_id, score").in("court_id", ids),
  ]);

  // コートごとの最初の写真
  const firstPhoto = new Map<string, string>();
  for (const p of (photos as { court_id: string; url: string }[]) ?? []) {
    if (!firstPhoto.has(p.court_id)) firstPhoto.set(p.court_id, p.url);
  }

  // コートごとの平均点・評価者数
  const agg = new Map<string, { sum: number; n: number; members: Set<string> }>();
  for (const r of (reviews as { court_id: string; member_id: string; score: number }[]) ?? []) {
    const a = agg.get(r.court_id) ?? { sum: 0, n: 0, members: new Set<string>() };
    a.sum += r.score;
    a.n += 1;
    a.members.add(r.member_id);
    agg.set(r.court_id, a);
  }

  return (courts as CourtRow[]).map((c) => {
    const a = agg.get(c.id);
    return {
      ...c,
      photoUrl: firstPhoto.get(c.id) ?? null,
      overallAverage: a && a.n > 0 ? a.sum / a.n : null,
      reviewerCount: a ? a.members.size : 0,
    };
  });
}

/** 活動日フォーム用の軽量コート一覧 */
export async function getCourtsForSelect(): Promise<
  Pick<CourtRow, "id" | "name" | "maps_url">[]
> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("courts")
    .select("id, name, maps_url")
    .eq("archived", false)
    .order("name", { ascending: true });
  return (data as Pick<CourtRow, "id" | "name" | "maps_url">[]) ?? [];
}

export interface CourtDetail {
  court: CourtRow;
  photos: CourtPhoto[];
  reviews: CourtReviewWithMember[];
  itemAverages: ItemAverage[];
  reviewerCount: number;
}

/** コート詳細(写真・評価・項目別平均) */
export async function getCourtDetail(id: string): Promise<CourtDetail | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const [{ data: court }, { data: photos }, { data: reviews }, items] =
    await Promise.all([
      sb.from("courts").select("*").eq("id", id).maybeSingle(),
      sb
        .from("court_photos")
        .select("*")
        .eq("court_id", id)
        .order("created_at", { ascending: true }),
      sb
        .from("court_reviews")
        .select("*, member:members(id, name)")
        .eq("court_id", id)
        .order("updated_at", { ascending: false }),
      getReviewItems(),
    ]);
  if (!court) return null;

  const reviewList = (reviews as CourtReviewWithMember[]) ?? [];

  // 項目ごとの平均
  const byItem = new Map<string, { sum: number; n: number }>();
  const members = new Set<string>();
  for (const r of reviewList) {
    members.add(r.member_id);
    const a = byItem.get(r.review_item_id) ?? { sum: 0, n: 0 };
    a.sum += r.score;
    a.n += 1;
    byItem.set(r.review_item_id, a);
  }
  const itemAverages: ItemAverage[] = items.map((item) => {
    const a = byItem.get(item.id);
    return {
      item,
      average: a && a.n > 0 ? a.sum / a.n : null,
      count: a?.n ?? 0,
    };
  });

  return {
    court: court as CourtRow,
    photos: (photos as CourtPhoto[]) ?? [],
    reviews: reviewList,
    itemAverages,
    reviewerCount: members.size,
  };
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
