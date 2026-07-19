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
  upi_qr_url?: string | null;
  upi_qr_path?: string | null;
}

export interface EventRow {
  id: string;
  event_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  court_id: string | null;
  place_name: string | null;
  maps_url: string | null;
  fee: string | null; // 旧・参加費(自由入力)。court_fee 導入後は未使用
  court_fee: number | null; // コート使用費 合計(₹)
  fee_split_count: number | null; // 割り勘人数(null=参加人数で自動)
  payer_member_id: string | null; // コート代の立替者
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

// 立替者の表示情報(UPIコード込み)
export interface PayerInfo {
  id: string;
  name: string;
  upi_qr_url: string | null;
}

// イベント + 出欠集計 + 参加者(表示用)
export interface EventWithAttendance extends EventRow {
  attendances: AttendanceWithMember[];
  counts: Record<AttendanceStatus, number>;
  payer?: PayerInfo | null;
}

export type TournamentFormat = "single_elim" | "round_robin";
export type TournamentStatus = "draft" | "ongoing" | "done";

export interface Tournament {
  id: string;
  name: string;
  event_id: string | null;
  format: TournamentFormat;
  discipline: "singles" | "doubles";
  status: TournamentStatus;
  champion: string | null;
  created_by: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface TournamentEntry {
  id: string;
  tournament_id: string;
  name: string;
  seed: number | null;
  member1_id: string | null;
  member2_id: string | null;
  created_at: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  entry1_id: string | null;
  entry2_id: string | null;
  score1: number | null;
  score2: number | null;
  winner_entry_id: string | null;
  status: "pending" | "done";
  court: string | null;
  created_at: string;
}

export interface CourtRow {
  id: string;
  name: string;
  address: string | null;
  maps_url: string | null;
  is_indoor: boolean | null;
  court_count: number | null;
  surface: string | null;
  facilities: string | null;
  fee: string | null;
  booking: string | null;
  outdoor_note: string | null;
  note: string | null;
  created_by: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourtPhoto {
  id: string;
  court_id: string;
  url: string;
  storage_path: string | null;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface CourtReview {
  id: string;
  court_id: string;
  member_id: string;
  review_item_id: string;
  score: number;
  comment: string | null;
  updated_at: string;
}

export interface CourtReviewWithMember extends CourtReview {
  member: Pick<Member, "id" | "name">;
}

// 項目ごとの平均点
export interface ItemAverage {
  item: ReviewItem;
  average: number | null;
  count: number;
}

// 一覧表示用(集計込み)
export interface CourtSummary extends CourtRow {
  photoUrl: string | null;
  overallAverage: number | null;
  reviewerCount: number;
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
