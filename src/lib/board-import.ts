// 大会ページ(TurfTown など)のHTMLから、掲示板の投稿フォームに入れる情報を取り出す。
// 取り出す順番:
//   1. TurfTown のページ内データ(__NEXT_DATA__ の game) … 日時・会場・地図・種目・DUPR条件
//   2. schema.org の Event(JSON-LD) … 一般的な大会サイト向け
//   3. OGP / <title> / description … タイトルと説明だけ
import type { BoardCategory } from "./types";
import { CALENDAR_TZ } from "./branding";

export interface BoardImport {
  title?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;
  start_time?: string; // HH:MM
  end_time?: string;
  place_name?: string;
  maps_url?: string;
  categories?: BoardCategory[];
  level?: string;
  note?: string;
}

/** HTMLエンティティを戻す(&#x27; &#39; &amp; など) */
export function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

/** 1行テキストの整形(エンティティを戻し、連続空白を1つに) */
const clean = (s: unknown): string =>
  typeof s === "string" ? decodeEntities(s).replace(/\s+/g, " ").trim() : "";

/** ISO日時 → コミュニティのタイムゾーンでの日付と時刻 */
function localParts(iso: unknown): { date: string; time: string } | null {
  if (typeof iso !== "string") return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: CALENDAR_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${hour}:${parts.minute}` };
}

/** 日時の組み立て(開始・終了。日付が同じなら終了日は入れない) */
function when(startIso: unknown, endIso: unknown): Partial<BoardImport> {
  const s = localParts(startIso);
  if (!s) return {};
  const e = localParts(endIso);
  const out: Partial<BoardImport> = { start_date: s.date };
  // 日付だけ(00:00)の場合は時刻を入れない
  if (s.time !== "00:00" || (e && e.time !== "00:00")) out.start_time = s.time;
  if (e) {
    if (e.date !== s.date) out.end_date = e.date;
    if (out.start_time && e.time !== "00:00") out.end_time = e.time;
  }
  return out;
}

/** 名前や形式の表記から種目を推定 */
export function guessCategories(text: string, format?: string): BoardCategory[] {
  const t = text.toLowerCase();
  const cats = new Set<BoardCategory>();
  if (/mixed|ミックス|混合/.test(t)) cats.add("mx");
  if (/women|ladies|female|女子|女性/.test(t)) cats.add("wd");
  else if (/\bmen'?s?\b|\bmale\b|男子|男性/.test(t)) cats.add("md");
  if (/singles|シングルス/.test(t) || format === "singles") cats.add("singles");
  if (cats.size === 0 && /doubles|ダブルス/.test(t + " " + (format ?? ""))) {
    // ダブルスだが男女の区別が書かれていない → 推定しない(誤入力を避ける)
  }
  return [...cats];
}

/** 座標からGoogleマップのURL */
const mapsFromLatLng = (lat: unknown, lng: unknown) =>
  typeof lat === "number" && typeof lng === "number"
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : undefined;

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 1. TurfTown のゲーム/大会ページ */
function fromTurfTown(html: string): BoardImport | null {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  let game: any;
  try {
    game = JSON.parse(m[1])?.props?.pageProps?.game;
  } catch {
    return null;
  }
  if (!game || typeof game !== "object" || !game.name) return null;
  const v = game.venue?.venue ?? {};
  const title = clean(game.name);
  const place = [clean(v.name), clean(v.area)].filter(Boolean).join(", ");
  const address = [clean(v.address), clean(v.area), clean(game.venue?.venue_city?.city)]
    .filter(Boolean)
    .join(", ");
  const [lat, lng] = Array.isArray(v.latLong) ? v.latLong : [];

  let level: string | undefined;
  if (game.dupr_rated) {
    const min = Number(game.dupr_min_rating) || 0;
    const max = Number(game.dupr_max_rating) || 0;
    // 3 → "3.0"、3.25 → "3.25"
    const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));
    if (min > 0 && max > 0) level = `DUPR ${f(min)}〜${f(max)}`;
    else if (max > 0) level = `DUPR ${f(max)}以下`;
    else if (min > 0) level = `DUPR ${f(min)}以上`;
    else level = "DUPRレーティング対象";
  }

  const desc = typeof game.description === "string" ? game.description.trim() : "";
  const note = [desc, address && `住所: ${address}`].filter(Boolean).join("\n\n");

  return {
    title,
    ...when(game.start_time ?? game.booking_date, game.end_time),
    place_name: place || undefined,
    maps_url: mapsFromLatLng(lat, lng),
    categories: guessCategories(title, game.dupr_format ?? game.type),
    level,
    note: note || undefined,
  };
}

/** 2. schema.org の Event(JSON-LD) */
function fromJsonLd(html: string): BoardImport | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: any;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const items: any[] = Array.isArray(data) ? data : data?.["@graph"] ?? [data];
    const ev = items.find((x) => /Event$/.test(String(x?.["@type"] ?? "")));
    if (!ev) continue;
    const loc = Array.isArray(ev.location) ? ev.location[0] : ev.location;
    const geo = loc?.geo;
    const title = clean(ev.name);
    return {
      title: title || undefined,
      ...when(ev.startDate, ev.endDate),
      place_name: clean(loc?.name) || undefined,
      maps_url: mapsFromLatLng(Number(geo?.latitude), Number(geo?.longitude)),
      categories: guessCategories(title),
      note: clean(ev.description) || undefined,
    };
  }
  return null;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/** 3. OGP / タイトル / 説明 */
function fromMeta(html: string): BoardImport | null {
  const meta = (prop: string) => {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
      if (key?.toLowerCase() === prop) {
        return tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
      }
    }
    return "";
  };
  const title = clean(
    meta("og:title") || meta("twitter:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
  );
  const note = clean(meta("og:description") || meta("description"));
  if (!title && !note) return null;
  return {
    title: title || undefined,
    note: note || undefined,
    categories: guessCategories(title),
  };
}

/** HTMLから取り込める情報を取り出す(何も取れなければ null) */
export function parseBoardImport(html: string): BoardImport | null {
  const result = fromTurfTown(html) ?? fromJsonLd(html) ?? fromMeta(html);
  if (!result) return null;
  // 空の項目は落とす
  const out: BoardImport = {};
  for (const [k, v] of Object.entries(result)) {
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  if (out.title) out.title = out.title.slice(0, 120);
  if (out.note) out.note = out.note.slice(0, 1500);
  return Object.keys(out).length ? out : null;
}
