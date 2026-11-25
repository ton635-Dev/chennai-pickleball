"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { setBoardResponse, setBoardPair } from "@/app/actions";
import { CATEGORIES, CATEGORY_SHORT, statusLabel, usesPairing } from "@/lib/board";
import type { BoardCategory, BoardKind, BoardResponse, BoardStatus } from "@/lib/types";

interface Props {
  postId: string;
  kind: BoardKind;
  /** 投稿の種目(未指定なら全種目から選べる) */
  categories: BoardCategory[];
  responses: BoardResponse[];
  members: { id: string; name: string }[];
}

/** 投稿詳細の「あなたの状況」: 出場予定 / ペア探し中 / 興味あり の表明 */
export function BoardResponsePanel({ postId, kind, categories, responses, members }: Props) {
  const router = useRouter();
  const { member } = useMember();
  const mine = responses.find((r) => r.member_id === member?.id) ?? null;
  const pairing = usesPairing(kind);
  const options = categories.length ? categories : CATEGORIES;

  const [category, setCategory] = useState<BoardCategory | null>(mine?.category ?? null);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [picking, setPicking] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!member) {
    return (
      <p className="text-sm text-muted">
        表明するには、画面をリロードして表示名を登録してください。
      </p>
    );
  }

  const run = async (fn: () => Promise<{ error?: string }>, done: string) => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fn();
      if (res.error) {
        setError(res.error);
        return false;
      }
      setMsg(done);
      router.refresh();
      return true;
    } catch {
      setError("通信に失敗しました。電波の良い場所で、もう一度お試しください");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const choose = (status: BoardStatus) => {
    if (mine?.status === status) {
      if (!window.confirm(`「${statusLabel(status, kind)}」を取り消しますか？`)) return;
      run(() => setBoardResponse(postId, member.id, null, null, null), "取り消しました");
      return;
    }
    if (mine?.partner_member_id && status !== "going") {
      const name = members.find((m) => m.id === mine.partner_member_id)?.name ?? "相手";
      if (!window.confirm(`${name}さんとのペアを解消して「${statusLabel(status, kind)}」にしますか？`))
        return;
    }
    run(
      () => setBoardResponse(postId, member.id, status, category, comment),
      `「${statusLabel(status, kind)}」にしました`
    );
  };

  const saveDetail = () =>
    mine &&
    run(
      () => setBoardResponse(postId, member.id, mine.status, category, comment),
      "更新しました"
    );

  const confirmPair = async () => {
    if (!partnerId) return setError("ペアの相手を選んでください");
    const ok = await run(
      () => setBoardPair(postId, member.id, partnerId),
      "ペアを登録しました。2人とも「出場予定」になりました"
    );
    if (ok) {
      setPicking(false);
      setPartnerId("");
    }
  };

  const partnerName = mine?.partner_member_id
    ? members.find((m) => m.id === mine.partner_member_id)?.name ?? "（不明）"
    : null;

  // 相手の候補: ペア探し中の人を先頭に、あとは名前順
  const seekingIds = new Set(
    responses.filter((r) => r.status === "seeking").map((r) => r.member_id)
  );
  const candidates = members
    .filter((m) => m.id !== member.id)
    .sort(
      (a, b) =>
        Number(seekingIds.has(b.id)) - Number(seekingIds.has(a.id)) ||
        a.name.localeCompare(b.name)
    );

  const statuses: BoardStatus[] = pairing
    ? ["going", "seeking", "interested"]
    : ["going", "interested"];
  const btnCls = (s: BoardStatus) => {
    const on = mine?.status === s;
    if (s === "seeking")
      return on
        ? "border-2 border-[#D85A30] bg-[#FAECE7] text-[#712B13]"
        : "border border-line bg-surface text-[#993C1D]";
    return on ? "border-2 border-primary bg-[#E2F3EE] text-primary-dark" : "border border-line bg-surface text-ink";
  };

  return (
    <div>
      <div className="flex gap-1.5">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => choose(s)}
            disabled={busy}
            className={`btn-pill flex-1 py-2.5 text-[13px] font-extrabold disabled:opacity-60 ${btnCls(s)}`}
          >
            {mine?.status === s && "✓ "}
            {statusLabel(s, kind)}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        選んだボタンをもう一度押すと取り消せます
      </p>

      {/* 種目・ひとことコメント(ペア探しのときに相手が見つけやすいように) */}
      {mine && pairing && (
        <div className="mt-3 rounded-xl bg-bg p-3">
          <div className="mb-1 text-[11px] font-extrabold text-muted">出たい種目</div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {options.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? null : c)}
                className={`rounded-pill px-2.5 py-1 text-[11px] font-bold ${
                  category === c ? "bg-primary text-white" : "border border-line bg-surface text-muted"
                }`}
              >
                {CATEGORY_SHORT[c]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={100}
              placeholder={
                mine.status === "seeking" ? "例: 初出場です。土日どちらでも" : "ひとこと(任意)"
              }
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={saveDetail}
              disabled={busy}
              className="btn-pill shrink-0 bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              更新
            </button>
          </div>
        </div>
      )}

      {/* ペアが決まった */}
      {mine && pairing && mine.status !== "interested" && (
        <div className="mt-3">
          {partnerName ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
              <span className="flex-1">
                ペア: <b>{partnerName}</b> さん
              </span>
              <button
                onClick={() => choose("seeking")}
                disabled={busy}
                className="text-xs font-bold text-muted underline"
              >
                ペアを解消
              </button>
            </div>
          ) : picking ? (
            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-1.5 text-xs font-extrabold text-muted">ペアの相手を選ぶ</div>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="mb-2 w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">選択してください</option>
                {candidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {seekingIds.has(m.id) ? "(ペア探し中)" : ""}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setPicking(false)}
                  className="btn-pill flex-1 border border-line bg-surface py-2 text-xs text-muted"
                >
                  やめる
                </button>
                <button
                  onClick={confirmPair}
                  disabled={busy}
                  className="btn-pill flex-1 bg-primary py-2 text-xs text-white disabled:opacity-50"
                >
                  ペアを登録
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                登録すると、あなたと相手の2人とも「出場予定」になります
              </p>
            </div>
          ) : (
            <button
              onClick={() => setPicking(true)}
              className="btn-pill w-full border-2 border-primary bg-surface py-2.5 text-[13px] text-primary"
            >
              ペアが決まった
            </button>
          )}
        </div>
      )}

      {msg && <p className="mt-2 text-xs font-bold text-primary-dark">{msg}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
