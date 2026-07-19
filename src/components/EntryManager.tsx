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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingNames = new Set(entries.map((e) => e.name));

  const add = async (name: string) => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    try {
      await addTournamentEntries(tournamentId, [n]);
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setBusy(false);
    }
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

  const availableParticipants = eventParticipants.filter(
    (p) => !existingNames.has(p)
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
              ? "ペア名(例: けんじ・ゆうた)を追加してください"
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

        {/* 追加入力 */}
        <div className="mt-3 flex gap-2">
          <input
            list="entry-members"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add(text)}
            placeholder={discipline === "doubles" ? "ペア名(例: けんじ・ゆうた)" : "選手名"}
            className="flex-1 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-primary"
          />
          <button
            onClick={() => add(text)}
            disabled={busy || !text.trim()}
            className="btn-pill bg-navy px-5 text-sm text-white disabled:opacity-50"
          >
            追加
          </button>
        </div>

        {/* 活動日の参加者から追加 */}
        {availableParticipants.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[11px] font-bold text-muted">
              活動日の参加者から追加
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableParticipants.map((p) => (
                <button
                  key={p}
                  onClick={() => add(p)}
                  disabled={busy}
                  className="rounded-pill border border-line bg-bg px-3 py-1.5 text-xs font-bold text-primary-dark"
                >
                  ＋ {p}
                </button>
              ))}
            </div>
          </div>
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
