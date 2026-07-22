"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { updateMemberName, deleteMember, findMembersByName } from "@/app/actions";
import { Avatar } from "./bits";
import { PickleballIcon } from "./PickleballIcon";
import { UpiQrManager } from "./UpiQrManager";
import type { MemberStat } from "@/lib/data";

const MENU: { href: string; icon: ReactNode; label: string; desc: string }[] = [
  { href: "/courts", icon: "📍", label: "コート情報", desc: "コートの登録・評価・写真" },
  {
    href: "/matches",
    icon: <PickleballIcon className="h-5 w-5 text-primary-dark" />,
    label: "試合履歴",
    desc: "保存した試合の記録・戦績",
  },
  { href: "/rules", icon: "📘", label: "ルールを学ぶ", desc: "7章の学習・早見表" },
];

export function MoreView({ stats }: { stats: MemberStat[] }) {
  const { member, setMember, signOut } = useMember();
  const router = useRouter();

  // プロフィール(自分の表示名)
  const [name, setName] = useState(member?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // メンバー一覧の編集・削除
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirm, setConfirm] = useState<MemberStat | null>(null);
  const [rowBusy, setRowBusy] = useState(false);
  // 同名が既にある場合の選択(自分の改名時)
  const [dupes, setDupes] = useState<{ id: string; name: string }[] | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const saveSelf = async () => {
    if (!member || !name.trim()) return;
    setBusy(true);
    try {
      const existing = await findMembersByName(name, member.id);
      if (existing.length > 0) {
        setDupes(existing);
        return;
      }
      const res = await updateMemberName(member.id, name);
      setMember({ id: res.id, name: res.name });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (m: MemberStat) => {
    setEditingId(m.id);
    setEditName(m.name);
  };

  const saveEdit = async (m: MemberStat) => {
    if (!editName.trim()) return;
    setRowBusy(true);
    setRowError(null);
    try {
      // 他のメンバーと同名になる変更は防ぐ
      const existing = await findMembersByName(editName, m.id);
      if (existing.length > 0) {
        setRowError(
          `「${editName.trim()}」はすでに使われています。別の名前にしてください。`
        );
        return;
      }
      const res = await updateMemberName(m.id, editName);
      // 自分を変更した場合は端末の保存名も更新
      if (member?.id === m.id) setMember({ id: res.id, name: res.name });
      setEditingId(null);
      router.refresh();
    } finally {
      setRowBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    setRowBusy(true);
    try {
      await deleteMember(confirm.id, member?.id ?? null);
      // 自分自身を削除したら端末のひも付けも解除
      if (member?.id === confirm.id) signOut();
      setConfirm(null);
      router.refresh();
    } finally {
      setRowBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <h1 className="mb-4 text-[22px] font-extrabold">その他</h1>

      {/* メニュー */}
      <div className="card mb-3 overflow-hidden p-0">
        {MENU.map((m, i) => (
          <Link
            key={m.href}
            href={m.href}
            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-bg ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF4F1] text-xl">
              {m.icon}
            </span>
            <div className="flex-1">
              <b className="block text-sm">{m.label}</b>
              <span className="text-xs text-muted">{m.desc}</span>
            </div>
            <span className="text-muted">›</span>
          </Link>
        ))}
      </div>

      {/* プロフィール(自分) */}
      <div className="card mb-3 p-4">
        <h2 className="mb-3 text-sm font-extrabold text-muted">
          プロフィール(あなたの表示名)
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
                onClick={saveSelf}
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
            <UpiQrManager />
          </>
        ) : (
          <p className="text-sm text-muted">
            まだメンバー登録されていません。画面をリロードして登録してください。
          </p>
        )}
      </div>

      {/* メンバー一覧(編集・削除) */}
      <div className="card p-4">
        <h2 className="mb-2.5 text-sm font-extrabold text-muted">
          メンバー一覧(参加回数)
        </h2>
        {rowError && (
          <p className="mb-2 text-sm text-red-600">{rowError}</p>
        )}
        {stats.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">
            まだメンバーがいません
          </p>
        ) : (
          stats.map((m) => {
            const isMe = member?.id === m.id;
            const editing = editingId === m.id;
            return (
              <div
                key={m.id}
                className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-none"
              >
                <Avatar name={editing ? editName : m.name} className="h-8 w-8 shrink-0 text-xs" />
                {editing ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(m)}
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => saveEdit(m)}
                      disabled={rowBusy || !editName.trim()}
                      className="btn-pill shrink-0 bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="shrink-0 px-1 text-xs font-bold text-muted"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <span className="truncate text-sm font-bold">{m.name}</span>
                    {isMe && (
                      <span className="shrink-0 rounded-pill bg-[#E2F3EE] px-2 py-0.5 text-[10px] font-extrabold text-primary-dark">
                        あなた
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[13px] font-bold text-muted">
                      {m.joinCount}回
                    </span>
                    <button
                      onClick={() => startEdit(m)}
                      className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-ink"
                      aria-label={`${m.name}の名前を変更`}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setConfirm(m)}
                      className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-red-600"
                      aria-label={`${m.name}を削除`}
                    >
                      削除
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 改名時に同名が存在: 既存アカウントに切り替える or 別名にする */}
      {dupes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-xs p-5">
            <p className="text-[15px] font-bold">
              「{name.trim()}」はすでに登録されています
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              同じ方なら、その既存アカウントに切り替えると、これまでの出欠・記録を引き継げます。
            </p>
            <div className="mt-3 space-y-2">
              {dupes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMember({ id: m.id, name: m.name });
                    setDupes(null);
                    router.refresh();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl border-2 border-primary bg-[#E2F3EE] px-3 py-2.5 text-left"
                >
                  <Avatar name={m.name} className="h-7 w-7 shrink-0 text-[11px]" />
                  <span className="flex-1 text-sm font-bold">{m.name}</span>
                  <span className="text-[11px] font-bold text-primary-dark">
                    切り替える
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setDupes(null);
                setName(member?.name ?? "");
              }}
              className="btn-pill mt-3 w-full border border-line bg-surface py-2.5 text-sm font-bold text-muted"
            >
              別の名前にする
            </button>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-xs p-5">
            <p className="text-[15px] font-bold">
              「{confirm.name}」を削除しますか?
            </p>
            <p className="mt-1 text-xs text-muted">
              このメンバーの出欠記録も削除されます。この操作は元に戻せません。
              {member?.id === confirm.id &&
                "(あなた自身を削除すると、この端末のひも付けも解除されます)"}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="btn-pill flex-1 border border-line bg-surface py-2.5 text-sm text-muted"
              >
                キャンセル
              </button>
              <button
                onClick={doDelete}
                disabled={rowBusy}
                className="btn-pill flex-1 bg-red-600 py-2.5 text-sm text-white disabled:opacity-50"
              >
                {rowBusy ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
