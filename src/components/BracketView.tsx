"use client";

import { useState } from "react";
import { roundName } from "@/lib/tournament";
import { MatchResultDialog } from "./MatchResultDialog";
import type { Tournament, TournamentEntry, TournamentMatch } from "@/lib/types";

interface Props {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
}

// レイアウト定数
const CARD_W = 108;
const GAP_X = 14;
const COL = CARD_W + GAP_X;
const TOP_PAD = 26;
const BAND = 100;
const BASE_H = 48;
const FINAL_H = 66;

export function BracketView({ tournament, entries, matches }: Props) {
  const [dialog, setDialog] = useState<TournamentMatch | null>(null);
  const byId = new Map(entries.map((e) => [e.id, e.name]));
  const name = (id: string | null) => (id ? byId.get(id) ?? "?" : null);

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort(
    (a, b) => a - b
  );
  if (rounds.length === 0) return null;
  const total = rounds.length;
  const finalRound = rounds[rounds.length - 1];
  const count1 = matches.filter((m) => m.round === rounds[0]).length;

  // ラウンドの上からのバンド位置(決勝=0)
  const bandOf = (r: number) => total - 1 - rounds.indexOf(r);
  const yTop = (r: number) => TOP_PAD + bandOf(r) * BAND;
  const heightOf = (r: number) => (r === finalRound ? FINAL_H : BASE_H);

  // 各試合の中心X(下段=均等、上段=子2つの中点)
  const centerX = new Map<string, number>();
  const key = (r: number, p: number) => `${r}:${p}`;
  matches
    .filter((m) => m.round === rounds[0])
    .forEach((m) => centerX.set(key(m.round, m.position), m.position * COL + CARD_W / 2));
  for (let i = 1; i < rounds.length; i++) {
    const r = rounds[i];
    const pr = rounds[i - 1];
    matches
      .filter((m) => m.round === r)
      .forEach((m) => {
        const c1 = centerX.get(key(pr, m.position * 2));
        const c2 = centerX.get(key(pr, m.position * 2 + 1));
        const cx =
          c1 != null && c2 != null
            ? (c1 + c2) / 2
            : c1 ?? c2 ?? m.position * COL + CARD_W / 2;
        centerX.set(key(r, m.position), cx);
      });
  }

  const canvasW = Math.max(count1 * COL - GAP_X, CARD_W);
  const canvasH = TOP_PAD + (total - 1) * BAND + FINAL_H + 8;

  // 接続線
  const connectors = matches
    .filter((m) => m.round !== finalRound)
    .map((m) => {
      const ri = rounds.indexOf(m.round);
      const parentR = rounds[ri + 1];
      const childCx = centerX.get(key(m.round, m.position))!;
      const childTopY = yTop(m.round);
      const parentCx = centerX.get(key(parentR, Math.floor(m.position / 2)))!;
      const parentBottomY = yTop(parentR) + heightOf(parentR);
      const midY = (childTopY + parentBottomY) / 2;
      return {
        id: m.id,
        d: `M${childCx} ${childTopY} V${midY} H${parentCx} V${parentBottomY}`,
        decided: m.status === "done",
      };
    });

  // 次の試合(両者確定・未消化の最初)
  const nextMatch = matches
    .filter((m) => m.status === "pending" && m.entry1_id && m.entry2_id)
    .sort((a, b) => a.round - b.round || a.position - b.position)[0];

  // ステッパー状態
  const roundDone = (r: number) =>
    matches.filter((m) => m.round === r).every((m) => m.status === "done");
  const nowRound = rounds.find((r) => !roundDone(r)) ?? finalRound;

  const PlayerRow = ({
    nm,
    sc,
    win,
    lose,
    big,
  }: {
    nm: string | null;
    sc: number | null;
    win: boolean;
    lose: boolean;
    big?: boolean;
  }) => (
    <div
      className={`flex items-center gap-1.5 px-2 ${big ? "py-1.5 text-[11.5px]" : "py-1 text-[10.5px]"} ${
        win ? "bg-[#EDF7E7] font-extrabold" : lose ? "text-muted" : ""
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{nm ?? "勝者待ち"}</span>
      <span
        className={`tabnum rounded px-1.5 text-[10px] font-extrabold ${
          win ? "bg-primary text-white" : "bg-[#EDF1EF] text-muted"
        }`}
      >
        {sc ?? "–"}
      </span>
    </div>
  );

  const Card = ({ m }: { m: TournamentMatch }) => {
    const isFinal = m.round === finalRound;
    const n1 = name(m.entry1_id);
    const n2 = name(m.entry2_id);
    const both = !!m.entry1_id && !!m.entry2_id;
    // 不戦勝は「片側が空 かつ 確定済み(生成時のBYE)」のみ。
    // 2回戦以降の空き枠は下の試合の勝者待ちなので「勝者待ち」を表示する。
    const isBye =
      (!!m.entry1_id) !== (!!m.entry2_id) && m.status === "done";
    const w1 = !!m.winner_entry_id && m.winner_entry_id === m.entry1_id;
    const w2 = !!m.winner_entry_id && m.winner_entry_id === m.entry2_id;
    const pending = m.status === "pending";
    return (
      <button
        onClick={() => both && setDialog(m)}
        disabled={!both}
        className={`absolute overflow-hidden rounded-[11px] bg-surface text-left shadow-[0_2px_6px_rgba(18,43,51,0.06)] ${
          isFinal
            ? "border-2 border-accent shadow-[0_0_0_4px_rgba(216,236,63,0.22)]"
            : pending
              ? "border-[1.5px] border-dashed border-[#BFCFC8]"
              : "border-[1.5px] border-line"
        } ${both ? "active:border-primary" : ""}`}
        style={{
          left: centerX.get(key(m.round, m.position))! - CARD_W / 2,
          top: yTop(m.round),
          width: CARD_W,
        }}
      >
        {isFinal && (
          <div className="bg-navy py-1 text-center text-[9px] font-extrabold tracking-[0.2em] text-accent">
            🏆 FINAL
          </div>
        )}
        <PlayerRow nm={n1} sc={m.score1} win={w1} lose={w2} big={isFinal} />
        <div className="border-t border-line" />
        {isBye && !m.entry2_id ? (
          <div className="px-2 py-1 text-[10px] text-muted">不戦勝</div>
        ) : (
          <PlayerRow nm={n2} sc={m.score2} win={w2} lose={w1} big={isFinal} />
        )}
      </button>
    );
  };

  return (
    <div>
      {tournament.status === "done" && tournament.champion && (
        <div className="mb-3 rounded-card border-2 border-accent bg-[#FBFCEB] p-4 text-center">
          <div className="text-2xl">🏆</div>
          <div className="mt-1 text-lg font-extrabold text-primary-dark">
            優勝: {tournament.champion}
          </div>
        </div>
      )}

      {/* ラウンド進行ステッパー */}
      <div className="mb-3 flex items-center rounded-card border border-line bg-surface px-4 py-3">
        {rounds.map((r, i) => {
          const done = roundDone(r);
          const now = r === nowRound && !done;
          return (
            <div key={r} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                    done
                      ? "bg-primary text-white"
                      : now
                        ? "bg-accent text-navy shadow-[0_0_0_4px_rgba(216,236,63,0.35)]"
                        : "bg-[#EDF1EF] text-muted"
                  }`}
                >
                  {done ? "✓" : r === finalRound ? "🏆" : i + 1}
                </span>
                <span
                  className={`text-[10px] font-extrabold ${now ? "text-primary-dark" : "text-muted"}`}
                >
                  {roundName(r, total)}
                </span>
              </div>
              {i < rounds.length - 1 && (
                <div
                  className={`mb-4 h-[3px] flex-1 rounded ${done ? "bg-primary" : "bg-[#EDF1EF]"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 次の試合 */}
      {nextMatch && (
        <button
          onClick={() => setDialog(nextMatch)}
          className="mb-3 flex w-full items-center gap-3 rounded-card bg-gradient-to-br from-primary to-primary-dark p-3.5 text-left text-white"
        >
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-navy">
            {nextMatch.court ? (
              <>
                <b className="text-sm leading-none">{nextMatch.court}</b>
                <span className="text-[8px] tracking-wide">COURT</span>
              </>
            ) : (
              <b className="text-[11px] leading-none">
                {roundName(nextMatch.round, total).slice(0, 3)}
              </b>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <small className="text-[11px] font-extrabold tracking-wide text-accent">
              次の試合 — {roundName(nextMatch.round, total)}
            </small>
            <b className="mt-0.5 block truncate text-sm">
              {name(nextMatch.entry1_id)} vs {name(nextMatch.entry2_id)}
            </b>
          </div>
          <span className="shrink-0 text-xs opacity-80">結果入力 ›</span>
        </button>
      )}

      {/* 縦型ブラケット */}
      <div className="rounded-card border border-line bg-surface p-3">
        <div className="overflow-x-auto">
          <div
            className="relative mx-auto"
            style={{ width: canvasW, height: canvasH, minWidth: canvasW }}
          >
            <svg
              className="absolute inset-0"
              width={canvasW}
              height={canvasH}
              fill="none"
            >
              {connectors.map((c) => (
                <path
                  key={c.id}
                  d={c.d}
                  stroke={c.decided ? "#0E7C63" : "#BFCFC8"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={c.decided ? undefined : "5 5"}
                />
              ))}
            </svg>
            {/* ラウンドラベル */}
            {rounds.map((r) => (
              <div
                key={`pill-${r}`}
                className="absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-pill border border-line bg-surface px-3 py-0.5 text-[9.5px] font-extrabold tracking-[0.15em] text-muted"
                style={{ left: canvasW / 2, top: yTop(r) - 18 }}
              >
                {roundName(r, total)}
              </div>
            ))}
            {/* 試合カード */}
            {matches.map((m) => (
              <Card key={m.id} m={m} />
            ))}
          </div>
        </div>

        {/* 凡例 */}
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-4 rounded bg-primary" />
            勝ち上がり確定
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-[3px] border-dashed border-[#BFCFC8]" />
            対戦待ち
          </span>
          <span>▲ 下から上へ勝ち上がり</span>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">
        試合カードをタップして結果を入力できます。
      </p>

      {dialog && (
        <MatchResultDialog
          matchId={dialog.id}
          name1={name(dialog.entry1_id) ?? "?"}
          name2={name(dialog.entry2_id) ?? "?"}
          initial1={dialog.score1}
          initial2={dialog.score2}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
