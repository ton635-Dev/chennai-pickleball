"use client";

import { useState } from "react";
import { computeStandings } from "@/lib/tournament";
import { MatchResultDialog } from "./MatchResultDialog";
import type { Tournament, TournamentEntry, TournamentMatch } from "@/lib/types";

interface Props {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
}

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];
const circle = (i: number) => CIRCLED[i] ?? `${i + 1}`;

export function LeagueView({ tournament, entries, matches }: Props) {
  const [tab, setTab] = useState<"table" | "rank" | "list">("rank");
  const [dialog, setDialog] = useState<TournamentMatch | null>(null);

  const byId = new Map(entries.map((e) => [e.id, e.name]));
  const name = (id: string | null) => (id ? byId.get(id) ?? "?" : "?");
  const idxById = new Map(entries.map((e, i) => [e.id, i]));

  const standings = computeStandings(
    entries.map((e) => e.id),
    matches
  );

  const matchBetween = (a: string, b: string) =>
    matches.find(
      (m) =>
        (m.entry1_id === a && m.entry2_id === b) ||
        (m.entry1_id === b && m.entry2_id === a)
    );

  const TabBtn = ({ k, label }: { k: typeof tab; label: string }) => (
    <button
      onClick={() => setTab(k)}
      className={`rounded-pill px-4 py-2 text-[13px] font-extrabold ${
        tab === k ? "bg-navy text-white" : "border border-line bg-surface text-muted"
      }`}
    >
      {label}
    </button>
  );

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

      <div className="mb-3 flex gap-2">
        <TabBtn k="rank" label="順位" />
        <TabBtn k="table" label="星取表" />
        <TabBtn k="list" label="試合一覧" />
      </div>

      {tab === "rank" && (
        <div className="card p-4">
          <h2 className="mb-2.5 text-sm font-extrabold text-muted">
            現在の順位(勝数 → 得失点差)
          </h2>
          {standings.map((s, i) => (
            <div
              key={s.entryId}
              className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-none text-sm"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  i === 0 ? "bg-accent text-navy" : "bg-[#EDF4F1] text-primary-dark"
                }`}
              >
                {i + 1}
              </span>
              <b className="flex-1 truncate">{name(s.entryId)}</b>
              <span className="tabnum font-extrabold">
                {s.wins}勝{s.losses}敗
              </span>
              <span className="tabnum w-10 text-right text-xs text-muted">
                {s.diff >= 0 ? `+${s.diff}` : s.diff}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "table" && (
        <div className="card overflow-x-auto p-4">
          <h2 className="mb-2.5 text-sm font-extrabold text-muted">星取表(総当たり)</h2>
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="whitespace-nowrap p-1.5 text-left text-[10px] text-muted" />
                {entries.map((_, i) => (
                  <th key={i} className="p-1.5 text-[10px] text-muted">
                    {circle(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap border-b border-line p-1.5 text-left text-[11px] font-extrabold">
                    {circle(i)} {e.name}
                  </td>
                  {entries.map((e2, j) => {
                    if (i === j)
                      return (
                        <td key={j} className="border-b border-line bg-[#F1F5F3] p-1.5 text-muted">
                          —
                        </td>
                      );
                    const m = matchBetween(e.id, e2.id);
                    const done = m?.status === "done";
                    let mark = "・";
                    let cls = "text-muted";
                    let myScore: number | null = null;
                    let oppScore: number | null = null;
                    if (m && done) {
                      const iAm1 = m.entry1_id === e.id;
                      myScore = iAm1 ? m.score1 : m.score2;
                      oppScore = iAm1 ? m.score2 : m.score1;
                      const won = m.winner_entry_id === e.id;
                      mark = won ? "○" : "●";
                      cls = won ? "text-primary-dark font-extrabold" : "text-[#C4514A] font-extrabold";
                    }
                    return (
                      <td key={j} className="border-b border-line p-1">
                        <button
                          onClick={() => m && setDialog(m)}
                          disabled={!m}
                          className={`leading-tight ${cls}`}
                        >
                          {mark}
                          {done && (
                            <span className="tabnum block text-[9px] text-muted">
                              {myScore}-{oppScore}
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted">セルをタップして結果を入力できます。</p>
        </div>
      )}

      {tab === "list" && (
        <div className="card p-4">
          <h2 className="mb-1 text-sm font-extrabold text-muted">試合一覧</h2>
          {matches.map((m) => {
            const done = m.status === "done";
            const w1 = m.winner_entry_id === m.entry1_id;
            const w2 = m.winner_entry_id === m.entry2_id;
            return (
              <button
                key={m.id}
                onClick={() => setDialog(m)}
                className="flex w-full items-center gap-2 border-b border-line py-2.5 last:border-none text-sm"
              >
                <span className={`flex-1 text-right ${w1 ? "font-extrabold" : done ? "text-muted" : ""}`}>
                  {name(m.entry1_id)}
                </span>
                <b className="tabnum shrink-0 rounded-lg bg-navy px-2.5 py-1 text-xs text-accent">
                  {done ? `${m.score1} - ${m.score2}` : "vs"}
                </b>
                <span className={`flex-1 text-left ${w2 ? "font-extrabold" : done ? "text-muted" : ""}`}>
                  {name(m.entry2_id)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {dialog && (
        <MatchResultDialog
          matchId={dialog.id}
          name1={name(dialog.entry1_id)}
          name2={name(dialog.entry2_id)}
          initial1={dialog.score1}
          initial2={dialog.score2}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
