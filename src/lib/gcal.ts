import type { EventRow } from "./types";
import { eventUrl } from "./whatsapp";

// チェンナイのタイムゾーン。端末の設定に関わらず正しい時刻で登録される
const TZ = "Asia/Kolkata";

const pad = (n: number) => String(n).padStart(2, "0");

/** 日付+時刻を「ローカル壁時計」のまま Date(UTC容器) に載せる */
function wall(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh = 0, mm = 0] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

/** Googleカレンダー用 "YYYYMMDDTHHMMSS" */
function fmtDateTime(dt: Date): string {
  return (
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
    `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`
  );
}

/** 終日イベント用 "YYYYMMDD" */
function fmtDate(dt: Date): string {
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
}

/**
 * 「Googleカレンダーに追加」リンクを生成。
 * タップすると日時・場所・メモ入りの予定作成画面が開き、各自が保存できる。
 * - 開始時刻あり: 時間指定(終了なしは開始+2時間)
 * - 開始時刻なし: 終日イベント
 */
export function buildGoogleCalendarUrl(ev: EventRow, appUrl: string): string {
  const title = ev.place_name
    ? `ピックルボール @ ${ev.place_name}`
    : "ピックルボール活動";

  let dates: string;
  if (ev.start_time) {
    const start = wall(ev.event_date, ev.start_time);
    const end = ev.end_time
      ? wall(ev.event_date, ev.end_time)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    dates = `${fmtDateTime(start)}/${fmtDateTime(end)}`;
  } else {
    const day = wall(ev.event_date, "00:00");
    const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    dates = `${fmtDate(day)}/${fmtDate(next)}`;
  }

  const details: string[] = [];
  if (ev.note) details.push(ev.note);
  if (ev.maps_url) details.push(`地図: ${ev.maps_url}`);
  details.push(`出欠登録: ${eventUrl(appUrl, ev.id)}`);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    ctz: TZ,
    details: details.join("\n"),
  });
  if (ev.place_name) params.set("location", ev.place_name);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
