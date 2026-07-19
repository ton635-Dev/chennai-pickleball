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

export function initialState(config: GameConfig): GameState {
  return {
    scores: [0, 0],
    servingTeam: 0,
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

/** スコアコール文字列(ダブルス: "自-相-#"、シングルス: "自-相") */
export function scoreCall(state: GameState, config: GameConfig): string {
  const s = state.scores[state.servingTeam];
  const o = state.scores[state.servingTeam === 0 ? 1 : 0];
  if (config.mode === "doubles") {
    return `${s} - ${o} - ${state.serverNumber}`;
  }
  return `${s} - ${o}`;
}
