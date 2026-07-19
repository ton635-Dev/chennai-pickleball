"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { updateMemberName } from "@/app/actions";
import { Avatar } from "./bits";
import type { MemberStat } from "@/lib/data";

export function MoreView({ stats }: { stats: MemberStat[] }) {
  const { member, setMember, signOut } = useMember();
  const router = useRouter();
  const [name, setName] = useState(member?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!member || !name.trim()) return;
    setBusy(true);
    try {
      const res = await updateMemberName(member.id, name);
      setMember({ id: res.id, name: res.name });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <h1 className="mb-4 text-[22px] font-extrabold">メンバー / 設定</h1>

      {/* プロフィール */}
      <div className="card mb-3 p-4">
        <h2 className="mb-3 text-sm font-extrabold text-muted">
          プロフィール(表示名)
        </h2>
        {member ? (
          <>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-line bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-primary"
              />
              <button
                onClick={save}
                disabled={busy || !name.trim()}
                className="btn-pill bg-primary px-5 text-sm text-white disabled:opacity-50"
              >
                {saved ? "保存済" : "保存"}
              </button>
            </div>
            <button
              onClick={signOut}
              className="mt-3 text-[13px] font-bold text-primary underline"
            >
              別の端末・別のメンバーに切り替える(端末の再ひも付け)
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">
            まだメンバー登録されていません。画面をリロードして登録してください。
          </p>
        )}
      </div>

      {/* メンバー一覧 */}
      <div className="card p-4">
        <h2 className="mb-2.5 text-sm font-extrabold text-muted">
          メンバー一覧(参加回数)
        </h2>
        {stats.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">
            まだメンバーがいません
          </p>
        ) : (
          stats.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 border-b border-line py-2.5 last:border-none"
            >
              <Avatar name={m.name} className="h-8 w-8 text-xs" />
              <span className="text-sm font-bold">{m.name}</span>
              {member?.id === m.id && (
                <span className="rounded-pill bg-[#E2F3EE] px-2 py-0.5 text-[10px] font-extrabold text-primary-dark">
                  あなた
                </span>
              )}
              <span className="ml-auto text-[13px] font-bold text-muted">
                {m.joinCount}回
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
