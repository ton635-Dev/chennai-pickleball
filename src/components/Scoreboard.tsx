"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { saveMatch } from "@/app/actions";
import {
  awardRally,
  initialState,
  scoreCall,
  serveSide,
  type GameConfig,
  type GameState,
  type Team,
} from "@/lib/scoring";

interface Props {
  mode: "singles" | "doubles";
  target: number;
  team1: string[];
  team2: string[];
  eventId?: string | null;
}

export function Scoreboard({ mode, target, team1, team2, eventId }: Props) {
  const router = useRouter();
  const { member } = useMember();
  const config: GameConfig = useMemo(() => ({ mode, target }), [mode, target]);

  const [history, setHistory] = useState<GameState[]>([initialState(config)]);
  const state = history[history.length - 1];

  const names: [string[], string[]] = [
    team1.length ? team1 : ["チーム1"],
    team2.length ? team2 : ["チーム2"],
  ];
  const teamLabel = (t: Team) => names[t].join("・");

  const tap = useCallback(
    (team: Team) => {
      if (state.finished) return;
      const next = awardRally(state, config, team);
      setHistory((h) => [...h, next]);
    },
    [state, config]
  );

  const undo = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));

  const endGame = () => {
    // 手動終了: 現在の得点で終了(勝者は多い方、同点なら勝者なし)
    const [a, b] = state.scores;
    const winner: Team | null = a === b ? null : a > b ? 0 : 1;
    setHistory((h) => [...h, { ...state, finished: true, winner }]);
  };

  const call = scoreCall(state, config);
  const side = serveSide(state);

  const modeLabel = mode === "doubles" ? "ダブルス" : "シングルス";

  const Side = ({ team }: { team: Team }) => {
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
        {serving && (
          <>
            <span className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-pill bg-accent px-3 py-1.5 text-xs font-extrabold text-navy">
              <span className="h-2.5 w-2.5 rounded-full bg-navy" />
              {mode === "doubles" ? `サーブ #${state.serverNumber}` : "サーブ"}
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
          onClick={() => router.push("/scoreboard")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[15px]"
          aria-label="閉じる"
        >
          ✕
        </button>
        <div className="text-[13px] font-extrabold opacity-85">
          {modeLabel}・{target}点先取(2点差)
        </div>
        <div className="w-9" />
      </div>

      {/* スコアコール */}
      <div className="pb-3.5 pt-1.5 text-center">
        <small className="block text-[11px] tracking-[0.2em] opacity-60">
          SCORE CALL
        </small>
        <b className="tabnum text-[34px] font-extrabold tracking-[0.06em] text-accent">
          {call}
        </b>
      </div>

      {/* 2分割(縦: 上下 / 横: 左右) */}
      <div className="flex flex-1 flex-col landscape:flex-row">
        <Side team={0} />
        <div className="py-2 text-center text-xs font-extrabold opacity-50 landscape:flex landscape:items-center">
          VS
        </div>
        <Side team={1} />
      </div>

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

      {state.finished && (
        <FinishOverlay
          winnerLabel={state.winner === null ? null : teamLabel(state.winner)}
          scores={state.scores}
          onReplay={() => setHistory([initialState(config)])}
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
