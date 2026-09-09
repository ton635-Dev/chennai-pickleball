// DUPR(Dynamic Universal Pickleball Rating)の非公式APIクライアント。
// 公式アプリが使う api.dupr.gg にDUPRアカウントでログインして
// プレイヤー検索・レーティング取得を行う(サーバー専用)。
//
// 必要な環境変数(サーバー側のみ・NEXT_PUBLIC禁止):
//   DUPR_EMAIL / DUPR_PASSWORD … 任意のDUPRアカウント(クラブ管理者推奨)
//
// 認証の仕組み(2026-09 DUPRがメール2段階認証を必須化したため):
//   1. 「認証コードを送る」→ パスワードでログイン → DUPRがメールに6桁コード送付
//   2. コードを verify → accessToken / refreshToken を取得
//   3. トークンは dupr_auth テーブルに暗号化して保存(鍵はDUPR_EMAIL+PASSWORDから導出)
//   4. 以後は refresh で維持。パスワードログイン(=メール送信)は再認証時だけ
//
// 注意: 非公式APIのため、DUPR側の変更で動かなくなる可能性がある。
// その場合も手入力(phase9)にフォールバックできる設計にしている。
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { getServerSupabase } from "@/lib/supabase/server";

const BASE = "https://api.dupr.gg";
// このヘッダーを付けると、2段階認証が必要なときに challengeToken 付きで応答してくれる
const MFA_HEADERS = {
  "Content-Type": "application/json",
  "X-DUPR-Client-Capabilities": "mfa-challenge",
};

export const DUPR_REAUTH_MESSAGE =
  "DUPRの再認証が必要です。「その他」画面の「DUPR連携の認証」からメールのコードを入力してください";

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

// ---------------------------------------------------------------------
// トークンの暗号化保存(dupr_auth テーブル・1行)
// anonキーで読める場所に置くため、サーバーだけが持つ鍵で暗号化する
// ---------------------------------------------------------------------
interface DuprAuthState {
  accessToken?: string;
  refreshToken?: string;
  challengeToken?: string;
  savedAt?: string;
}

function cryptoKey(): Buffer {
  return scryptSync(
    `${process.env.DUPR_EMAIL}:${process.env.DUPR_PASSWORD}`,
    "cpb-dupr-auth-v1",
    32
  );
}

function encrypt(state: DuprAuthState): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cryptoKey(), iv);
  const enc = Buffer.concat([
    cipher.update(JSON.stringify(state), "utf8"),
    cipher.final(),
  ]);
  return [iv, enc, cipher.getAuthTag()]
    .map((b) => b.toString("base64url"))
    .join(".");
}

function decrypt(payload: string): DuprAuthState | null {
  try {
    const [iv, enc, tag] = payload.split(".").map((s) => Buffer.from(s, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", cryptoKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString("utf8")) as DuprAuthState;
  } catch {
    // 鍵(=パスワード)が変わった等。再認証すれば上書きされる
    return null;
  }
}

async function loadAuth(): Promise<DuprAuthState> {
  const sb = getServerSupabase();
  if (!sb) return {};
  const { data } = await sb
    .from("dupr_auth")
    .select("payload")
    .eq("id", 1)
    .maybeSingle();
  const payload = (data as { payload?: string } | null)?.payload;
  return payload ? (decrypt(payload) ?? {}) : {};
}

async function saveAuth(state: DuprAuthState): Promise<void> {
  const sb = getServerSupabase();
  if (!sb) throw new Error("Supabase が未設定です");
  const now = new Date().toISOString();
  const { error } = await sb
    .from("dupr_auth")
    .upsert({ id: 1, payload: encrypt({ ...state, savedAt: now }), updated_at: now });
  if (error) throw new Error(error.message);
}

/** JWTの有効期限(ms)。JWTでなければ null */
function jwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    ) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export interface DuprAuthStatus {
  configured: boolean;
  /** トークン保存済み(=自動更新が動く状態) */
  authenticated: boolean;
  /** コード送信済みで入力待ち */
  pendingCode: boolean;
  savedAt: string | null;
  refreshExpiresAt: string | null;
}

/** 画面表示用の認証状態(ネットワークアクセスなし) */
export async function getDuprAuthStatus(): Promise<DuprAuthStatus> {
  if (!duprConfigured()) {
    return {
      configured: false,
      authenticated: false,
      pendingCode: false,
      savedAt: null,
      refreshExpiresAt: null,
    };
  }
  const auth = await loadAuth();
  const refreshExp = auth.refreshToken ? jwtExp(auth.refreshToken) : null;
  return {
    configured: true,
    authenticated: !!auth.refreshToken,
    pendingCode: !!auth.challengeToken && !auth.refreshToken,
    savedAt: auth.savedAt ?? null,
    refreshExpiresAt: refreshExp ? new Date(refreshExp).toISOString() : null,
  };
}

// ---------------------------------------------------------------------
// アクセストークン取得(メモリキャッシュ → 保存済み → refresh)
// ---------------------------------------------------------------------
interface TokenCache {
  token?: { value: string; expiresAt: number };
  blockedUntil?: number;
}
const g = globalThis as typeof globalThis & { __duprCache?: TokenCache };
const cache = (g.__duprCache ??= {});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const json = await res.json().catch(() => null);
  return { res, json };
}

