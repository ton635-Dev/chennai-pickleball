"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type {
  AttendanceStatus,
  TournamentEntry,
  TournamentFormat,
  TournamentMatch,
} from "@/lib/types";
import {
  generateRoundRobin,
  generateSingleElim,
  computeStandings,
} from "@/lib/tournament";

class NotConfiguredError extends Error {
  constructor() {
    super("Supabase が未設定です。README のセットアップ手順を確認してください。");
  }
}

function sb() {
  const client = getServerSupabase();
  if (!client) throw new NotConfiguredError();
  return client;
}

async function log(
  entity_type: string,
  entity_id: string | null,
  member_id: string | null,
  action: string,
  summary: string
) {
  try {
    await sb().from("audit_logs").insert({
      entity_type,
      entity_id,
      member_id,
      action,
      summary,
    });
  } catch {
    // 監査ログの失敗は主処理を止めない
  }
}

// ---------------------------------------------------------------------
// メンバー
// ---------------------------------------------------------------------
/** 保存済みメンバーIDがまだ有効か検証(削除済みなら null) */
export async function verifyMember(
  id: string
): Promise<{ id: string; name: string } | null> {
  const { data } = await sb()
    .from("members")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  return (data as { id: string; name: string } | null) ?? null;
}

export async function listMembers() {
  const { data } = await sb()
    .from("members")
    .select("id, name")
    .order("name", { ascending: true });
  return (data as { id: string; name: string }[]) ?? [];
}

export async function updateMemberName(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("名前を入力してください");
  const { error } = await sb()
    .from("members")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { id, name: trimmed };
}

export async function deleteMember(id: string, byMemberId: string | null) {
  const { error } = await sb().from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // 自分自身を削除した場合は監査ログの member_id は null にする(FK回避)
  await log("member", id, byMemberId === id ? null : byMemberId, "delete", "メンバーを削除");
  revalidatePath("/");
  revalidatePath("/more");
}

