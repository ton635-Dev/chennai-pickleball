import type {
  AttendanceStatus,
  EventWithAttendance,
  EventRow,
} from "./types";
import { formatDateJa, formatTimeRange, formatDeadline } from "./format";

// 注意: WhatsApp告知テキストには絵文字を使わない。
// 一部端末・OSで4バイト絵文字が文字化け(�)するため、日本語と記号(▼・-)のみで整形する。

/** 出欠登録用のイベントURL */
export function eventUrl(appUrl: string, eventId: string): string {
  return `${appUrl.replace(/\/$/, "")}/events/${eventId}`;
}

/**
 * 活動日の告知テキスト(WhatsAppにそのまま貼れる形式)を生成。
 * 参加者リストは含めない(告知=通知のみ)。Google Maps リンクを含む。
 */
export function buildAnnouncementText(ev: EventRow, appUrl: string): string {
  const lines: string[] = [];
  lines.push("【ピックルボール活動のお知らせ】");
  lines.push("");
  const range = formatTimeRange(ev.start_time, ev.end_time);
  lines.push(`日時: ${formatDateJa(ev.event_date)}${range ? ` ${range}` : ""}`);
  if (ev.place_name) lines.push(`場所: ${ev.place_name}`);
  if (ev.maps_url) lines.push(`地図: ${ev.maps_url}`);
  if (ev.court_fee != null)
    lines.push(`コート使用費: ₹${ev.court_fee}(参加者で割り勘)`);
  else if (ev.fee) lines.push(`参加費: ${ev.fee}`);
  if (ev.rsvp_deadline)
    lines.push(`出欠締切: ${formatDeadline(ev.rsvp_deadline)}`);
  if (ev.note) {
    lines.push("");
    lines.push(`メモ: ${ev.note}`);
  }
  lines.push("");
  lines.push("▼ 出欠の登録はこちら");
  lines.push(eventUrl(appUrl, ev.id));
  return lines.join("\n");
}

const STATUS_ORDER: AttendanceStatus[] = ["join", "maybe", "no"];
const STATUS_HEAD: Record<AttendanceStatus, string> = {
  join: "参加",
  maybe: "未定",
  no: "不参加",
};

/**
 * 現在の参加者リストのテキスト(途中経過共有用・任意)。
 */
export function buildRosterText(
  ev: EventWithAttendance,
  appUrl: string
): string {
  const lines: string[] = [];
  const range = formatTimeRange(ev.start_time, ev.end_time);
  lines.push(
    `${formatDateJa(ev.event_date)}${range ? ` ${range}` : ""} 参加状況`
  );
  if (ev.place_name) lines.push(`場所: ${ev.place_name}`);
  lines.push("");

  for (const status of STATUS_ORDER) {
    const list = ev.attendances.filter((a) => a.status === status);
    lines.push(`${STATUS_HEAD[status]} (${list.length}名)`);
    if (list.length === 0) {
      lines.push("  なし");
    } else {
      for (const a of list) {
        const cmt = a.comment ? ` (${a.comment})` : "";
        lines.push(`  - ${a.member.name}${cmt}`);
      }
    }
    lines.push("");
  }
  lines.push("▼ 出欠の登録はこちら");
  lines.push(eventUrl(appUrl, ev.id));
  return lines.join("\n");
}

/** wa.me 共有リンク(テキストを事前入力した状態でWhatsAppを開く) */
export function waShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