/**
 * refreshToken でトークン対を更新(v2.0・毎回ローテーションされる)。
 * DUPR側の5xxは間を置いて再試行
 */
async function refreshAccessToken(refreshToken: string) {
  let last: { res: Response; json: unknown } | null = null;
  for (let i = 0; i < 3; i++) {
    last = await fetchJson(`${BASE}/auth/v2.0/refresh`, {
      method: "GET",
      headers: { ...MFA_HEADERS, "x-refresh-token": refreshToken },
    });
    if (last.res.status < 500) break;
    await sleep(1500 * (i + 1));
  }
  return last!;
}

/**
 * APIはアクセストークンを Bearer ではなく Cookie(__Host-dupr_at)で受け取る
 * (2026-09のDUPR側変更以降。Bearerは "Invalid token" になる)
 */
function authHeaders(token: string): Record<string, string> {
  return { Cookie: `__Host-dupr_at=${token}` };
}

/** Set-Cookie から __Host-dupr_rt(refreshToken)を取り出す */
function refreshTokenFromCookies(res: Response): string | undefined {
  const cookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of cookies) {
    const [pair] = c.split(";");
    if (pair.startsWith("__Host-dupr_rt=")) return pair.slice("__Host-dupr_rt=".length);
  }
  return undefined;
}

/** 認証直後: 得た refreshToken から API 用トークン対を取得して保存 */
async function establishFromRefreshToken(refreshToken: string): Promise<void> {
  const { res, json } = await refreshAccessToken(refreshToken);
  const result = (json as { result?: { accessToken?: string; refreshToken?: string } } | null)
    ?.result;
  if (!res.ok || !result?.accessToken) {
    throw new Error(`DUPRトークンの取得に失敗しました(${res.status})。もう一度お試しください`);
  }
  await saveAuth({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? refreshToken,
  });
  const exp = jwtExp(result.accessToken) ?? Date.now() + 50 * 60_000;
  cache.token = { value: result.accessToken, expiresAt: exp - 60_000 };
  cache.blockedUntil = undefined;
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cache.token && now < cache.token.expiresAt) return cache.token.value;
  if (cache.blockedUntil && now < cache.blockedUntil) {
    throw new Error(
      "DUPRへの接続が一時的に制限されています。1分ほどおいてもう一度お試しください"
    );
  }
  const auth = await loadAuth();
  // 保存済みアクセストークンがまだ有効ならそれを使う
  if (auth.accessToken) {
    const exp = jwtExp(auth.accessToken);
    if (exp && exp - 60_000 > now) {
      cache.token = { value: auth.accessToken, expiresAt: exp - 60_000 };
      return auth.accessToken;
    }
  }
  if (!auth.refreshToken) throw new Error(DUPR_REAUTH_MESSAGE);

  const { res, json } = await refreshAccessToken(auth.refreshToken);
  const result = (json as { result?: { accessToken?: string; refreshToken?: string } } | null)
    ?.result;
  const token = result?.accessToken;
  if (!res.ok || !token) {
    if (res.status >= 500) {
      cache.blockedUntil = now + 60_000;
      throw new Error(
        `DUPR側が一時的に応答していません(${res.status})。しばらくしてからもう一度お試しください`
      );
    }
    // refreshToken が失効・無効化された → メールコードで再認証
    throw new Error(DUPR_REAUTH_MESSAGE);
  }
  await saveAuth({
    accessToken: token,
    refreshToken: result?.refreshToken ?? auth.refreshToken,
  });
  const exp = jwtExp(token) ?? now + 50 * 60_000;
  cache.token = { value: token, expiresAt: exp - 60_000 };
  return token;
}

