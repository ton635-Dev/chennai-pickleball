"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { NameSuggestInput } from "./NameSuggestInput";
import {
  addTournamentEntries,
  addTeamEntry,
  deleteTournamentEntry,
  generateBracket,
} from "@/app/actions";
import type { TournamentEntry, TournamentFormat } from "@/lib/types";

interface Props {
  tournamentId: string;
  format: TournamentFormat;
  discipline: "singles" | "doubles";
  entries: TournamentEntry[];
  memberNames: string[];
  eventParticipants: string[];
}

const inputCls =
  "w-full min-w-0 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-primary";

export function EntryManager({
  tournamentId,
  format,
  discipline,
  entries,
  memberNames,
  eventParticipants,
}: Props) {
  const router = useRouter();
  const { member } = useMember();
  const [text, setText] = useState("");
  // ダブルス: 2人選択でペア作成
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  // 団体戦: チーム名 + メンバー3〜4人
  const [teamName, setTeamName] = useState("");
  const [teamPlayers, setTeamPlayers] = useState<string[]>(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTeam = format === "team_league";

  // 既にエントリー済みの名前(ペア名は「・」で分解、チームは構成メンバーも対象に)
  const usedNames = new Set<string>();
  for (const e of entries) {
    usedNames.add(e.name);
    for (const part of e.name.split("・")) usedNames.add(part.trim());
    for (const p of e.player_names ?? []) usedNames.add(p.trim());
  }
  const pendingTeam = teamPlayers.map((p) => p.trim()).filter(Boolean);
  const availableParticipants = eventParticipants.filter(
    (p) =>
      !usedNames.has(p) &&
      p !== p1.trim() &&
      p !== p2.trim() &&
      !pendingTeam.includes(p)
  );

  const add = async (name: string) => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    try {
      await addTournamentEntries(tournamentId, [n]);
      setText("");
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addPair = async () => {
    if (!p1.trim() || !p2.trim()) return;
    const ok = await add(`${p1.trim()}・${p2.trim()}`);
    if (ok) {
      setP1("");
      setP2("");
    }
  };

  /** 団体戦: チームを追加 */
  const addTeam = async () => {
    setBusy(true);
    setError(null);
    try {
      await addTeamEntry(tournamentId, teamName, teamPlayers);
      setTeamName("");
      setTeamPlayers(["", "", "", ""]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const setTeamPlayer = (i: number, v: string) =>
    setTeamPlayers((arr) => arr.map((x, j) => (j === i ? v : x)));

  /** 参加者チップ: 形式ごとに空いている枠へ入れる */
  const onChipTap = (name: string) => {
    if (isTeam) {
      const idx = teamPlayers.findIndex((p) => !p.trim());
      if (idx >= 0) setTeamPlayer(idx, name);
      return;
    }
    if (discipline === "singles") {
      add(name);
      return;
    }
    if (!p1.trim()) setP1(name);
    else if (!p2.trim()) setP2(name);
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteTournamentEntry(id, tournamentId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      await generateBracket(tournamentId, member?.id ?? null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
      setBusy(false);
    }
  };

  const chips = availableParticipants.length > 0 && (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {availableParticipants.map((p) => (
        <button
          key={p}
          onClick={() => onChipTap(p)}
          disabled={
            busy ||
            (isTeam
              ? teamPlayers.every((x) => !!x.trim())
              : discipline === "doubles" && !!p1.trim() && !!p2.trim())
          }
          className="rounded-pill border border-line bg-bg px-3 py-1.5 text-xs font-bold text-primary-dark disabled:opacity-40"
        >
          ＋ {p}
        </button>
      ))}
    </div>
  );

  const usedList = [...usedNames];

  return (
    <div className="space-y-3">
      {/* 参加者リスト */}
      <div className="card p-4">
        <h2 className="mb-2.5 text-sm font-extrabold text-muted">
          参加者({entries.length}組)
        </h2>
        {entries.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted">
            {isTeam
              ? "チーム名とメンバー(3〜4人)を入力して追加してください"
              : discipline === "doubles"
                ? "2人を選んでペアを作成するか、チーム名を直接入力してください"
                : "選手名を追加してください"}
          </p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((e, i) => (
              <div
                key={e.id}
                className="flex items-center gap-2 border-b border-line py-2 last:border-none text-sm"
              >
                <span className="w-6 shrink-0 text-center text-xs font-extrabold text-muted">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{e.name}</span>
                  {(e.player_names?.length ?? 0) > 0 && (
                    <span className="block truncate text-[11px] text-muted">
                      {e.player_names!.join("・")}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => remove(e.id)}
                  disabled={busy}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-muted hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {isTeam ? (
          <>
            {/* 団体戦: チーム名 + メンバー3〜4人 */}
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold text-muted">
                チーム名
              </div>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="例: チームA"
                className={inputCls}
              />
              <div className="mb-1.5 mt-3 text-[11px] font-bold text-muted">
                メンバー(3〜4人)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {teamPlayers.map((p, i) => (
                  <NameSuggestInput
                    key={i}
                    value={p}
                    onChange={(v) => setTeamPlayer(i, v)}
                    suggestions={memberNames}
                    exclude={[
                      ...usedList,
                      ...teamPlayers.filter((_, j) => j !== i),
                    ]}
                    placeholder={`メンバー${i + 1}${i === 3 ? "(任意)" : ""}`}
                    className={inputCls}
                  />
                ))}
              </div>
              {chips}
              <button
                onClick={addTeam}
                disabled={busy || !teamName.trim() || pendingTeam.length < 3}
                className="btn-pill mt-2 w-full bg-navy py-2.5 text-sm text-white disabled:opacity-50"
              >
                {!teamName.trim()
                  ? "チーム名を入力してください"
                  : pendingTeam.length < 3
                    ? "メンバーを3人以上入力してください"
                    : `「${teamName.trim()}」(${pendingTeam.length}人)を追加`}
              </button>
            </div>
          </>
        ) : discipline === "doubles" ? (
          <>
            {/* 2人選択でペア作成(チーム名自動) */}
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold text-muted">
                2人を選んでペアを作成(チーム名は自動で「選手1・選手2」)
              </div>
              <div className="flex gap-2">
                <NameSuggestInput
                  value={p1}
                  onChange={setP1}
                  suggestions={memberNames}
                  exclude={[...usedList, p2]}
                  placeholder="選手1"
                  className={inputCls}
                />
                <NameSuggestInput
                  value={p2}
                  onChange={setP2}
                  suggestions={memberNames}
                  exclude={[...usedList, p1]}
                  placeholder="選手2"
                  className={inputCls}
                />
              </div>
              {chips}
              <button
                onClick={addPair}
                disabled={busy || !p1.trim() || !p2.trim()}
                className="btn-pill mt-2 w-full bg-navy py-2.5 text-sm text-white disabled:opacity-50"
              >
                {p1.trim() && p2.trim()
                  ? `「${p1.trim()}・${p2.trim()}」を追加`
                  : "2人選ぶとペアを追加できます"}
              </button>
            </div>

            {/* 直接入力 */}
            <div className="my-3 flex items-center gap-2 text-[10px] font-bold text-muted">
              <span className="h-px flex-1 bg-line" />
              または チーム名を直接入力
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add(text)}
                placeholder="チーム名(例: チェンナイ最強ズ)"
                className={inputCls}
              />
              <button
                onClick={() => add(text)}
                disabled={busy || !text.trim()}
                className="btn-pill shrink-0 bg-navy px-5 text-sm text-white disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </>
        ) : (
          <>
            {/* シングルス: 選手名を追加 */}
            <div className="mt-3 flex gap-2">
              <NameSuggestInput
                value={text}
                onChange={setText}
                suggestions={memberNames}
                exclude={usedList}
                onEnter={() => add(text)}
                placeholder="選手名"
                className={inputCls}
              />
              <button
                onClick={() => add(text)}
                disabled={busy || !text.trim()}
                className="btn-pill shrink-0 bg-navy px-5 text-sm text-white disabled:opacity-50"
              >
                追加
              </button>
            </div>
            {availableParticipants.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-bold text-muted">
                  活動日の参加者から追加
                </div>
                {chips}
              </div>
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={generate}
        disabled={busy || entries.length < 2}
        className="btn-pill w-full bg-primary py-3.5 text-[15px] text-white disabled:opacity-50"
      >
        {entries.length < 2
          ? "参加者を2組以上追加してください"
          : format === "single_elim"
            ? "トーナメント表を生成"
            : "総当たり表を生成"}
      </button>
      <p className="text-center text-xs text-muted">
        生成すると開催中になります。あとから作り直すこともできます。
      </p>
    </div>
  );
}
