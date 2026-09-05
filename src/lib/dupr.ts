// DUPR(Dynamic Universal Pickleball Rating)の非公式APIクライアント。
// 公式アプリが使う api.dupr.gg にDUPRアカウントでログインして
// プレイヤー検索・レーティング取得を行う(サーバー専用)。
//
// 必要な環境変数(サーバー側のみ・NEXT_PUBLIC禁止):
//   DUPR_EMAIL / DUPR_PASSWORD … 任意のDUPRアカウント(クラブ管理者推奨)
//
// 注意: 非公式APIのため、DUPR側の変更で動かなくなる可能性がある。
// その場合も手入力(phase9)にフォールバックできる設計にしている。

const BASE = "https://api.dupr.gg";

export interface DuprPlayer {
  id: number;
  fullName: string;
  duprId: string | null;
  imageUrl: string | null;
  shortAddress: string | null;
  age: number | null;
  gender: string | null;
  doubles: number | null;
  singles: number | null;
}

export function duprConfigured(): boolean {
  return !!(process.env.DUPR_EMAIL && process.env.DUPR_PASSWORD);
}

// トークンはインスタンス生存中使い回す。短時間にログインを繰り返すと
// DUPR側に一時ブロック(403)されるため、globalThisに置いて開発中の
// リコンパイルでも維持し、失敗後はクールダウンを挟む。
interface TokenCache {
  token?: { value: string; expiresAt: number };
  blockedUntil?: number;
}
const g = globalThis as typeof globalThis & { __duprCache?: TokenCache };
const cache = (g.__duprCache ??= {});

/** ログイン試行(1回) */
async function loginOnce() {
  const res = await fetch(`${BASE}/auth/v1.0/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.DUPR_EMAIL,
      password: process.env.DUPR_PASSWORD,
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return { res, json, token: json?.result?.accessToken as string | undefined };
}

async function getToken(): Promise<string> {
  if (cache.token && Date.now() < cache.token.expiresAt) return cache.token.value;
  if (cache.blockedUntil && Date.now() < cache.blockedUntil) {
    throw new Error(
      "DUPRへのログインが一時的に制限されています。数分おいてもう一度お試しください"
    );
  }
  let { res, json, token } = await loginOnce();
  // DUPR側の5xxは断続的に起きるため、間を置いて2回まで再試行する
  for (let i = 0; i < 2 && !token && res.status >= 500; i++) {
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    ({ res, json, token } = await loginOnce());
  }
  if (!res.ok || !token) {
    // 5xxはDUPR側の一時障害。認証情報の問題と紛らわしいので分けて伝える。
    // こちらのクールダウンで再試行を妨げないよう、5xxは短め(1分)にする
    if (res.status >= 500) {
      cache.blockedUntil = Date.now() + 60 * 1000;
      throw new Error(
        `DUPR側が一時的に応答していません(${res.status})。しばらくしてからもう一度お試しください`
      );
    }
    // 認証エラーは連続試行でアカウントがロックされ得るため5分空ける
    cache.blockedUntil = Date.now() + 5 * 60 * 1000;
    throw new Error(
      `DUPRログインに失敗しました(${json?.message ?? res.status})。環境変数 DUPR_EMAIL / DUPR_PASSWORD を確認し、数分おいて再試行してください`
    );
  }
  // 有効期限はレスポンスから確実に取れないため50分で更新
  cache.token = { value: token, expiresAt: Date.now() + 50 * 60 * 1000 };
  cache.blockedUntil = undefined;
  return token;
}

/** "NR"(未評価)や欠損を null に、数値文字列を number に */
function toRating(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 2 && n <= 8 ? Math.round(n * 1000) / 1000 : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parsePlayer(d: any): DuprPlayer {
  // レーティングはAPIバージョンにより flat(doubles) / ratings.doubles の両方があり得る
  const ratings = d?.ratings ?? d;
  return {
    id: Number(d?.id),
    fullName: String(d?.fullName ?? ""),
    duprId: d?.duprId ?? null,
    imageUrl: d?.imageUrl ?? null,
    shortAddress: d?.shortAddress ?? d?.address ?? null,
    age: typeof d?.age === "number" ? d.age : null,
    gender: d?.gender ?? null,
    doubles: toRating(ratings?.doubles),
    singles: toRating(ratings?.singles),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 名前(またはDUPR ID)でプレイヤーを検索 */
export async function searchDuprPlayers(query: string): Promise<DuprPlayer[]> {
  const token = await getToken();
  const res = await fetch(`${BASE}/player/v1.0/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: query.trim(),
      limit: 10,
      offset: 0,
      includeUnclaimedPlayers: true,
      filter: {},
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status === "FAILURE") {
    throw new Error(`DUPR検索に失敗しました(${json?.message ?? res.status})`);
  }
  const hits = json?.result?.hits ?? json?.result ?? [];
  if (!Array.isArray(hits)) return [];
  return hits
    .map(parsePlayer)
    .filter((p) => Number.isFinite(p.id) && p.fullName);
}

/** プレイヤーIDで最新レーティングを取得 */
export async function getDuprPlayer(playerId: number): Promise<DuprPlayer | null> {
  const token = await getToken();
  const res = await fetch(`${BASE}/player/v1.0/${playerId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status === "FAILURE" || !json?.result) return null;
  return parsePlayer(json.result);
}