// ---------------------------------------------------------------------
// 認証フロー(メール2段階認証)
// ---------------------------------------------------------------------

/**
 * パスワードでログインを開始。DUPRがメールに6桁コードを送る。
 * (2段階認証が要求されなかった場合はその場でトークンを保存して done=true)
 */
export async function startDuprChallenge(): Promise<{ done: boolean }> {
  if (!duprConfigured()) {
    throw new Error("DUPR連携が設定されていません(環境変数 DUPR_EMAIL / DUPR_PASSWORD)");
  }
  const { res, json } = await fetchJson(`${BASE}/auth/v1.0/login`, {
    method: "POST",
    headers: MFA_HEADERS,
    body: JSON.stringify({
      email: process.env.DUPR_EMAIL,
      password: process.env.DUPR_PASSWORD,
    }),
  });
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const j = json as any;
  const challengeToken: string | undefined = j?.challengeToken ?? j?.result?.challengeToken;
  if (challengeToken) {
    const auth = await loadAuth();
    await saveAuth({ ...auth, challengeToken });
    return { done: false };
  }
  // 2段階認証なしで通った場合: 本文 or Cookie の refreshToken からトークン対を確立
  const directRefresh: string | undefined =
    j?.result?.refreshToken ?? (res.ok ? refreshTokenFromCookies(res) : undefined);
  if (directRefresh) {
    await establishFromRefreshToken(directRefresh);
    return { done: true };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (res.status >= 500) {
    throw new Error(
      `DUPR側が一時的に応答していません(${res.status})。しばらくしてからもう一度お試しください`
    );
  }
  throw new Error(
    `DUPRログインに失敗しました(${j?.message ?? res.status})。環境変数 DUPR_EMAIL / DUPR_PASSWORD を確認してください`
  );
}

/** メールで届いた6桁コードを検証し、トークンを保存する */
export async function verifyDuprCode(code: string): Promise<void> {
  const auth = await loadAuth();
  if (!auth.challengeToken) {
    throw new Error("先に「認証コードを送る」を押してください");
  }
  const { res, json } = await fetchJson(`${BASE}/auth/v1.0/2fa/verify`, {
    method: "POST",
    headers: MFA_HEADERS,
    body: JSON.stringify({ challengeToken: auth.challengeToken, code: code.trim() }),
  });
  const body = json as
    | { message?: string; result?: { accessToken?: string; refreshToken?: string } }
    | null;
  if (!res.ok) {
    throw new Error(
      body?.message ?? `コードの確認に失敗しました(${res.status})。もう一度お試しください`
    );
  }
  // verify の応答は本文にトークンを含まず、Set-Cookie(__Host-dupr_rt)で refreshToken が返る。
  // Cookie の accessToken(__Host-dupr_at)はWebセッション用でAPIには使えないため、
  // refreshToken から API 用トークン対を取得して保存する
  const refreshToken = body?.result?.refreshToken ?? refreshTokenFromCookies(res);
  if (!refreshToken) {
    throw new Error("DUPRからトークンが返されませんでした。もう一度お試しください");
  }
  await establishFromRefreshToken(refreshToken);
}

// ---------------------------------------------------------------------
// プレイヤー検索・取得
// ---------------------------------------------------------------------

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
  const { res, json } = await fetchJson(`${BASE}/player/v1.0/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      query: query.trim(),
      limit: 10,
      offset: 0,
      includeUnclaimedPlayers: true,
      filter: {},
    }),
  });
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
  const { res, json } = await fetchJson(`${BASE}/player/v1.0/${playerId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok || json?.status === "FAILURE" || !json?.result) return null;
  return parsePlayer(json.result);
}
