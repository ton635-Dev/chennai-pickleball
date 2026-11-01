// サイドアウト・スコアリング(伝統的な公式ルール)のエンジン
// - サーブ権を持つ側のみ得点できる
// - ダブルスはサーバー番号(#1/#2)あり。開始は 0-0-2
// - ゲーム点数は自由入力(デフォルト11)・2点差で終了(デュース時は続行)

export type Team = 0 | 1;
export type ServerNumber = 1 | 2;
export type ServeSide = "right" | "left";

export interface GameConfig {
  mode: "singles" | "doubles";
  target: number; // 先取点(デフォルト11)
}

export interface GameState {
  scores: [number, number];
  servingTeam: Team;
  serverNumber: ServerNumber; // シングルスでは常に 1 として扱う(表示しない)
  finished: boolean;
  winner: Team | null;
}

/** 開始状態。firstServer = 最初にサーブするチーム(試合前に選ぶ) */
export function initialState(config: GameConfig, firstServer: Team = 0): GameState {
  return {
    scores: [0, 0],
    servingTeam: firstServer,
    // ダブルスは開始側が「サーバー#2」から始まる(0-0-2 の慣習)
    serverNumber: config.mode === "doubles" ? 2 : 1,
    finished: false,
    winner: null,
  };
}

/** サーブ側の得点が偶数なら右、奇数なら左から */
export function serveSide(state: GameState): ServeSide {
  return state.scores[state.servingTeam] % 2 === 0 ? "right" : "left";
}

function checkWin(state: GameState, config: GameConfig): GameState {
  const s = state.scores[state.servingTeam];
  const o = state.scores[state.servingTeam === 0 ? 1 : 0];
  if (s >= config.target && s - o >= 2) {
    return { ...state, finished: true, winner: state.servingTeam };
  }
  return state;
}

/**
 * ラリーに勝った側(rallyWinner)をタップしたときの状態遷移。
 * - 勝ったのがサーブ側 → 得点(サーバー継続、サイドが入れ替わる)
 * - 勝ったのがレシーブ側 → フォルト。#1→#2、#2ならサイドアウト(得点なし)
 */
export function awardRally(
  state: GameState,
  config: GameConfig,
  rallyWinner: Team
): GameState {
  if (state.finished) return state;

  if (rallyWinner === state.servingTeam) {
    const scores: [number, number] = [...state.scores];
    scores[rallyWinner] += 1;
    return checkWin({ ...state, scores }, config);
  }

  // レシーブ側が勝った = サーブ側のフォルト
  if (config.mode === "doubles" && state.serverNumber === 1) {
    return { ...state, serverNumber: 2 };
  }
  // サイドアウト
  return {
    ...state,
    servingTeam: state.servingTeam === 0 ? 1 : 0,
    serverNumber: 1,
  };
}

/** 1回のタップで何が起きたか(画面のフィードバック・振動の出し分けに使う) */
export type RallyOutcome =
  | { kind: "point"; team: Team }
  | { kind: "serverChange"; team: Team } // ダブルス: 1人目 → 2人目のサーブへ
  | { kind: "sideOut"; team: Team } // サーブ権が team に移った
  | { kind: "gameOver"; team: Team | null };

export function describeRally(prev: GameState, next: GameState): RallyOutcome | null {
  if (next.finished && !prev.finished) return { kind: "gameOver", team: next.winner };
  if (next.servingTeam !== prev.servingTeam) return { kind: "sideOut", team: next.servingTeam };
  if (next.serverNumber !== prev.serverNumber) return { kind: "serverChange", team: next.servingTeam };
  for (const t of [0, 1] as const) {
    if (next.scores[t] > prev.scores[t]) return { kind: "point", team: t };
  }
  return null;
}

/** スコアコール文字列(ダブルス: "自-相-#"、シングルス: "自-相") */
export function scoreCall(state: GameState, config: GameConfig): string {
  const s = state.scores[state.servingTeam];
  const o = state.scores[state.servingTeam === 0 ? 1 : 0];
  if (config.mode === "doubles") {
    return `${s} - ${o} - ${state.serverNumber}`;
  }
  return `${s} - ${o}`;
}
