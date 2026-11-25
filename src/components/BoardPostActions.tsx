"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { archiveBoardPost } from "@/app/actions";

/** 投稿の「⋯」メニュー(編集・削除)。誰でも操作でき、監査ログに残る */
export function BoardPostActions({ postId }: { postId: string }) {
  const router = useRouter();
  const { member } = useMember();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doArchive = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await archiveBoardPost(postId, member?.id ?? null);
      if (res.error) {
        setError(res.error);
        setBusy(false);
        return;
      }
      router.push("/tournaments/board");
      router.refresh();
    } catch {
      setError("通信に失敗しました。もう一度お試しください");
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        aria-label="操作メニュー"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-36 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <Link
            href={`/tournaments/board/${postId}/edit`}
            className="block px-4 py-3 text-sm font-bold hover:bg-bg"
          >
            編集
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              setConfirm(true);
            }}
            className="block w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-bg"
          >
            削除
          </button>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-xs p-5">
            <p className="text-[15px] font-bold">この投稿を削除しますか？</p>
            <p className="mt-1 text-xs text-muted">
              掲示板に表示されなくなります。表明した人の情報も見えなくなります。
            </p>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirm(false)}
                className="btn-pill flex-1 border border-line bg-surface py-2.5 text-sm text-muted"
              >
                キャンセル
              </button>
              <button
                onClick={doArchive}
                disabled={busy}
                className="btn-pill flex-1 bg-red-600 py-2.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
