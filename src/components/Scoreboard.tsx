"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { saveMatch, setTieGameScore } from "@/app/actions";
import {
  awardRally,
  describeRally,
  initialState,
  serveSide,
  type GameConfig,
  type GameState,
  type Team,
} from "@/lib/scoring";

/** 直前の操作の表示(タップが反映されたかを操作者が確認できるように) */
interface Notice {
  id: number;
  text: string;
  /** strong = サーバー交代など、スコアの数字がほぼ変わらない重要な変化 */
  strong: boolean;
}

/** 端末の振動で操作を知らせる(Android等。非対応端末では何もしない) */
const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
};

/** 大会(団体戦)のゲームを記録するモードの情報 */
export interface TieContext {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  gameNo: number;
  gamesPerTie: number;
  teamName1: string;
  teamName2: string;
}

interface Props {
  mode: "singles" | "doubles";
  target: number;
  team1: string[];
  team2: string[];
  eventId?: string | null;
  tie?: TieContext | null;
}

export function Scoreboard({ mode, target, team1, team2, eventId, tie }: Props) {
  const router = useRouter();
  const { member } = useMember();
  const config: GameConfig = useMemo(() => ({ mode, target }), [mode, target]);

  const [history, setHistory] = useState<GameState[]>([initialState(config)]);
  const state = history[history.length - 1];
  // 試合開始時に「どちらのサーブから始めるか」を選ぶ
  const [choosingServe, setChoosingServe] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const names: [string[], string[]] = [
    team1.length ? team1 : ["チーム1"],
    team2.length ? team2 : ["チーム2"],
  ];
  const teamLabel = (t: Team) => names[t].join("・");

  const show = (text: string, strong = false) =>
    setNotice((n) => ({ id: (n?.id ?? 0) + 1, text, strong }));

  const startWith = (team: Team) => {
    setHistory([initialState(config, team)]);
    setChoosingServe(false);
    show(`${teamLabel(team)} のサーブから開始`);
  };

  const tap = (team: Team) => {
    if (state.finished || choosingServe) return;
    const next = awardRally(state, config, team);
    setHistory((h) => [...h, next]);
    const o = describeRally(state, next);
    if (!o) return;
    if (o.kind === "point") {
      buzz(25);
      show(`${teamLabel(o.team)} に1点`);
    } else if (o.kind === "serverChange") {
      // 数字は最後の1桁しか変わらないので、はっきり知らせる
      buzz([40, 70, 40]);
      show(`${teamLabel(o.team)}:2人目のサーブへ交代`, true);
    } else if (o.kind === "sideOut") {
      buzz(70);
      show(`サイドアウト → ${teamLabel(o.team)} のサーブ`, true);
    } else {
      buzz([60, 60, 60, 60, 120]);
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    setHistory((h) => h.slice(0, -1));
    buzz(15);
    show("↩ 1つ戻しました");
  };

  const replay = () => {
    setHistory([initialState(config)]);
    setNotice(null);
    setChoosingServe(true);
  };

  const endGame = () => {
    // 手動終了: 現在の得点で終了(勝者は多い方、同点なら勝者なし)
    const [a, b] = state.scores;
    const winner: Team | null = a === b ? null : a > b ? 0 : 1;
    setHistory((h) => [...h, { ...state, finished: true, winner }]);
  };

  const side = serveSide(state);
  const serveKey = `${state.servingTeam}-${state.serverNumber}`;

  const modeLabel = mode === "doubles" ? "ダブルス" : "シングルス";

  // 関数として呼ぶ(コンポーネントにすると毎回作り直されて強調表示が乱れるため)
  const renderSide = (team: Team) => {
    const serving = state.servingTeam === team && !state.finished;
    return (
      <button
        onClick={() => tap(team)}
        className={`relative mx-3.5 flex flex-1 flex-col items-center justify-center rounded-[22px] border transition ${
          serving
            ? "border-transparent bg-gradient-to-b from-primary to-primary-dark"
            : "border-white/10 bg-navy"
        }`}
      >
        {/* サーバー交代・サイドアウトの直後はサーブ側の枠を光らせる */}
        {serving && notice?.strong && (
          <span
            key={notice.id}
            className="cpb-flash pointer-events-none absolute inset-0 rounded-[22px]"
          />
        )}
        {serving && (
          <>
            <span
              key={serveKey}
              className="cpb-pop absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-pill bg-accent px-3 py-1.5 text-xs font-extrabold text-navy"
            >
              {mode === "doubles" ? (
                <>
                  {/* ●○ = 1人目 / ●● = 2人目 */}
                  <span className="flex gap-0.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-navy" />
                    <span
                      className={`h-2.5 w-2.5 rounded-full border-2 border-navy ${
                        state.serverNumber === 2 ? "bg-navy" : ""
                      }`}
                    />
                  </span>
                  {state.serverNumber}人目のサーブ
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-navy" />
                  サーブ
                </>
              )}
            </span>
            <span className="absolute right-3.5 top-3.5 flex gap-1">
              {(["left", "right"] as const).map((p) => (
                <span
                  key={p}
                  className={`flex h-5 w-[26px] items-center justify-center rounded-[5px] border-[1.5px] text-[10px] font-extrabold ${
                    side === p
                      ? "border-accent bg-accent text-navy"
                      : "border-white/50 text-white/70"
                  }`}
                >
                  {p === "left" ? "左" : "右"}
                </span>
              ))}
            </span>
          </>
        )}
        <div className="text-base font-extrabold">{teamLabel(team)}</div>
        <div
          className={`tabnum my-0.5 text-[104px] font-extrabold leading-none ${
            serving ? "text-accent" : "text-white"
          }`}
        >
          {state.scores[team]}
        </div>
        <div className="text-[11px] text-white/50">勝った側をタップ</div>
      </button>
    );
  };

  return (
    <div className="flex h-dvh flex-col bg-navy2 text-white">
      {/* 上部バー */}
      <div className="flex items-center justify-between px-4 pb-2.5 pt-4">
        <button
          onClick={() =>
            router.push(tie ? `/tournaments/${tie.tournamentId}` : "/scoreboard")
          }
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[15px]"
          aria-label="閉じる"
        >
          ✕
        </button>
        <div className="min-w-0 text-center">
          {tie && (
            <div className="truncate text-[11px] font-extrabold text-accent">
              {tie.tournamentName}・ゲーム{tie.gameNo}/{tie.gamesPerTie}
            </div>
          )}
          <div className="text-[13px] font-extrabold opacity-85">
            {modeLabel}・{target}点先取(2点差)
          </div>
        </div>
        <div className="w-9" />
      </div>

      {/* スコアコール */}
      <div className="pb-2 pt-1.5 text-center">
        <small className="block text-[11px] tracking-[0.2em] opacity-60">
          SCORE CALL
        </small>
        <b className="tabnum text-[34px] font-extrabold tracking-[0.06em] text-accent">
          {state.scores[state.servingTeam]} - {state.scores[state.servingTeam === 0 ? 1 : 0]}
          {mode === "doubles" && (
            <>
              {" - "}
              {/* 変化が見落とされやすいサーバー番号は枠で目立たせ、変わった瞬間に強調 */}
              <span
                key={serveKey}
                className="cpb-pop inline-block rounded-lg bg-accent px-2 text-navy2"
              >
                {state.serverNumber}
              </span>
            </>
          )}
        </b>
        {/* 直前の操作。タップが反映されたかをここで確認できる */}
        <div className="mt-1 flex h-7 items-center justify-center gap-2">
          {notice && !choosingServe && (
            <span
              key={notice.id}
              className={`cpb-pop rounded-pill px-3 py-1 text-[12px] font-extrabold ${
                notice.strong ? "bg-accent text-navy2" : "bg-white/10 text-white/85"
              }`}
            >
              {notice.text}
            </span>
          )}
          {/* 1球目の前なら最初のサーブ側を選び直せる */}
          {history.length === 1 && !choosingServe && !state.finished && (
            <button
              onClick={() => setChoosingServe(true)}
              className="rounded-pill border border-white/25 px-3 py-1 text-[12px] font-bold text-white/80"
            >
              サーブ側を変更
            </button>
          )}
        </div>
      </div>

      {/* 2分割(縦: 上下 / 横: 左右) */}
      <div className="flex flex-1 flex-col landscape:flex-row">
        {renderSide(0)}
        <div className="py-2 text-center text-xs font-extrabold opacity-50 landscape:flex landscape:items-center">
          VS
        </div>
        {renderSide(1)}
      </div>

      {/* 試合開始: 最初にサーブするチームを選ぶ */}
      {choosingServe && !state.finished && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-xs rounded-card bg-surface p-5 text-center text-ink">
            <div className="text-2xl">🏓</div>
            <div className="mt-1 text-[17px] font-extrabold">最初のサーブはどちら？</div>
            <p className="mt-1 text-[12px] text-muted">
              {mode === "doubles"
                ? "選んだチームの「0-0-2」から始まります"
                : "選んだ側のサーブから始まります"}
            </p>
            <div className="mt-4 space-y-2">
              {([0, 1] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => startWith(t)}
                  className="btn-pill w-full bg-primary px-4 py-3.5 text-[15px] text-white"
                >
                  {teamLabel(t)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* フッター */}
      <div className="flex gap-2.5 px-3.5 pb-6 pt-4">
        <button
          onClick={undo}
          disabled={history.length <= 1}
          className="flex-1 rounded-2xl bg-white/10 py-4 text-[15px] font-extrabold disabled:opacity-30"
        >
          ↩ 元に戻す
        </button>
        <button
          onClick={endGame}
          className="flex-1 rounded-2xl bg-white/[0.06] py-4 text-[15px] font-extrabold text-white/60"
        >
          試合を終了
        </button>
      </div>

      {state.finished && tie && (
        <TieFinishOverlay
          tie={tie}
          scores={state.scores}
          winnerLabel={state.winner === null ? null : teamLabel(state.winner)}
          pair1={names[0].join("・")}
          pair2={names[1].join("・")}
          onReplay={replay}
          memberId={member?.id ?? null}
        />
      )}

      {state.finished && !tie && (
        <FinishOverlay
          winnerLabel={state.winner === null ? null : teamLabel(state.winner)}
          scores={state.scores}
          onReplay={replay}
          onSave={async () => {
            await saveMatch(
              {
                event_id: eventId ?? null,
                mode,
                team1_names: names[0],
                team2_names: names[1],
                team1_score: state.scores[0],
                team2_score: state.scores[1],
                target_points: target,
                winner: state.winner === null ? null : state.winner + 1,
              },
              member?.id ?? null
            );
          }}
          onExit={() => router.push("/scoreboard")}
        />
      )}
    </div>
  );
}

function FinishOverlay({
  winnerLabel,
  scores,
  onReplay,
  onSave,
  onExit,
}: {
  winnerLabel: string | null;
  scores: [number, number];
  onReplay: () => void;
  onSave: () => Promise<void>;
  onExit: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave();
      setSaved(true);
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
      <div className="w-full max-w-xs rounded-card bg-surface p-6 text-center text-ink">
        <div className="text-3xl">🏆</div>
        <div className="mt-2 text-lg font-extrabold">
          {winnerLabel ? `${winnerLabel} の勝ち` : "引き分け"}
        </div>
        <div className="tabnum mt-1 text-[34px] font-extrabold text-primary">
          {scores[0]} - {scores[1]}
        </div>

        <div className="mt-5 space-y-2">
          <button
            onClick={save}
            disabled={busy || saved}
            className="btn-pill w-full bg-primary py-3 text-[15px] text-white disabled:opacity-60"
          >
            {saved ? "保存しました ✓" : busy ? "保存中…" : "この結果を保存する"}
          </button>
          <button
            onClick={onReplay}
            className="btn-pill w-full border-2 border-line bg-surface py-3 text-[15px] font-bold text-ink"
          >
            もう一度
          </button>
          <button
            onClick={onExit}
            className="w-full py-2 text-sm font-bold text-muted"
          >
            終了する
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 大会モードの終了オーバーレイ
// スコアを該当ゲームへ保存 → 次のゲームへ続ける / 大会画面へ戻る
// ---------------------------------------------------------------------
function TieFinishOverlay({
  tie,
  scores,
  winnerLabel,
  pair1,
  pair2,
  onReplay,
  memberId,
}: {
  tie: TieContext;
  scores: [number, number];
  winnerLabel: string | null;
  pair1: string;
  pair2: string;
  onReplay: () => void;
  memberId: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNext = tie.gameNo < tie.gamesPerTie;

  // 出場ペアがチーム名のままなら記録しない(ペア指定時のみ保存)
  const pairOrNull = (p: string, teamName: string) =>
    p && p !== teamName ? p : null;

  const save = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const res = await setTieGameScore(
        tie.matchId,
        tie.gameNo,
        scores[0],
        scores[1],
        pairOrNull(pair1, tie.teamName1),
        pairOrNull(pair2, tie.teamName2),
        memberId
      );
      if (res.error) {
        setError(res.error);
        return false;
      }
      // スコアは保存済み・履歴への記録だけ失敗した場合は知らせて先へ進む
      if (res.warning) window.alert(res.warning);
      setSaved(true);
      return true;
    } catch {
      setError("通信に失敗しました。電波の良い場所で、もう一度保存してください");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveAndNext = async () => {
    if (!(await save())) return;
    // フルリロードで遷移(前ゲームのスコア状態を確実にリセットするため)
    window.location.href = `/scoreboard/play?tie=${tie.matchId}&g=${
      tie.gameNo + 1
    }`;
  };

  const saveAndBack = async () => {
    if (!saved && !(await save())) return;
    router.push(`/tournaments/${tie.tournamentId}`);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
      <div className="w-full max-w-xs rounded-card bg-surface p-6 text-center text-ink">
        <div className="text-[11px] font-extrabold text-muted">
          {tie.tournamentName}・ゲーム{tie.gameNo}
        </div>
        <div className="mt-1 text-3xl">🏆</div>
        <div className="mt-1 text-lg font-extrabold">
          {winnerLabel ? `${winnerLabel} の勝ち` : "引き分け"}
        </div>
        <div className="tabnum mt-1 text-[34px] font-extrabold text-primary">
          {scores[0]} - {scores[1]}
        </div>
        <div className="mt-1 text-[11px] text-muted">
          {tie.teamName1} {scores[0]} - {scores[1]} {tie.teamName2}
        </div>

        {saved && (
          <div className="mt-3 rounded-xl bg-[#E2F3EE] px-3 py-2 text-[12px] font-bold text-primary-dark">
            ゲーム{tie.gameNo}の結果を保存しました ✓
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 space-y-2">
          {hasNext ? (
            <>
              <button
                onClick={saveAndNext}
                disabled={busy}
                className="btn-pill w-full bg-primary py-3 text-[15px] text-white disabled:opacity-60"
              >
                {busy ? "保存中…" : `保存してゲーム${tie.gameNo + 1}へ`}
              </button>
              <button
                onClick={saveAndBack}
                disabled={busy}
                className="btn-pill w-full border-2 border-line bg-surface py-3 text-[15px] font-bold text-ink disabled:opacity-60"
              >
                保存して大会画面へ
              </button>
            </>
          ) : (
            <button
              onClick={saveAndBack}
              disabled={busy}
              className="btn-pill w-full bg-primary py-3 text-[15px] text-white disabled:opacity-60"
            >
              {busy ? "保存中…" : "保存して大会画面へ"}
            </button>
          )}
          <button
            onClick={onReplay}
            disabled={busy}
            className="w-full py-2 text-sm font-bold text-muted"
          >
            やり直す(保存しない)
          </button>
        </div>
      </div>
    </div>
  );
}
