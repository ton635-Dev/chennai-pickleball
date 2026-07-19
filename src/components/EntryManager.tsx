"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import {
  addTournamentEntries,
  deleteTournamentEntry,
  generateBracket,
} from "@/app/actions";
import type { TournamentEntry } from "@/lib/types";

interface Props {
  tournamentId: string;
  format: "single_elim" | "round_robin";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 既にエントリー済みの名前(ペア名は「・」で分解して個人名も対象に)
  const usedNames = new Set<string>();
  for (const e of entries) {
    usedNames.add(e.name);
    for (const part of e.name.split("・")) usedNames.add(part.trim());
  }
  const availableParticipants = eventParticipants.filter(
    (p) => !usedNames.has(p) && p !== p1.trim() && p !== p2.trim()
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

  /** 参加者チップ: ダブルスは空いている選手枠に入れる / シングルスは直接追加 */
  const onChipTap = (name: string) => {
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
          disabled={busy || (discipline === "doubles" && !!p1.trim() && !!p2.trim())}
          className="rounded-pill border border-line bg-bg px-3 py-1.5 text-xs font-bold text-primary-dark disabled:opacity-40"
        >
          ＋ {p}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <datalist id="entry-members">
        {memberNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {/* 参加者リスト */}
      <div className="card p-4">
        <h2 className="mb-2.5 text-sm font-extrabold text-muted">
          参加者({entries.length}組)
        </h2>
        {entries.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted">
            {discipline === "doubles"
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
                <span className="flex-1 font-bold">{e.name}</span>
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

        {discipline === "doubles" ? (
          <>
            {/* 2人選択でペア作成(チーム名自動) */}
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold text-muted">
                2人を選んでペアを作成(チーム名は自動で「選手1・選手2」)
              </div>
              <div className="flex gap-2">
                <input
                  list="entry-members"
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  placeholder="選手1"
                  className={inputCls}
                />
                <input
                  list="entry-members"
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
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
              <input
                list="entry-members"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add(text)}
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
