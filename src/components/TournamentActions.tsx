"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { archiveTournament, generateBracket } from "@/app/actions";

export function TournamentActions({
  tournamentId,
  canRegenerate,
}: {
  tournamentId: string;
  canRegenerate: boolean;
}) {
  const router = useRouter();
  const { member } = useMember();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "archive" | "regen">(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      if (confirm === "archive") {
        await archiveTournament(tournamentId, member?.id ?? null);
        router.push("/tournaments");
      } else if (confirm === "regen") {
        await generateBracket(tournamentId, member?.id ?? null);
        setConfirm(null);
      }
      router.refresh();
    } catch {
      /* noop */
    } finally {
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
        <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {canRegenerate && (
            <button
              onClick={() => {
                setOpen(false);
                setConfirm("regen");
              }}
              className="block w-full px-4 py-3 text-left text-sm font-bold hover:bg-bg"
            >
              組み合わせを作り直す
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              setConfirm("archive");
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
            <p className="text-[15px] font-bold">
              {confirm === "archive"
                ? "この大会を削除しますか?"
                : "組み合わせを作り直しますか?"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {confirm === "archive"
                ? "アーカイブされます(復元可能)。"
                : "入力済みの結果はすべて消えます。"}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="btn-pill flex-1 border border-line bg-surface py-2.5 text-sm text-muted"
              >
                キャンセル
              </button>
              <button
                onClick={run}
                disabled={busy}
                className={`btn-pill flex-1 py-2.5 text-sm text-white disabled:opacity-50 ${
                  confirm === "archive" ? "bg-red-600" : "bg-primary"
                }`}
              >
                {busy ? "処理中…" : confirm === "archive" ? "削除する" : "作り直す"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
