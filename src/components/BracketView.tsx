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

export function BracketView({ tournament, entries, matches }: Props) {
  const [dialog, setDialog] = useState<TournamentMatch | null>(null);
  const byId = new Map(entries.map((e) => [e.id, e.name]));
  const name = (id: string | null) => (id ? byId.get(id) ?? "?" : null);

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const total = rounds.length;

  // 次の試合: 両者確定・未消化の最初の試合
  const nextMatch = matches
    .filter((m) => m.status === "pending" && m.entry1_id && m.entry2_id)
    .sort((a, b) => a.round - b.round || a.position - b.position)[0];

  const MatchCard = ({ m }: { m: TournamentMatch }) => {
    const n1 = name(m.entry1_id);
    const n2 = name(m.entry2_id);
    const bothKnown = !!m.entry1_id && !!m.entry2_id;
    const isBye = (!!m.entry1_id && !m.entry2_id) || (!m.entry1_id && !!m.entry2_id);
    const w1 = m.winner_entry_id && m.winner_entry_id === m.entry1_id;
    const w2 = m.winner_entry_id && m.winner_entry_id === m.entry2_id;
    const clickable = bothKnown;

    const row = (nm: string | null, sc: number | null, win: boolean, lose: boolean) => (
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 text-[11px] ${
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

    return (
      <button
        onClick={() => clickable && setDialog(m)}
        disabled={!clickable}
        className={`w-40 overflow-hidden rounded-xl border bg-surface text-left shadow-sm ${
          m.status === "pending" ? "border-dashed border-[#BFCFC8]" : "border-line"
        } ${clickable ? "hover:border-primary" : ""}`}
      >
        {row(n1, m.score1, !!w1, !!w2 || (m.status === "done" && !w1))}
        <div className="border-t border-line" />
        {isBye && !m.entry2_id ? (
          <div className="px-2 py-1.5 text-[10px] text-muted">不戦勝</div>
        ) : (
          row(n2, m.score2, !!w2, !!w1 || (m.status === "done" && !w2))
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

      {/* 次の試合 */}
      {nextMatch && (
        <button
          onClick={() => setDialog(nextMatch)}
          className="mb-3 flex w-full items-center gap-3 rounded-card bg-gradient-to-br from-primary to-primary-dark p-3.5 text-left text-white"
        >
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-navy">
            <b className="text-sm leading-none">
              {roundName(nextMatch.round, total).slice(0, 2)}
            </b>
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

      {/* ブラケット(ラウンド列・横スクロール) */}
      <div className="card overflow-x-auto p-3">
        <div className="flex gap-5" style={{ minWidth: "min-content" }}>
          {rounds.map((r) => {
            const ms = matches
              .filter((m) => m.round === r)
              .sort((a, b) => a.position - b.position);
            return (
              <div key={r} className="flex flex-col">
                <div className="mb-2 text-center text-[11px] font-extrabold tracking-wider text-muted">
                  {roundName(r, total)}
                </div>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {ms.map((m) => (
                    <MatchCard key={m.id} m={m} />
                  ))}
                </div>
              </div>
            );
          })}
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
