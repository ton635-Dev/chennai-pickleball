"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMember } from "./MemberProvider";
import { createMember, listMembers, findMembersByName } from "@/app/actions";
import { initial } from "@/lib/format";
import { PickleballIcon } from "./PickleballIcon";

/**
 * メンバー未登録の端末に表示するゲート。
 * 名前を登録して新規メンバー作成、または既存メンバーから自分を選んで復帰。
 */
export function MemberGate() {
  const { member, loaded, setMember } = useMember();
  const pathname = usePathname();
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 同名が既に登録されている場合の候補(重複登録の防止)
  const [dupes, setDupes] = useState<{ id: string; name: string }[] | null>(null);

  useEffect(() => {
    if (loaded && !member && tab === "existing" && members.length === 0) {
      listMembers()
        .then(setMembers)
        .catch(() => setError("メンバー一覧の取得に失敗しました"));
    }
  }, [loaded, member, tab, members.length]);

  // カジュアルスコアボードは登録なしでも使えるようにゲートを出さない
  if (!loaded || member || pathname.startsWith("/scoreboard")) return null;

  /** 同名チェック → 重複があれば選択させ、無ければ新規作成 */
  async function handleRegister() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const existing = await findMembersByName(name);
      if (existing.length > 0) {
        setDupes(existing);
        return;
      }
      const m = await createMember(name);
      setMember({ id: m.id, name: m.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-1 flex items-center gap-2 text-lg font-extrabold">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary text-accent">
            <PickleballIcon className="h-5 w-5" />
          </span>
          Chennai Pickleball
        </div>
        <p className="mb-5 text-sm text-muted">
          まずはあなたの表示名を登録してください。ログインは不要です。
        </p>

        <div className="mb-4 flex gap-2 rounded-xl bg-bg p-1">
          <button
            onClick={() => setTab("new")}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              tab === "new" ? "bg-surface text-ink shadow-sm" : "text-muted"
            }`}
          >
            はじめて
          </button>
          <button
            onClick={() => setTab("existing")}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              tab === "existing" ? "bg-surface text-ink shadow-sm" : "text-muted"
            }`}
          >
            一覧から選ぶ
          </button>
        </div>

        {dupes ? (
          <div>
            <div className="mb-3 rounded-xl border-l-4 border-amber bg-[#FBF0DC] p-3 text-[13px] leading-relaxed text-[#7a5410]">
              「{name.trim()}」はすでに登録されています。
              <b>同じ方なら既存のアカウントを選んでください</b>
              （これまでの出欠・記録がそのまま引き継がれます）。
            </div>
            <div className="mb-3 max-h-48 overflow-y-auto">
              {dupes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMember(m)}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-primary bg-[#E2F3EE] px-3 py-3 text-left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
                    {initial(m.name)}
                  </span>
                  <span className="flex-1 text-base font-bold">{m.name}</span>
                  <span className="text-xs font-bold text-primary-dark">
                    これを使う
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setDupes(null)}
              className="btn-pill w-full border-2 border-line bg-surface py-3 text-sm font-bold text-ink"
            >
              別の名前にする
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              別人で同じ名前の場合は「別の名前にする」で区別できる名前(例:
              {name.trim()}2)にしてください。
            </p>
          </div>
        ) : tab === "new" ? (
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              placeholder="表示名(例: けんじ)"
              className="mb-3 w-full rounded-xl border border-line bg-bg px-4 py-3 text-base outline-none focus:border-primary"
              autoFocus
            />
            <button
              onClick={handleRegister}
              disabled={busy || !name.trim()}
              className="btn-pill w-full bg-primary py-3 text-base text-white disabled:opacity-50"
            >
              {busy ? "確認中…" : "登録して始める"}
            </button>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {members.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                読み込み中…(まだ誰もいない場合は「はじめて」から登録)
              </p>
            ) : (
              members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMember(m)}
                  className="flex w-full items-center gap-3 border-b border-line py-3 text-left last:border-none"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDF4F1] text-xs font-extrabold text-primary-dark">
                    {initial(m.name)}
                  </span>
                  <span className="text-base font-bold">{m.name}</span>
                </button>
              ))
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
