"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/lib/types";

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
  return data.id as string;
}
