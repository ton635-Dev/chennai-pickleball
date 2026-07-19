"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { setTournamentMatchResult } from "@/app/actions";

interface Props {
  matchId: string;
  name1: string;
  name2: string;
  initial1: number | null;
  initial2: number | null;
  onClose: () => void;
}

export function MatchResultDialog({
  matchId,
  name1,
  name2,
  initial1,
  initial2,
  onClose,
}: Props) {
  const router = useRouter();
  const { member } = useMember();
  const [s1, setS1] = useState(initial1?.toString() ?? "");
  const [s2, setS2] = useState(initial2?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const n1 = parseInt(s1, 10);
    const n2 = parseInt(s2, 10);
    if (isNaN(n1) || isNaN(n2)) {
      setError("両者のスコアを入力してください");
      return;
    }
    if (n1 === n2) {
      setError("引き分けは記録できません(勝敗をつけてください)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setTournamentMatchResult(matchId, n1, n2, member?.id ?? null);
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setBusy(false);
    }
  };

  const scoreInput = (v: string, set: (s: string) => void, label: string) => (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm font-bold">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={v}
        onChange={(e) => set(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
        placeholder="0"
        className="w-16 rounded-xl border border-line bg-bg px-3 py-2.5 text-center text-lg font-extrabold outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-xs p-5">
        <h3 className="mb-3 text-[15px] font-extrabold">スコアを入力</h3>
        <div className="space-y-3">
          {scoreInput(s1, setS1, name1)}
          {scoreInput(s2, setS2, name2)}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="btn-pill flex-1 border border-line bg-surface py-2.5 text-sm text-muted"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="btn-pill flex-[2] bg-primary py-2.5 text-sm text-white disabled:opacity-50"
          >
            {busy ? "保存中…" : "結果を保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
