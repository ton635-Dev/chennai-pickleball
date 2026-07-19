"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMember } from "./MemberProvider";
import { createMember, listMembers } from "@/app/actions";
import { initial } from "@/lib/format";

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

  useEffect(() => {
    if (loaded && !member && tab === "existing" && members.length === 0) {
      listMembers()
        .then(setMembers)
        .catch(() => setError("メンバー一覧の取得に失敗しました"));
    }
  }, [loaded, member, tab, members.length]);

  // カジュアルスコアボードは登録なしでも使えるようにゲートを出さない
  if (!loaded || member || pathname.startsWith("/scoreboard")) return null;

  async function handleRegister() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
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
            🏓
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

        {tab === "new" ? (
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
              {busy ? "登録中…" : "登録して始める"}
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
