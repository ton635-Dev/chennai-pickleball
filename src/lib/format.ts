import type { EventRow } from "./types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-07-26" -> Date(ローカル正午でタイムゾーンずれを回避) */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

/** "2026-07-26" -> "7/26 (土)" */
export function formatDateJa(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

/** 曜日1文字 */
export function weekdayJa(dateStr: string): string {
  return WEEKDAYS[parseDate(dateStr).getDay()];
}

/** "06:30:00" -> "6:30" */
export function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${Number(h)}:${m}`;
}

/** 開始–終了 "6:30 – 9:00"(片方だけでも可) */
export function formatTimeRange(
  start: string | null,
  end: string | null
): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/** イベント1行の日時サマリ "7/26 (土) 6:30 – 9:00" */
export function formatEventWhen(ev: EventRow): string {
  const range = formatTimeRange(ev.start_time, ev.end_time);
  return `${formatDateJa(ev.event_date)}${range ? ` ${range}` : ""}`;
}

/** ISO日時 -> "7/25 (金) 12:00" */
export function formatDeadline(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const wd = WEEKDAYS[d.getDay()];
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${md} (${wd}) ${hh}:${mm}`;
}

/** 表示名の先頭1文字(アバター用) */
export function initial(name: string): string {
  return name.trim().charAt(0) || "?";
}

/** 今日以降のイベントか(YYYY-MM-DD 比較) */
export function isUpcoming(dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateStr >= todayStr;
}
