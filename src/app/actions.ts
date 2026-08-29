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
  computeTeamStandings,
  summarizeTie,
} from "@/lib/tournament";
import type { TieGame } from "@/lib/types";

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

/** DUPRレーティングを設定/更新/クリア(null)。手入力運用のため誰でも編集可 */
export async function updateMemberDupr(
  id: string,
  dupr: number | null,
  actorId: string | null
) {
  if (dupr !== null && (!Number.isFinite(dupr) || dupr < 2 || dupr > 8)) {
    throw new Error("DUPRは2.0〜8.0の範囲で入力してください");
  }
  const { error } = await sb().from("members").update({ dupr }).eq("id", id);
  if (error) throw new Error(error.message);
  await log(
    "member",
    id,
    actorId,
    "dupr",
    dupr === null ? "DUPRをクリア" : `DUPRを${dupr}に設定`
  );
  revalidatePath("/more");
}

/** DUPRプレイヤー検索(連携用)。DUPR未設定環境ではエラー */
export async function searchDupr(query: string) {
  const { searchDuprPlayers } = await import("@/lib/dupr");
  if (!query.trim()) return [];
  return searchDuprPlayers(query);
}

/** DUPRプロフィールをひも付けて、現在のレーティングを反映 */
export async function linkMemberDupr(
  memberId: string,
  playerId: number,
  duprId: string | null,
  doubles: number | null,
  actorId: string | null
) {
  const { error } = await sb()
    .from("members")
    .update({
      dupr_player_id: playerId,
      dupr_dupr_id: duprId,
      dupr: doubles,
      dupr_updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  await log(
    "member",
    memberId,
    actorId,
    "dupr",
    `DUPRプロフィールを連携(${duprId ?? playerId}${doubles != null ? `・${doubles}` : ""})`
  );
  revalidatePath("/more");
}

/** DUPR連携を解除(表示中のレーティングは残す) */
export async function unlinkMemberDupr(memberId: string, actorId: string | null) {
  const { error } = await sb()
    .from("members")
    .update({ dupr_player_id: null, dupr_dupr_id: null, dupr_updated_at: null })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  await log("member", memberId, actorId, "dupr", "DUPR連携を解除");
  revalidatePath("/more");
}

/** 連携済み全メンバーのレーティングをDUPRから再取得 */
export async function refreshDuprRatings(actorId: string | null) {
  const { getDuprPlayer, duprConfigured } = await import("@/lib/dupr");
  if (!duprConfigured()) throw new Error("DUPR連携が設定されていません");
  const { data, error } = await sb()
    .from("members")
    .select("id, name, dupr, dupr_player_id")
    .not("dupr_player_id", "is", null);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as {
    id: string;
    name: string;
    dupr: number | null;
    dupr_player_id: number;
  }[];
  let updated = 0;
  for (const m of rows) {
    const p = await getDuprPlayer(m.dupr_player_id);
    if (!p) continue; // 一時的な取得失敗はスキップ(既存値を保持)
    await sb()
      .from("members")
      .update({ dupr: p.doubles, dupr_updated_at: new Date().toISOString() })
      .eq("id", m.id);
    if (p.doubles !== m.dupr) updated++;
  }
  if (rows.length > 0) {
    await log(
      "member",
      null,
      actorId,
      "dupr",
      `DUPRを一括更新(対象${rows.length}名・変動${updated}名)`
    );
  }
  revalidatePath("/more");
  return { total: rows.length, updated };
}

/** UPIコード(QR画像)を登録/差し替え。Storageへのアップロードはクライアントで実施済み */
export async function setMemberUpiQr(
  memberId: string,
  url: string,
  path: string
) {
  const { error } = await sb()
    .from("members")
    .update({ upi_qr_url: url, upi_qr_path: path })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  await log("member", memberId, memberId, "upi", "UPIコードを登録");
  revalidatePath("/more");
}

export async function clearMemberUpiQr(memberId: string) {
  const { error } = await sb()
    .from("members")
    .update({ upi_qr_url: null, upi_qr_path: null })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  await log("member", memberId, memberId, "upi", "UPIコードを削除");
  revalidatePath("/more");
}

export async function deleteMember(id: string, byMemberId: string | null) {
  const { error } = await sb().from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // 自分自身を削除した場合は監査ログの member_id は null にする(FK回避)
  await log("member", id, byMemberId === id ? null : byMemberId, "delete", "メンバーを削除");
  revalidatePath("/");
  revalidatePath("/more");
}

/**
 * 同じ表示名のメンバーを探す(重複登録の防止用)。
 * 前後の空白と大文字小文字を無視して比較する。
 */
export async function findMembersByName(
  name: string,
  excludeId?: string
): Promise<{ id: string; name: string }[]> {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const { data } = await sb().from("members").select("id, name");
  const key = trimmed.toLowerCase();
  return ((data as { id: string; name: string }[]) ?? []).filter(
    (m) => m.name.trim().toLowerCase() === key && m.id !== excludeId
  );
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
  court_fee?: number | null;
  fee_split_count?: number | null;
  payer_member_id?: string | null;
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
      court_fee: input.court_fee ?? null,
      fee_split_count: input.fee_split_count ?? null,
      payer_member_id: input.payer_member_id || null,
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
      court_fee: input.court_fee ?? null,
      fee_split_count: input.fee_split_count ?? null,
      payer_member_id: input.payer_member_id || null,
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
  /** undefined = 既存コメントを保持 / null = クリア */
  comment?: string | null,
  /** 同伴者(大人/子供)。undefined = 既存値を保持 */
  extras?: { adults: number; children: number }
) {
  // upsert は「渡したカラムだけ」更新されるため、
  // undefined の項目はオブジェクトに含めず既存値を保持する
  const row: Record<string, unknown> = {
    event_id: eventId,
    member_id: memberId,
    status,
    updated_at: new Date().toISOString(),
  };
  if (comment !== undefined) row.comment = comment || null;
  if (extras !== undefined) {
    row.extra_adults = Math.max(0, Math.min(20, Math.floor(extras.adults)));
    row.extra_children = Math.max(0, Math.min(20, Math.floor(extras.children)));
  }
  const { error } = await sb()
    .from("attendances")
    .upsert(row, { onConflict: "event_id,member_id" });
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
  /** 団体戦: 1対戦あたりのゲーム数(既定3) */
  games_per_tie?: number;
  /** 団体戦: 1ゲームの点数(既定7) */
  points_per_game?: number;
  /** 団体戦: 想定チーム数(未指定=人数から自動) */
  team_count?: number | null;
  /** 団体戦: 1チームの人数(下限・上限。既定3〜4) */
  team_size_min?: number;
  team_size_max?: number;
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
      discipline: input.format === "team_league" ? "doubles" : input.discipline,
      event_id: input.event_id || null,
      status: "draft",
      created_by: createdBy,
      games_per_tie: input.games_per_tie ?? 3,
      points_per_game: input.points_per_game ?? 7,
      team_count: input.team_count ?? null,
      team_size_min: input.team_size_min ?? 3,
      team_size_max: input.team_size_max ?? 4,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await log("tournament", data.id, createdBy, "create", "大会を作成");
  revalidatePath("/tournaments");
  return data.id as string;
}

/** 大会に設定された1チームの人数(下限・上限)を取得 */
async function teamSizeRange(
  tournamentId: string
): Promise<{ min: number; max: number }> {
  const { data } = await sb()
    .from("tournaments")
    .select("team_size_min, team_size_max")
    .eq("id", tournamentId)
    .maybeSingle();
  const row = data as { team_size_min?: number; team_size_max?: number } | null;
  return { min: row?.team_size_min ?? 3, max: row?.team_size_max ?? 4 };
}

/** 団体戦: チーム(チーム名 + 構成メンバー)を追加 */
export async function addTeamEntry(
  tournamentId: string,
  teamName: string,
  playerNames: string[]
) {
  const name = teamName.trim();
  const players = playerNames.map((p) => p.trim()).filter(Boolean);
  if (!name) throw new Error("チーム名を入力してください");
  const { min, max } = await teamSizeRange(tournamentId);
  if (players.length < min || players.length > max)
    throw new Error(
      min === max
        ? `チームのメンバーは${min}人で入力してください`
        : `チームのメンバーは${min}〜${max}人で入力してください`
    );
  const { error } = await sb().from("tournament_entries").insert({
    tournament_id: tournamentId,
    name,
    player_names: players,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/tournaments/${tournamentId}`);
}

/** 自動振り分け結果などのチームを一括登録 */
export async function addTeamEntriesBulk(
  tournamentId: string,
  teams: { name: string; players: string[] }[]
) {
  const { min, max } = await teamSizeRange(tournamentId);
  const rows = teams.map((t) => {
    const name = t.name.trim();
    const players = t.players.map((p) => p.trim()).filter(Boolean);
    if (!name) throw new Error("チーム名が空です");
    if (players.length < min || players.length > max)
      throw new Error(
        `「${name}」のメンバーは${min === max ? `${min}人` : `${min}〜${max}人`}にしてください`
      );
    return { tournament_id: tournamentId, name, player_names: players };
  });
  if (rows.length === 0) return;
  const { error } = await sb().from("tournament_entries").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/tournaments/${tournamentId}`);
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

/**
 * 団体戦: チームのメンバー構成をまとめて更新(入れ替え用)。
 * 1人の移動でも「移動元」「移動先」2チーム分を同時に保存するため配列で受ける。
 * 各チームの人数は大会設定の下限〜上限に収まっていること。
 */
export async function updateTeamRosters(
  tournamentId: string,
  rosters: { entryId: string; players: string[] }[]
) {
  const client = sb();
  const { min, max } = await teamSizeRange(tournamentId);

  const cleaned = rosters.map((r) => {
    const players = r.players.map((p) => p.trim()).filter(Boolean);
    return { entryId: r.entryId, players };
  });

  // 同一メンバーが複数チームに入っていないか
  const seen = new Set<string>();
  for (const r of cleaned) {
    for (const p of r.players) {
      if (seen.has(p)) throw new Error(`「${p}」が複数のチームに入っています`);
      seen.add(p);
    }
  }

  // 人数チェック(名前は後で引き当てるため先に取得)
  const { data: es } = await client
    .from("tournament_entries")
    .select("id, name")
    .eq("tournament_id", tournamentId);
  const nameOf = new Map(
    ((es as { id: string; name: string }[]) ?? []).map((e) => [e.id, e.name])
  );
  for (const r of cleaned) {
    if (r.players.length < min || r.players.length > max)
      throw new Error(
        `「${nameOf.get(r.entryId) ?? "チーム"}」のメンバーは${
          min === max ? `${min}人` : `${min}〜${max}人`
        }にしてください(現在${r.players.length}人)`
      );
  }

  for (const r of cleaned) {
    const { error } = await client
      .from("tournament_entries")
      .update({ player_names: r.players })
      .eq("id", r.entryId);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/tournaments/${tournamentId}`);
}

/** エントリー名(チーム名/ペア名/選手名)を変更 */
export async function renameTournamentEntry(
  entryId: string,
  tournamentId: string,
  newName: string
) {
  const name = newName.trim();
  if (!name) throw new Error("名前を入力してください");
  const { error } = await sb()
    .from("tournament_entries")
    .update({ name })
    .eq("id", entryId);
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

/**
 * 団体戦: 1対戦のゲーム内訳を保存。
 * 全ゲームのスコアが揃ったら勝敗を確定し、全対戦終了で優勝チームを記録
 * (順位は 勝敗 → 勝ゲーム数 → 得失点差)。
 */
/**
 * 大会の1対戦のゲーム結果を試合履歴(matches)に同期する。
 * - スコアが入っているゲームだけを1試合として計上
 * - 出場ペアが入力済みならその選手名、未入力ならチーム名で記録
 * - (tie_match_id, tie_game_no) で upsert するため再入力でも重複しない
 * - スコアを消したゲームの履歴は削除する
 */
async function syncTieToHistory(
  matchId: string,
  tournamentId: string,
  entry1Id: string,
  entry2Id: string,
  games: TieGame[],
  memberId: string | null
) {
  const client = sb();
  try {
    const { data: es } = await client
      .from("tournament_entries")
      .select("id, name")
      .in("id", [entry1Id, entry2Id]);
    const nameOf = new Map(
      ((es as { id: string; name: string }[]) ?? []).map((e) => [e.id, e.name])
    );
    const team1 = nameOf.get(entry1Id) ?? "チーム1";
    const team2 = nameOf.get(entry2Id) ?? "チーム2";

    // 出場ペアがあれば選手名の配列に、なければチーム名1件
    const namesOf = (pair: string | null | undefined, teamName: string) => {
      const parts = (pair ?? "")
        .split("・")
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length > 0 ? parts : [teamName];
    };

    const played = games.filter((g) => g.s1 != null && g.s2 != null);
    const rows = played.map((g) => ({
      tournament_id: tournamentId,
      tie_match_id: matchId,
      tie_game_no: g.g,
      event_id: null,
      mode: "doubles" as const,
      team1_names: namesOf(g.p1, team1),
      team2_names: namesOf(g.p2, team2),
      team1_score: g.s1 as number,
      team2_score: g.s2 as number,
      target_points: 0, // 大会設定の点数は下で上書き
      winner: (g.s1 as number) > (g.s2 as number) ? 1 : 2,
      created_by: memberId,
    }));

    // 大会の1ゲーム点数を target_points に入れる
    const { data: t } = await client
      .from("tournaments")
      .select("points_per_game")
      .eq("id", tournamentId)
      .maybeSingle();
    const pts = (t?.points_per_game as number) ?? 7;
    for (const r of rows) r.target_points = pts;

    if (rows.length > 0) {
      const { error } = await client
        .from("matches")
        .upsert(rows, { onConflict: "tie_match_id,tie_game_no" });
      if (error) throw error;
    }

    // スコアが未入力に戻ったゲームの履歴は削除
    const playedNos = played.map((g) => g.g);
    let del = client.from("matches").delete().eq("tie_match_id", matchId);
    if (playedNos.length > 0) {
      del = del.not("tie_game_no", "in", `(${playedNos.join(",")})`);
    }
    await del;

    revalidatePath("/matches");
    revalidatePath("/");
  } catch (e) {
    // マイグレーション未実行(カラム/インデックスなし)の場合だけ黙って無視する。
    // それ以外の失敗は呼び出し側に伝えて気づけるようにする。
    const msg = e instanceof Error ? e.message : String(e);
    const notMigrated =
      /column .*(tie_match_id|tie_game_no|tournament_id)/i.test(msg) ||
      /schema cache/i.test(msg);
    if (!notMigrated) {
      throw new Error(`履歴への計上に失敗しました: ${msg}`);
    }
  }
}

export async function setTieResult(
  matchId: string,
  games: TieGame[],
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

  const { data: t } = await client
    .from("tournaments")
    .select("id, games_per_tie")
    .eq("id", match.tournament_id)
    .single();
  const perTie = (t?.games_per_tie as number) ?? 3;

  // 入力の正規化(ゲーム番号順・点数は0以上の整数のみ)
  const clean: TieGame[] = games.slice(0, perTie).map((g, i) => ({
    g: i + 1,
    s1: g.s1 != null && g.s1 >= 0 ? Math.floor(g.s1) : null,
    s2: g.s2 != null && g.s2 >= 0 ? Math.floor(g.s2) : null,
    p1: g.p1?.trim() || null,
    p2: g.p2?.trim() || null,
  }));
  for (const g of clean) {
    if ((g.s1 == null) !== (g.s2 == null))
      throw new Error(`ゲーム${g.g}は両チームのスコアを入力してください`);
    if (g.s1 != null && g.s2 != null && g.s1 === g.s2)
      throw new Error(`ゲーム${g.g}が同点です(勝敗をつけてください)`);
  }

  const s = summarizeTie(clean);
  const allPlayed = s.played === perTie;
  const winner = !allPlayed
    ? null
    : s.gamesWon1 > s.gamesWon2
      ? match.entry1_id
      : match.entry2_id;

  const { error } = await client
    .from("tournament_matches")
    .update({
      games: clean,
      score1: s.gamesWon1,
      score2: s.gamesWon2,
      winner_entry_id: winner,
      status: allPlayed ? "done" : "pending",
    })
    .eq("id", matchId);
  if (error) throw new Error(error.message);

  // 結果を未確定に戻した場合は大会も開催中に戻す
  if (!allPlayed) {
    await client
      .from("tournaments")
      .update({ status: "ongoing", champion: null, updated_at: new Date().toISOString() })
      .eq("id", match.tournament_id)
      .eq("status", "done");
  }

  // 全対戦が終わったら優勝チームを記録
  if (allPlayed) {
    const [{ data: allMatches }, { data: entries }] = await Promise.all([
      client
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", match.tournament_id),
      client
        .from("tournament_entries")
        .select("id, name")
        .eq("tournament_id", match.tournament_id),
    ]);
    const ms = (allMatches as TournamentMatch[]) ?? [];
    if (ms.length > 0 && ms.every((x) => x.status === "done")) {
      const ents = (entries as { id: string; name: string }[]) ?? [];
      const standings = computeTeamStandings(
        ents.map((e) => e.id),
        ms
      );
      const champName =
        ents.find((e) => e.id === standings[0]?.entryId)?.name ?? null;
      await client
        .from("tournaments")
        .update({
          champion: champName,
          status: "done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.tournament_id);
    }
  }

  // 各ゲームを試合履歴へ計上
  await syncTieToHistory(
    matchId,
    match.tournament_id,
    match.entry1_id,
    match.entry2_id,
    clean,
    memberId
  );

  await log("tournament", match.tournament_id, memberId, "result", "対戦結果を入力");
  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath("/tournaments");
}

/** スコアボード起動用: 対戦1件の情報(チーム名・メンバー・設定)を取得 */
export async function getTieForScoreboard(matchId: string): Promise<{
  tournamentId: string;
  tournamentName: string;
  gamesPerTie: number;
  pointsPerGame: number;
  name1: string;
  name2: string;
  players1: string[];
  players2: string[];
  games: TieGame[];
} | null> {
  const client = sb();
  const { data: m } = await client
    .from("tournament_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (!m) return null;
  const match = m as TournamentMatch;
  const [{ data: t }, { data: es }] = await Promise.all([
    client
      .from("tournaments")
      .select("id, name, games_per_tie, points_per_game")
      .eq("id", match.tournament_id)
      .maybeSingle(),
    client
      .from("tournament_entries")
      .select("id, name, player_names")
      .in(
        "id",
        [match.entry1_id, match.entry2_id].filter(Boolean) as string[]
      ),
  ]);
  const list = (es as { id: string; name: string; player_names: string[] }[]) ?? [];
  const e1 = list.find((e) => e.id === match.entry1_id);
  const e2 = list.find((e) => e.id === match.entry2_id);
  return {
    tournamentId: match.tournament_id,
    tournamentName: (t?.name as string) ?? "",
    gamesPerTie: (t?.games_per_tie as number) ?? 3,
    pointsPerGame: (t?.points_per_game as number) ?? 7,
    name1: e1?.name ?? "チーム1",
    name2: e2?.name ?? "チーム2",
    players1: e1?.player_names ?? [],
    players2: e2?.player_names ?? [],
    games: (match.games as TieGame[]) ?? [],
  };
}

/**
 * 大会の対戦のうち1ゲームだけスコアを保存(スコアボードからの記録用)。
 * 他のゲームは既存の値を維持し、勝敗判定は setTieResult に委譲する。
 */
export async function setTieGameScore(
  matchId: string,
  gameNo: number,
  score1: number,
  score2: number,
  pair1: string | null,
  pair2: string | null,
  memberId: string | null
) {
  const client = sb();
  const { data: m } = await client
    .from("tournament_matches")
    .select("games, tournament_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!m) throw new Error("試合が見つかりません");
  const { data: t } = await client
    .from("tournaments")
    .select("games_per_tie")
    .eq("id", (m as { tournament_id: string }).tournament_id)
    .maybeSingle();
  const perTie = (t?.games_per_tie as number) ?? 3;
  const existing = ((m as { games?: TieGame[] }).games ?? []) as TieGame[];

  const merged: TieGame[] = Array.from({ length: perTie }, (_, i) => {
    const no = i + 1;
    const prev = existing.find((g) => g.g === no);
    if (no === gameNo) {
      return {
        g: no,
        s1: score1,
        s2: score2,
        p1: pair1?.trim() || prev?.p1 || null,
        p2: pair2?.trim() || prev?.p2 || null,
      };
    }
    return {
      g: no,
      s1: prev?.s1 ?? null,
      s2: prev?.s2 ?? null,
      p1: prev?.p1 ?? null,
      p2: prev?.p2 ?? null,
    };
  });

  await setTieResult(matchId, merged, memberId);
}

/**
 * 既存の大会(団体戦)の入力済み結果を、まとめて試合履歴へ取り込む。
 * すでに計上済みのゲームは上書きされるだけなので、何度実行しても重複しない。
 */
export async function importTournamentsToHistory(
  memberId: string | null
): Promise<{ tournaments: number; games: number }> {
  const client = sb();
  const { data: ts } = await client
    .from("tournaments")
    .select("id")
    .eq("format", "team_league")
    .eq("archived", false);
  const tournamentIds = ((ts as { id: string }[]) ?? []).map((t) => t.id);
  if (tournamentIds.length === 0) return { tournaments: 0, games: 0 };

  const { data: ms } = await client
    .from("tournament_matches")
    .select("id, tournament_id, entry1_id, entry2_id, games")
    .in("tournament_id", tournamentIds);

  let games = 0;
  const touched = new Set<string>();
  for (const m of (ms as (Pick<
    TournamentMatch,
    "id" | "tournament_id" | "entry1_id" | "entry2_id"
  > & { games?: TieGame[] })[]) ?? []) {
    if (!m.entry1_id || !m.entry2_id) continue;
    const list = (m.games ?? []).filter((g) => g.s1 != null && g.s2 != null);
    if (list.length === 0) continue;
    await syncTieToHistory(
      m.id,
      m.tournament_id,
      m.entry1_id,
      m.entry2_id,
      m.games ?? [],
      memberId
    );
    games += list.length;
    touched.add(m.tournament_id);
  }

  revalidatePath("/matches");
  revalidatePath("/");
  return { tournaments: touched.size, games };
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
