"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTeamEntriesBulk } from "@/app/actions";
import { assignTeams, teamSizes, validTeamCounts } from "@/lib/team-assign";
import { NameSuggestInput } from "./NameSuggestInput";

const inputCls =
  "w-full min-w-0 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-primary";

interface Props {
  tournamentId: string;
  /** 候補(活動日の参加者を優先表示 + 全メンバー) */
  candidates: string[];
  /** 既にエントリー済みの人数(チーム名の連番用) */
  existingTeamCount: number;
  /** 大会設定の想定チーム数(あれば初期選択) */
  defaultTeamCount?: number | null;
  /** 1チームの人数(下限・上限) */
  sizeMin?: number;
  sizeMax?: number;
}

/**
 * 団体戦のチーム自動振り分けパネル。
 * 参加者を選ぶ → 分散させたい人に★ → チーム数を選ぶ → シャッフル → 登録。
 */
export function TeamAutoAssign({
  tournamentId,
  candidates,
  existingTeamCount,
  defaultTeamCount = null,
  sizeMin = 3,
  sizeMax = 4,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState<string[]>([]);
  const [starred, setStarred] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = validTeamCounts(pool.length, sizeMin, sizeMax);
  // 明示選択 → 大会設定のチーム数 → 候補の先頭
  const activeCount =
    teamCount && counts.includes(teamCount)
      ? teamCount
      : defaultTeamCount && counts.includes(defaultTeamCount)
        ? defaultTeamCount
        : counts[0] ?? null;

  const togglePool = (name: string) => {
    setPreview(null);
    setPool((p) =>
      p.includes(name) ? p.filter((x) => x !== name) : [...p, name]
    );
    setStarred((s) => s.filter((x) => x !== name || !pool.includes(name)));
  };

  const toggleStar = (name: string) =>
    setStarred((s) =>
      s.includes(name) ? s.filter((x) => x !== name) : [...s, name]
    );

  const addFree = () => {
    const n = freeText.trim();
    if (!n || pool.includes(n)) return;
    setPool((p) => [...p, n]);
    setFreeText("");
    setPreview(null);
  };

  const doShuffle = () => {
    if (!activeCount) return;
    setPreview(assignTeams(pool, starred, activeCount));
    setError(null);
  };

  const teamLetter = (i: number) =>
    `チーム${String.fromCharCode(65 + existingTeamCount + i)}`;

  const register = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await addTeamEntriesBulk(
        tournamentId,
        preview.map((players, i) => ({ name: teamLetter(i), players }))
      );
      // リセットして閉じる
      setOpen(false);
      setPool([]);
      setStarred([]);
      setPreview(null);
      setTeamCount(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-pill mt-3 w-full border-2 border-primary bg-surface py-2.5 text-[13px] font-extrabold text-primary"
      >
        ⚡ 自動でチーム分け
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-primary/30 bg-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-extrabold">⚡ 自動でチーム分け</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-muted"
        >
          閉じる
        </button>
      </div>

      {/* 1) 参加者を選ぶ */}
      <div className="mb-1 text-[11px] font-bold text-muted">
        1. 参加者を選ぶ(タップで追加/解除) — {pool.length}人
      </div>
      {candidates.length === 0 && pool.length === 0 ? (
        <p className="py-1 text-[11px] text-muted">
          候補がありません。下の入力欄から名前を追加してください。
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...candidates, ...pool])].map((p) => {
            const sel = pool.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePool(p)}
                className={`rounded-pill px-3 py-1.5 text-xs font-bold ${
                  sel
                    ? "bg-primary text-white"
                    : "border border-line bg-surface text-primary-dark"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <NameSuggestInput
          value={freeText}
          onChange={setFreeText}
          suggestions={candidates}
          exclude={pool}
          onEnter={addFree}
          placeholder="名前を追加(候補外もOK)"
          className={inputCls}
        />
        <button
          onClick={addFree}
          disabled={!freeText.trim()}
          className="btn-pill shrink-0 bg-navy px-4 text-xs text-white disabled:opacity-50"
        >
          追加
        </button>
      </div>

      {/* 2) 分散させたい人 */}
      {pool.length > 0 && (
        <>
          <div className="mb-1 mt-3 text-[11px] font-bold text-muted">
            2. 分散させたい人に★(任意) — 強い人・経験者などを別チームに分けます
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pool.map((p) => {
              const on = starred.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => toggleStar(p)}
                  className={`rounded-pill px-3 py-1.5 text-xs font-bold ${
                    on
                      ? "bg-amber text-white"
                      : "border border-line bg-surface text-muted"
                  }`}
                >
                  {on ? "★ " : "☆ "}
                  {p}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 3) チーム数 */}
      <div className="mb-1 mt-3 text-[11px] font-bold text-muted">
        3. チーム数(1チーム
        {sizeMin === sizeMax ? `${sizeMin}人` : `${sizeMin}〜${sizeMax}人`})
      </div>
      {counts.length === 0 ? (
        <p className="text-[11px] text-muted">
          {pool.length < sizeMin * 2
            ? `${sizeMin * 2}人以上選ぶとチーム分けできます`
            : `この人数では${
                sizeMin === sizeMax ? `${sizeMin}人` : `${sizeMin}〜${sizeMax}人`
              }のチームに分けられません(人数を調整してください)`}
        </p>
      ) : (
        <div className="flex gap-2">
          {counts.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTeamCount(t);
                setPreview(null);
              }}
              className={`flex-1 rounded-xl border-2 py-2 text-xs font-extrabold ${
                activeCount === t
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-surface text-muted"
              }`}
            >
              {t}チーム({teamSizes(pool.length, t).join("・")}人)
            </button>
          ))}
        </div>
      )}

      {/* 実行 */}
      <button
        onClick={doShuffle}
        disabled={!activeCount}
        className="btn-pill mt-3 w-full bg-navy py-2.5 text-sm text-white disabled:opacity-50"
      >
        {preview ? "🔀 シャッフルし直す" : "チーム分けを実行"}
      </button>

      {/* プレビュー */}
      {preview && (
        <div className="mt-3 space-y-2">
          {preview.map((players, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-2.5">
              <div className="mb-1 text-[11px] font-extrabold text-primary-dark">
                {teamLetter(i)}({players.length}人)
              </div>
              <div className="flex flex-wrap gap-1">
                {players.map((p) => (
                  <span
                    key={p}
                    className={`rounded-pill px-2.5 py-1 text-[11px] font-bold ${
                      starred.includes(p)
                        ? "bg-[#FBF0DC] text-[#9A6B14]"
                        : "bg-bg text-ink"
                    }`}
                  >
                    {starred.includes(p) ? "★ " : ""}
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={register}
            disabled={busy}
            className="btn-pill w-full bg-primary py-3 text-[15px] text-white disabled:opacity-50"
          >
            {busy ? "登録中…" : `この編成で${preview.length}チームを登録`}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
