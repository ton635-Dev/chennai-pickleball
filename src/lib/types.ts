// ドメイン型(Phase 1)

export type AttendanceStatus = "join" | "maybe" | "no";

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  join: "参加",
  maybe: "未定",
  no: "不参加",
};

export interface Member {
  id: string;
  name: string;
  created_at: string;
}

export interface EventRow {
  id: string;
  event_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  place_name: string | null;
  maps_url: string | null;
  fee: string | null;
  rsvp_deadline: string | null; // ISO
  note: string | null;
  created_by: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  event_id: string;
  member_id: string;
  status: AttendanceStatus;
  comment: string | null;
  updated_at: string;
}

// 出欠 + メンバー名を結合した表示用
export interface AttendanceWithMember extends Attendance {
  member: Pick<Member, "id" | "name">;
}

// イベント + 出欠集計 + 参加者(表示用)
export interface EventWithAttendance extends EventRow {
  attendances: AttendanceWithMember[];
  counts: Record<AttendanceStatus, number>;
}

export interface MatchRow {
  id: string;
  event_id: string | null;
  mode: "singles" | "doubles";
  team1_names: string[];
  team2_names: string[];
  team1_score: number;
  team2_score: number;
  target_points: number;
  winner: number | null;
  created_by: string | null;
  created_at: string;
}
