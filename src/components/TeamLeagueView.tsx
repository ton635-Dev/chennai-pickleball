"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeTeamStandings, summarizeTie } from "@/lib/tournament";
import { setTieResult } from "@/app/actions";
import { useMember } from "./MemberProvider";
import type {
  TieGame,
  Tournament,
  TournamentEntry,
  TournamentMatch,
} from "@/lib/types";

interface Props {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
}

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];
const circle = (i: number) => CIRCLED[i] ?? `${i + 1}`;

export function TeamLeagueView({ tournament, entries, matches }: Props) {
  const [tab, setTab] = useState<"rank" | "table" | "list">("rank");
  const [dialog, setDialog] = useState<TournamentMatch | null>(null);

  const byId = new Map(entries.map((e) => [e.id, e]));
  const name = (id: string | null) => (id ? byId.get(id)?.name ?? "?" : "?");

  const standings = computeTeamStandings(
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
        <TabBtn k="list" label="対戦一覧" />
      </div>

      {tab === "rank" && (
        <div className="card p-4">
          <h2 className="mb-2.5 text-sm font-extrabold text-muted">
            現在の順位(勝敗 → 勝ゲーム数 → 得失点差)
          </h2>
          <div className="flex items-center gap-2.5 pb-1.5 text-[10px] font-bold text-muted">
            <span className="w-6 shrink-0" />
            <span className="flex-1">チーム</span>
            <span className="w-12 text-right">勝敗</span>
            <span className="w-10 text-right">勝G</span>
            <span className="w-10 text-right">得失</span>
          </div>
          {standings.map((s, i) => {
            const e = byId.get(s.entryId);
            return (
              <div
                key={s.entryId}
                className="flex items-center gap-2.5 border-t border-line py-2.5 text-sm"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    i === 0 ? "bg-accent text-navy" : "bg-[#EDF4F1] text-primary-dark"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{e?.name ?? "?"}</b>
                  {(e?.player_names?.length ?? 0) > 0 && (
                    <span className="block truncate text-[10px] text-muted">
                      {e!.player_names!.join("・")}
                    </span>
                  )}
                </span>
                <span className="tabnum w-12 text-right font-extrabold">
                  {s.wins}-{s.losses}
                </span>
                <span className="tabnum w-10 text-right font-extrabold text-primary-dark">
                  {s.gamesWon}
                </span>
                <span className="tabnum w-10 text-right text-xs text-muted">
                  {s.diff >= 0 ? `+${s.diff}` : s.diff}
                </span>
              </div>
            );
          })}
          <p className="mt-2 text-[11px] text-muted">
            勝G = 取った合計ゲーム数。勝敗が並んだ場合は勝Gで順位を決めます。
          </p>
        </div>
      )}

      {tab === "table" && (
        <div className="card overflow-x-auto p-4">
          <h2 className="mb-2.5 text-sm font-extrabold text-muted">星取表(総当たり)</h2>
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="p-1.5" />
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
                    let sub = "";
                    if (m && done) {
                      const s = summarizeTie(m.games);
                      const iAm1 = m.entry1_id === e.id;
                      const my = iAm1 ? s.gamesWon1 : s.gamesWon2;
                      const opp = iAm1 ? s.gamesWon2 : s.gamesWon1;
                      const won = my > opp;
                      mark = won ? "○" : "×";
                      cls = won
                        ? "text-primary-dark font-extrabold"
                        : "text-[#C4514A] font-extrabold";
                      sub = `${my}-${opp}`;
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
                              {sub}
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
          <p className="mt-2 text-[11px] text-muted">
            セルをタップして結果(各ゲームのスコア)を入力できます。数字は取得ゲーム数。
          </p>
        </div>
      )}

      {tab === "list" && (
        <div className="card p-4">
          <h2 className="mb-1 text-sm font-extrabold text-muted">対戦一覧</h2>
          {matches.map((m) => {
            const done = m.status === "done";
            const s = summarizeTie(m.games);
            const w1 = done && s.gamesWon1 > s.gamesWon2;
            const w2 = done && s.gamesWon2 > s.gamesWon1;
            return (
              <button
                key={m.id}
                onClick={() => setDialog(m)}
                className="w-full border-b border-line py-2.5 text-sm last:border-none"
              >
                <div className="flex items-center gap-2">
                  <span className={`flex-1 text-right ${w1 ? "font-extrabold" : done ? "text-muted" : ""}`}>
                    {name(m.entry1_id)}
                  </span>
                  <b className="tabnum shrink-0 rounded-lg bg-navy px-2.5 py-1 text-xs text-accent">
                    {done || s.played > 0 ? `${s.gamesWon1} - ${s.gamesWon2}` : "vs"}
                  </b>
                  <span className={`flex-1 text-left ${w2 ? "font-extrabold" : done ? "text-muted" : ""}`}>
                    {name(m.entry2_id)}
                  </span>
                </div>
                {s.played > 0 && (
                  <div className="tabnum mt-1 text-center text-[10px] text-muted">
                    {(m.games ?? [])
                      .filter((g) => g.s1 != null && g.s2 != null)
                      .map((g) => `${g.s1}-${g.s2}`)
                      .join(" / ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {dialog && (
        <TieResultDialog
          match={dialog}
          gamesPerTie={tournament.games_per_tie ?? 3}
          pointsPerGame={tournament.points_per_game ?? 7}
          name1={name(dialog.entry1_id)}
          name2={name(dialog.entry2_id)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 対戦結果入力(ゲームごとのスコア + 出場ペア任意)
// ---------------------------------------------------------------------
function TieResultDialog({
  match,
  gamesPerTie,
  pointsPerGame,
  name1,
  name2,
  onClose,
}: {
  match: TournamentMatch;
  gamesPerTie: number;
  pointsPerGame: number;
  name1: string;
  name2: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { member } = useMember();

  const init: TieGame[] = Array.from({ length: gamesPerTie }, (_, i) => {
    const g = (match.games ?? []).find((x) => x.g === i + 1);
    return {
      g: i + 1,
      s1: g?.s1 ?? null,
      s2: g?.s2 ?? null,
      p1: g?.p1 ?? "",
      p2: g?.p2 ?? "",
    };
  });
  const [games, setGames] = useState<TieGame[]>(init);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setG = (i: number, patch: Partial<TieGame>) =>
    setGames((arr) => arr.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  const numVal = (v: number | null) => (v == null ? "" : String(v));
  const parseNum = (s: string): number | null => {
    const t = s.replace(/[^0-9]/g, "").slice(0, 2);
    return t === "" ? null : parseInt(t, 10);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await setTieResult(match.id, games, member?.id ?? null);
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setBusy(false);
    }
  };

  const scoreCls =
    "w-14 rounded-xl border border-line bg-bg px-2 py-2 text-center text-lg font-extrabold outline-none focus:border-primary";
  const pairCls =
    "min-w-0 flex-1 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-[12px] outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-h-[85vh] w-full max-w-sm overflow-y-auto p-5">
        <h3 className="text-[15px] font-extrabold">
          {name1} vs {name2}
        </h3>
        <p className="mt-0.5 text-[11px] text-muted">
          各ゲーム{pointsPerGame}点マッチ。全{gamesPerTie}
          ゲームのスコアが揃うと勝敗が確定します。
        </p>

        <div className="mt-3 space-y-2.5">
          {games.map((g, i) => (
            <div key={g.g} className="rounded-xl bg-bg p-2.5">
              <div className="mb-1.5 text-[10px] font-extrabold tracking-wide text-muted">
                ゲーム{g.g}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={g.p1 ?? ""}
                  onChange={(e) => setG(i, { p1: e.target.value })}
                  placeholder={`${name1}のペア(任意)`}
                  className={pairCls}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={numVal(g.s1)}
                  onChange={(e) => setG(i, { s1: parseNum(e.target.value) })}
                  placeholder="-"
                  className={scoreCls}
                />
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  value={g.p2 ?? ""}
                  onChange={(e) => setG(i, { p2: e.target.value })}
                  placeholder={`${name2}のペア(任意)`}
                  className={pairCls}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={numVal(g.s2)}
                  onChange={(e) => setG(i, { s2: parseNum(e.target.value) })}
                  placeholder="-"
                  className={scoreCls}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="btn-pill flex-1 border border-line bg-surface py-2.5 text-sm text-muted"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="btn-pill flex-[2] bg-primary py-2.5 text-sm text-white disabled:opacity-50"
          >
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
