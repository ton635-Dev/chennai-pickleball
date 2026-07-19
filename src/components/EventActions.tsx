"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "./MemberProvider";
import { archiveEvent } from "@/app/actions";

export function EventActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { member } = useMember();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const doArchive = async () => {
    setBusy(true);
    try {
      await archiveEvent(eventId, member?.id ?? null);
      router.push("/schedule");
      router.refresh();
    } catch {
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
        <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <Link
            href={`/events/${eventId}/edit`}
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
            削除(アーカイブ)
          </button>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-xs p-5">
            <p className="text-[15px] font-bold">この活動日を削除しますか?</p>
            <p className="mt-1 text-xs text-muted">
              アーカイブ(論理削除)されます。データは残るため後で復元できます。
            </p>
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
