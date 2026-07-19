"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { deleteMatch } from "@/app/actions";

export function MatchDeleteButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const { member } = useMember();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const doDelete = async () => {
    setBusy(true);
    try {
      await deleteMatch(matchId, member?.id ?? null);
      setConfirm(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-muted hover:text-red-600"
        aria-label="試合を削除"
      >
        ✕
      </button>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-xs p-5">
            <p className="text-[15px] font-bold">この試合結果を削除しますか?</p>
            <p className="mt-1 text-xs text-muted">元に戻せません。</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirm(false)}
                className="btn-pill flex-1 border border-line bg-surface py-2.5 text-sm text-muted"
              >
                キャンセル
              </button>
              <button
                onClick={doDelete}
                disabled={busy}
                className="btn-pill flex-1 bg-red-600 py-2.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
