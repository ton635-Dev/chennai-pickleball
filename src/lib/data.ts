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
  PayerInfo,
  ReviewItem,
  Tournament,
  TournamentEntry,
  TournamentMatch,
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
    sb
      .from("events")
      .select("*, payer:members!events_payer_member_id_fkey(id, name, upi_qr_url)")
      .eq("id", id)
      .maybeSingle(),
    sb
      .from("attendances")
      .select("*, member:members(id, name)")
      .eq("event_id", id)
      .order("updated_at", { ascending: true }),
  ]);
  if (!ev) return null;
  const row = ev as EventRow & { payer: PayerInfo | null };
  return {
    ...withCounts(row, (atts as AttendanceWithMember[]) ?? []),
    payer: row.payer ?? null,
  };
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

export interface MatchWithEvent extends MatchRow {
  event: { id: string; event_date: string; place_name: string | null } | null;
}

/** 試合履歴(活動日情報つき・新しい順) */
export async function getMatches(limit = 200): Promise<MatchWithEvent[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("matches")
    .select("*, event:events(id, event_date, place_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as MatchWithEvent[]) ?? [];
}

/** 特定の活動日に紐づく試合 */
export async function getMatchesForEvent(eventId: string): Promise<MatchRow[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("matches")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return (data as MatchRow[]) ?? [];
}

export interface PlayerStat {
  name: string;
  wins: number;
  losses: number;
  games: number;
  winRate: number; // 0-100
}

/**
 * 選手名ベースの戦績集計(勝敗が記録された試合のみ)。
 * スコアボードは表示名の自由入力のため、名前文字列で集計する。
 */
export async function getPlayerStats(): Promise<PlayerStat[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("matches")
    .select("team1_names, team2_names, winner")
    .not("winner", "is", null);
  const rows = (data as Pick<
    MatchRow,
    "team1_names" | "team2_names" | "winner"
  >[]) ?? [];

  const stats = new Map<string, { wins: number; losses: number }>();
  const bump = (name: string, win: boolean) => {
    const key = name.trim();
    if (!key) return;
    const s = stats.get(key) ?? { wins: 0, losses: 0 };
    if (win) s.wins += 1;
    else s.losses += 1;
    stats.set(key, s);
  };
  for (const m of rows) {
    const t1win = m.winner === 1;
    for (const n of m.team1_names ?? []) bump(n, t1win);
    for (const n of m.team2_names ?? []) bump(n, !t1win);
  }
  return Array.from(stats.entries())
    .map(([name, s]) => {
      const games = s.wins + s.losses;
      return {
        name,
        wins: s.wins,
        losses: s.losses,
        games,
        winRate: games > 0 ? Math.round((s.wins / games) * 100) : 0,
      };
    })
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------
// 大会
// ---------------------------------------------------------------------

export interface TournamentSummary extends Tournament {
  entryCount: number;
}

/** 大会一覧(アーカイブ以外・新しい順)+ 参加数 */
export async function getTournaments(): Promise<TournamentSummary[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data: ts } = await sb
    .from("tournaments")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (!ts || ts.length === 0) return [];
  const ids = (ts as Tournament[]).map((t) => t.id);
  const { data: entries } = await sb
    .from("tournament_entries")
    .select("tournament_id")
    .in("tournament_id", ids);
  const counts = new Map<string, number>();
  for (const e of (entries as { tournament_id: string }[]) ?? []) {
    counts.set(e.tournament_id, (counts.get(e.tournament_id) ?? 0) + 1);
  }
  return (ts as Tournament[]).map((t) => ({
    ...t,
    entryCount: counts.get(t.id) ?? 0,
  }));
}

export interface TournamentDetail {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
}

export async function getTournamentDetail(
  id: string
): Promise<TournamentDetail | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const [{ data: t }, { data: entries }, { data: matches }] = await Promise.all([
    sb.from("tournaments").select("*").eq("id", id).maybeSingle(),
    sb
      .from("tournament_entries")
      .select("*")
      .eq("tournament_id", id)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    sb
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", id)
      .order("round", { ascending: true })
      .order("position", { ascending: true }),
  ]);
  if (!t) return null;
  return {
    tournament: t as Tournament,
    entries: (entries as TournamentEntry[]) ?? [],
    matches: (matches as TournamentMatch[]) ?? [],
  };
}
