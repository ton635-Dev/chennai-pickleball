// 掲示板の表示用ヘルパー(サーバー/クライアント共通)
import type { BoardCategory, BoardKind, BoardPost, BoardStatus } from "./types";
import { formatDateJa, formatTimeRange } from "./format";
import { CALENDAR_TZ } from "./branding";

export const KIND_LABEL: Record<BoardKind, string> = {
  external: "外部大会",
  circle: "サークルイベント",
  other: "その他",
};

/** 一覧のバッジ色(種類ごと) */
export const KIND_CLASS: Record<BoardKind, string> = {
  external: "bg-[#E1F5EE] text-[#085041]",
  circle: "bg-[#EEEDFE] text-[#3C3489]",
  other: "bg-[#EDF1EF] text-muted",
};

export const CATEGORY_LABEL: Record<BoardCategory, string> = {
  md: "男子ダブルス",
  wd: "女子ダブルス",
  mx: "混合ダブルス",
  singles: "シングルス",
};
export const CATEGORY_SHORT: Record<BoardCategory, string> = {
  md: "男子D",
  wd: "女子D",
  mx: "混合",
  singles: "シングルス",
};
export const CATEGORIES: BoardCategory[] = ["md", "wd", "mx", "singles"];

/** 表明のラベル。外部大会は「出場」、サークルイベントは「参加」 */
export function statusLabel(status: BoardStatus, kind: BoardKind): string {
  if (status === "going") return kind === "external" ? "出場予定" : "参加予定";
  if (status === "seeking") return "ペア探し中";
  return "興味あり";
}

/** ペア探しを使う種類か(サークルイベントにはペアの概念がない) */
export function usesPairing(kind: BoardKind): boolean {
  return kind !== "circle";
}

/**
 * 今日の "YYYY-MM-DD"。サーバー(UTC)と端末で日付がずれないよう、
 * コミュニティのタイムゾーン(既定チェンナイ)で求める
 */
export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CALENDAR_TZ }).format(new Date());
}

/** 開催が終わっていないか(終了日 or 開始日が今日以降) */
export function isActivePost(p: Pick<BoardPost, "start_date" | "end_date">): boolean {
  return (p.end_date ?? p.start_date) >= todayStr();
}

/** 日付差(日)。b - a */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/**
 * 申込締切のバッジ。締切が7日以内なら強調(urgent)。
 * 締切を過ぎていれば「申込締切済み」。締切なし・まだ先なら null
 */
export function deadlineBadge(
  deadline: string | null
): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const d = daysBetween(todayStr(), deadline);
  if (d < 0) return { text: "申込締切済み", urgent: false };
  if (d === 0) return { text: "本日申込締切", urgent: true };
  if (d <= 7) return { text: `締切まであと${d}日`, urgent: true };
  return null;
}

/** "12/14 (日)" / "1/10 (土)〜1/11 (日)" + 時刻 */
export function formatPostWhen(
  p: Pick<BoardPost, "start_date" | "end_date" | "start_time" | "end_time">
): string {
  const range = formatTimeRange(p.start_time, p.end_time);
  const days =
    p.end_date && p.end_date !== p.start_date
      ? `${formatDateJa(p.start_date)}〜${formatDateJa(p.end_date)}`
      : formatDateJa(p.start_date);
  return range ? `${days} ${range}` : days;
}

export function boardPostUrl(appUrl: string, id: string): string {
  return `${appUrl.replace(/\/$/, "")}/tournaments/board/${id}`;
}

/**
 * WhatsAppグループ告知文。絵文字は文字化けするため使わない(whatsapp.ts と同じ方針)
 */
export function buildBoardAnnouncementText(p: BoardPost, appUrl: string): string {
  const lines: string[] = [];
  lines.push(`【${KIND_LABEL[p.kind]}のお知らせ】${p.title}`);
  lines.push("");
  lines.push(`日時: ${formatPostWhen(p)}`);
  if (p.place_name) lines.push(`場所: ${p.place_name}`);
  if (p.maps_url) lines.push(`地図: ${p.maps_url}`);
  if (p.categories.length)
    lines.push(`種目: ${p.categories.map((c) => CATEGORY_LABEL[c]).join("・")}`);
  if (p.level) lines.push(`レベル: ${p.level}`);
  if (p.fee) lines.push(`参加費: ${p.fee}`);
  if (p.entry_deadline) lines.push(`申込締切: ${formatDateJa(p.entry_deadline)}`);
  if (p.url) lines.push(`申込ページ: ${p.url}`);
  if (p.note) {
    lines.push("");
    lines.push(p.note);
  }
  lines.push("");
  lines.push(
    usesPairing(p.kind)
      ? "▼ 出場予定・ペア探しの表明はこちら"
      : "▼ 参加予定の表明はこちら"
  );
  lines.push(boardPostUrl(appUrl, p.id));
  return lines.join("\n");
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (s: string) => s.replace(/-/g, "");
function addDays(s: string, n: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
}

/** Googleカレンダー登録リンク。時刻なし or 複数日は終日予定 */
export function buildBoardCalendarUrl(p: BoardPost, appUrl: string): string {
  let dates: string;
  const multi = p.end_date && p.end_date !== p.start_date;
  if (p.start_time && !multi) {
    const s = `${ymd(p.start_date)}T${p.start_time.slice(0, 5).replace(":", "")}00`;
    let e: string;
    if (p.end_time) e = `${ymd(p.start_date)}T${p.end_time.slice(0, 5).replace(":", "")}00`;
    else {
      const [hh, mm] = p.start_time.split(":").map(Number);
      const end = Math.min(hh + 3, 23);
      e = `${ymd(p.start_date)}T${pad(end)}${pad(mm)}00`;
    }
    dates = `${s}/${e}`;
  } else {
    dates = `${ymd(p.start_date)}/${addDays(p.end_date ?? p.start_date, 1)}`;
  }
  const details: string[] = [];
  if (p.url) details.push(`申込ページ: ${p.url}`);
  if (p.note) details.push(p.note);
  details.push(`掲示板: ${boardPostUrl(appUrl, p.id)}`);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: p.title,
    dates,
    ctz: CALENDAR_TZ,
    details: details.join("\n"),
  });
  if (p.place_name) params.set("location", p.place_name);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