export async function createMember(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("名前を入力してください");
  const { data, error } = await sb()
    .from("members")
    .insert({ name: trimmed })
    .select("id, name, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------
// 活動日(イベント)
// ---------------------------------------------------------------------
export interface EventInput {
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  court_id?: string | null;
  place_name?: string | null;
  maps_url?: string | null;
  fee?: string | null;
  rsvp_deadline?: string | null;
  note?: string | null;
}

export async function createEvent(input: EventInput, createdBy: string | null) {
  if (!input.event_date) throw new Error("日付を入力してください");
  const { data, error } = await sb()
    .from("events")
    .insert({
      event_date: input.event_date,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      court_id: input.court_id || null,
      place_name: input.place_name || null,
      maps_url: input.maps_url || null,
      fee: input.fee || null,
      rsvp_deadline: input.rsvp_deadline || null,
      note: input.note || null,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await log("event", data.id, createdBy, "create", "活動日を作成");
  revalidatePath("/");
  revalidatePath("/schedule");
  return data.id as string;
}

export async function updateEvent(
  id: string,
  input: EventInput,
  memberId: string | null
) {
  const { error } = await sb()
    .from("events")
    .update({
      event_date: input.event_date,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      court_id: input.court_id || null,
      place_name: input.place_name || null,
      maps_url: input.maps_url || null,
      fee: input.fee || null,
      rsvp_deadline: input.rsvp_deadline || null,
      note: input.note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await log("event", id, memberId, "update", "活動日を編集");
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath(`/events/${id}`);
}

/** 論理削除(アーカイブ) */
export async function archiveEvent(id: string, memberId: string | null) {
  const { error } = await sb()
    .from("events")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await log("event", id, memberId, "archive", "活動日をアーカイブ");
  revalidatePath("/");
  revalidatePath("/schedule");
}

// ---------------------------------------------------------------------
// 出欠
// ---------------------------------------------------------------------
export async function setAttendance(
  eventId: string,
  memberId: string,
  status: AttendanceStatus,
  comment: string | null
) {
  const { error } = await sb()
    .from("attendances")
    .upsert(
      {
        event_id: eventId,
        member_id: memberId,
        status,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,member_id" }
    );
  if (error) throw new Error(error.message);
  await log("attendance", eventId, memberId, "rsvp", `出欠を「${status}」に更新`);
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath(`/events/${eventId}`);
}

// ---------------------------------------------------------------------
// コート
// ---------------------------------------------------------------------
export interface CourtInput {
  name: string;
  address?: string | null;
  maps_url?: string | null;
  is_indoor?: boolean | null;
  court_count?: number | null;
  surface?: string | null;
  facilities?: string | null;
  fee?: string | null;
  booking?: string | null;
  outdoor_note?: string | null;
  note?: string | null;
}

function courtValues(input: CourtInput) {
  return {
    name: input.name.trim(),
    address: input.address || null,
    maps_url: input.maps_url || null,
    is_indoor: input.is_indoor ?? null,
    court_count: input.court_count ?? null,
    surface: input.surface || null,
    facilities: input.facilities || null,
    fee: input.fee || null,
    booking: input.booking || null,
    outdoor_note: input.outdoor_note || null,
    note: input.note || null,
  };
}

export async function createCourt(input: CourtInput, createdBy: string | null) {
  if (!input.name.trim()) throw new Error("コート名を入力してください");
  const { data, error } = await sb()
    .from("courts")
    .insert({ ...courtValues(input), created_by: createdBy })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await log("court", data.id, createdBy, "create", "コートを作成");
  revalidatePath("/courts");
  return data.id as string;
}

export async function updateCourt(
  id: string,
  input: CourtInput,
  memberId: string | null
) {
  const { error } = await sb()
    .from("courts")
    .update({ ...courtValues(input), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await log("court", id, memberId, "update", "コートを編集");
  revalidatePath("/courts");
  revalidatePath(`/courts/${id}`);
}

export async function archiveCourt(id: string, memberId: string | null) {
  const { error } = await sb()
    .from("courts")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await log("court", id, memberId, "archive", "コートをアーカイブ");
  revalidatePath("/courts");
}

/** 写真レコードを追加(Storageへのアップロードはクライアントで実施済み) */
export async function addCourtPhoto(
  courtId: string,
  url: string,
  storagePath: string,
  memberId: string | null
) {
  const { error } = await sb().from("court_photos").insert({
    court_id: courtId,
    url,
    storage_path: storagePath,
    created_by: memberId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/courts/${courtId}`);
  revalidatePath("/courts");
}

export async function deleteCourtPhoto(photoId: string, courtId: string) {
  const { error } = await sb().from("court_photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/courts/${courtId}`);
  revalidatePath("/courts");
}

/** 項目別評価をまとめて登録/更新(1メンバー分) */
export async function saveCourtReview(
  courtId: string,
  memberId: string,
  items: { review_item_id: string; score: number; comment: string | null }[]
) {
  const rows = items
    .filter((i) => i.score >= 1 && i.score <= 5)
    .map((i) => ({
      court_id: courtId,
      member_id: memberId,
      review_item_id: i.review_item_id,
      score: i.score,
      comment: i.comment || null,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) throw new Error("少なくとも1項目を評価してください");
  const { error } = await sb()
    .from("court_reviews")
    .upsert(rows, { onConflict: "court_id,member_id,review_item_id" });
  if (error) throw new Error(error.message);
  await log("court", courtId, memberId, "review", "コートを評価");
  revalidatePath(`/courts/${courtId}`);
  revalidatePath("/courts");
}

// ---------------------------------------------------------------------
// 試合結果(スコアボードから任意保存)
// ---------------------------------------------------------------------
export interface MatchInput {
  event_id?: string | null;
  mode: "singles" | "doubles";
  team1_names: string[];
  team2_names: string[];
  team1_score: number;
  team2_score: number;
  target_points: number;
  winner: number | null;
}

export async function saveMatch(input: MatchInput, createdBy: string | null) {
  const { data, error } = await sb()
    .from("matches")
    .insert({
      event_id: input.event_id || null,
      mode: input.mode,
      team1_names: input.team1_names,
      team2_names: input.team2_names,
      team1_score: input.team1_score,
      team2_score: input.team2_score,
      target_points: input.target_points,
      winner: input.winner,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await log("match", data.id, createdBy, "create", "試合結果を保存");
  revalidatePath("/");
  revalidatePath("/matches");
  if (input.event_id) revalidatePath(`/events/${input.event_id}`);
  return data.id as string;
}

export async function deleteMatch(id: string, memberId: string | null) {
  const { error } = await sb().from("matches").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await log("match", id, memberId, "delete", "試合結果を削除");
  revalidatePath("/");
  revalidatePath("/matches");
}

// ---------------------------------------------------------------------
// 大会
// ---------------------------------------------------------------------
export interface TournamentInput {
  name: string;
  format: TournamentFormat;
  discipline: "singles" | "doubles";
  event_id?: string | null;
}

export async function createTournament(
  input: TournamentInput,
  createdBy: string | null
) {
  if (!input.name.trim()) throw new Error("大会名を入力してください");
  const { data, error } = await sb()
    .from("tournaments")
    .insert({
      name: input.name.trim(),
      format: input.format,
      discipline: input.discipline,
      event_id: input.event_id || null,
      status: "draft",
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await log("tournament", data.id, createdBy, "create", "大会を作成");
  revalidatePath("/tournaments");
  return data.id as string;
}

export async function addTournamentEntries(
  tournamentId: string,
  names: string[]
) {
  const rows = names
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => ({ tournament_id: tournamentId, name }));
  if (rows.length === 0) return;
  const { error } = await sb().from("tournament_entries").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/tournaments/${tournamentId}`);
}

export async function deleteTournamentEntry(entryId: string, tournamentId: string) {
  const { error } = await sb()
    .from("tournament_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath(`/tournaments/${tournamentId}`);
}

/** 組み合わせを生成して開催中にする(既存の試合は作り直す) */
export async function generateBracket(tournamentId: string, memberId: string | null) {
  const client = sb();
  const { data: t, error: te } = await client
    .from("tournaments")
    .select("id, format")
    .eq("id", tournamentId)
    .single();
  if (te || !t) throw new Error("大会が見つかりません");

  const { data: entries } = await client
    .from("tournament_entries")
    .select("id, seed, created_at")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const list = (entries as Pick<TournamentEntry, "id">[]) ?? [];
  if (list.length < 2) throw new Error("参加者を2組以上登録してください");

  const ids = list.map((e) => e.id);
  const gen =
    t.format === "single_elim"
      ? generateSingleElim(ids)
      : generateRoundRobin(ids);

  // 既存の試合を削除して作り直し
  await client.from("tournament_matches").delete().eq("tournament_id", tournamentId);
  const rows = gen.map((m) => ({
    tournament_id: tournamentId,
    round: m.round,
    position: m.position,
    entry1_id: m.entry1_id,
    entry2_id: m.entry2_id,
    winner_entry_id: m.winner_entry_id,
    status: m.status,
  }));
  const { error } = await client.from("tournament_matches").insert(rows);
  if (error) throw new Error(error.message);
  await client
    .from("tournaments")
    .update({ status: "ongoing", champion: null, updated_at: new Date().toISOString() })
    .eq("id", tournamentId);
  await log("tournament", tournamentId, memberId, "generate", "組み合わせを生成");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
}

/**
 * 1回戦の組み合わせ入れ替え(2エントリーの配置を交換)。
 * シード順を入れ替えて再生成するため、不戦勝(BYE)の枠も正しく追従する。
 * 結果が1件でも入力済みの場合は不可。
 */
export async function swapTournamentEntries(
  tournamentId: string,
  entryIdA: string,
  entryIdB: string,
  memberId: string | null
) {
  const client = sb();

  // 実試合(両者確定)の結果が入力済みなら変更不可。BYE(片側のみ)は対象外
  const { data: ms } = await client
    .from("tournament_matches")
    .select("entry1_id, entry2_id, status")
    .eq("tournament_id", tournamentId);
  const played = (
    (ms as Pick<TournamentMatch, "entry1_id" | "entry2_id" | "status">[]) ?? []
  ).some((m) => m.status === "done" && m.entry1_id && m.entry2_id);
  if (played)
    throw new Error("結果の入力後は組み合わせを変更できません");

  // 現在の並び(生成時と同じ順序)を取得し、AとBを入れ替えて seed を振り直す
  const { data: entries } = await client
    .from("tournament_entries")
    .select("id")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const order = ((entries as { id: string }[]) ?? []).map((e) => e.id);
  const ia = order.indexOf(entryIdA);
  const ib = order.indexOf(entryIdB);
  if (ia < 0 || ib < 0) throw new Error("エントリーが見つかりません");
  [order[ia], order[ib]] = [order[ib], order[ia]];
  for (let i = 0; i < order.length; i++) {
    await client
      .from("tournament_entries")
      .update({ seed: i + 1 })
      .eq("id", order[i]);
  }

  await log("tournament", tournamentId, memberId, "swap", "組み合わせを入れ替え");
  // 同じ順序ロジックで再生成(BYE解決込み)
  await generateBracket(tournamentId, memberId);
}

/** 試合結果を入力(勝者判定・トーナメントは勝ち上がり反映) */
export async function setTournamentMatchResult(
  matchId: string,
  score1: number,
  score2: number,
  memberId: string | null
) {
  const client = sb();
  const { data: m, error: me } = await client
    .from("tournament_matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (me || !m) throw new Error("試合が見つかりません");
  const match = m as TournamentMatch;
  if (!match.entry1_id || !match.entry2_id)
    throw new Error("対戦相手が未確定です");

  const winner =
    score1 === score2 ? null : score1 > score2 ? match.entry1_id : match.entry2_id;
  if (!winner) throw new Error("引き分けは記録できません(2点差で決着)");

  await client
    .from("tournament_matches")
    .update({ score1, score2, winner_entry_id: winner, status: "done" })
    .eq("id", matchId);

  const { data: t } = await client
    .from("tournaments")
    .select("id, format")
    .eq("id", match.tournament_id)
    .single();

  if (t?.format === "single_elim") {
    const { data: maxRow } = await client
      .from("tournament_matches")
      .select("round")
      .eq("tournament_id", match.tournament_id)
      .order("round", { ascending: false })
      .limit(1)
      .single();
    const maxRound = (maxRow?.round as number) ?? match.round;
    if (match.round < maxRound) {
      const nextPos = Math.floor(match.position / 2);
      const { data: nm } = await client
        .from("tournament_matches")
        .select("id")
        .eq("tournament_id", match.tournament_id)
        .eq("round", match.round + 1)
        .eq("position", nextPos)
        .single();
      if (nm) {
        const slot =
          match.position % 2 === 0
            ? { entry1_id: winner }
            : { entry2_id: winner };
        await client.from("tournament_matches").update(slot).eq("id", nm.id);
      }
    } else {
      // 決勝 → 優勝者確定
      const { data: champ } = await client
        .from("tournament_entries")
        .select("name")
        .eq("id", winner)
        .single();
      await client
        .from("tournaments")
        .update({
          champion: champ?.name ?? null,
          status: "done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.tournament_id);
    }
  } else if (t?.format === "round_robin") {
    // 全試合終了なら優勝者(順位1位)を記録
    const [{ data: allMatches }, { data: entries }] = await Promise.all([
      client.from("tournament_matches").select("*").eq("tournament_id", match.tournament_id),
      client.from("tournament_entries").select("id, name").eq("tournament_id", match.tournament_id),
    ]);
    const ms = (allMatches as TournamentMatch[]) ?? [];
    if (ms.length > 0 && ms.every((x) => x.status === "done")) {
      const ents = (entries as { id: string; name: string }[]) ?? [];
      const standings = computeStandings(
        ents.map((e) => e.id),
        ms
      );
      const topId = standings[0]?.entryId;
      const champname = ents.find((e) => e.id === topId)?.name ?? null;
      await client
        .from("tournaments")
        .update({ champion: champname, status: "done", updated_at: new Date().toISOString() })
        .eq("id", match.tournament_id);
    }
  }

  await log("tournament", match.tournament_id, memberId, "result", "試合結果を入力");
  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath("/tournaments");
}

export async function setMatchCourt(matchId: string, court: string, tournamentId: string) {
  const { error } = await sb()
    .from("tournament_matches")
    .update({ court: court || null })
    .eq("id", matchId);
  if (error) throw new Error(error.message);
  revalidatePath(`/tournaments/${tournamentId}`);
}

export async function archiveTournament(id: string, memberId: string | null) {
  const { error } = await sb()
    .from("tournaments")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await log("tournament", id, memberId, "archive", "大会をアーカイブ");
  revalidatePath("/tournaments");
}
