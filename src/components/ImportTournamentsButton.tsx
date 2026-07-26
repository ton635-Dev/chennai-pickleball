"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { importTournamentsToHistory } from "@/app/actions";

/**
 * 既存の大会(団体戦)の入力済み結果を試合履歴へ取り込むボタン。
 * 何度押しても重複計上されない(同じゲームは上書き)。
 */
export function ImportTournamentsButton() {
  const router = useRouter();
  const { member } = useMember();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await importTournamentsToHistory(member?.id ?? null);
      setResult(
        r.games === 0
          ? "取り込む結果がありませんでした"
          : `${r.tournaments}大会・${r.games}ゲームを取り込みました`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "取り込みに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mb-3 p-4">
      <h2 className="mb-1 text-sm font-extrabold text-muted">
        大会結果の取り込み
      </h2>
      <p className="mb-2.5 text-[11px] leading-relaxed text-muted">
        すでに入力済みの団体戦の結果を、この履歴に取り込みます(1ゲーム=1試合)。
        何度実行しても重複しません。今後入力する大会結果は自動で計上されます。
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="btn-pill w-full border-2 border-primary bg-surface py-2.5 text-[13px] font-extrabold text-primary disabled:opacity-50"
      >
        {busy ? "取り込み中…" : "過去の大会結果を取り込む"}
      </button>
      {result && (
        <p className="mt-2 rounded-xl bg-[#E2F3EE] px-3 py-2 text-[12px] font-bold text-primary-dark">
          {result}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
