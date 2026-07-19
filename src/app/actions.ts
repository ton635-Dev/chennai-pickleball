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
