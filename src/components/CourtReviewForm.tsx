"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { saveCourtReview } from "@/app/actions";
import type { ReviewItem } from "@/lib/types";

interface ReviewRow {
  review_item_id: string;
  member_id: string;
  score: number;
  comment: string | null;
}

interface Props {
  courtId: string;
  items: ReviewItem[];
  allReviews: ReviewRow[];
}

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className={`text-2xl leading-none ${
            n <= value ? "text-amber" : "text-line"
          }`}
          aria-label={`${n}点`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function CourtReviewForm({ courtId, items, allReviews }: Props) {
  const { member } = useMember();
  const router = useRouter();

  // 現在の端末メンバー自身の既存評価
  const myReviews = useMemo(() => {
    const m: Record<string, { score: number; comment: string | null }> = {};
    if (member) {
      for (const r of allReviews) {
        if (r.member_id === member.id)
          m[r.review_item_id] = { score: r.score, comment: r.comment };
      }
    }
    return m;
  }, [member, allReviews]);
  const hasReview = Object.keys(myReviews).length > 0;

  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openForm = () => {
    if (!member) {
      setError("評価するにはメンバー登録が必要です(右上から登録)");
      return;
    }
    // 開くタイミングで自分の既存評価をフォームに反映(memberは読込済み)
    setScores(
      Object.fromEntries(items.map((i) => [i.id, myReviews[i.id]?.score ?? 0]))
    );
    setComments(
      Object.fromEntries(items.map((i) => [i.id, myReviews[i.id]?.comment ?? ""]))
    );
    setError(null);
    setOpen(true);
  };

  if (!open) {
    return (
      <button
        onClick={openForm}
        className="btn-pill w-full bg-primary py-3.5 text-[15px] text-white"
      >
        {hasReview ? "自分の評価を編集する" : "このコートを評価する"}
        {error && (
          <span className="mt-1 block text-xs font-normal">{error}</span>
        )}
      </button>
    );
  }

  const submit = async () => {
    if (!member) return;
    const payload = items
      .map((i) => ({
        review_item_id: i.id,
        score: scores[i.id] ?? 0,
        comment: comments[i.id] ?? "",
      }))
      .filter((i) => i.score >= 1);
    if (payload.length === 0) {
      setError("少なくとも1項目に星をつけてください");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveCourtReview(courtId, member.id, payload);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4">
      <h2 className="mb-1 text-sm font-extrabold text-muted">
        コートを評価(1〜5★・任意でコメント)
      </h2>
      <div className="divide-y divide-line">
        {items.map((item) => (
          <div key={item.id} className="py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-bold">{item.name}</span>
              <Stars
                value={scores[item.id] ?? 0}
                onChange={(v) => setScores((s) => ({ ...s, [item.id]: v }))}
              />
            </div>
            <input
              value={comments[item.id] ?? ""}
              onChange={(e) =>
                setComments((c) => ({ ...c, [item.id]: e.target.value }))
              }
              placeholder="コメント(任意)"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-[13px] outline-none focus:border-primary"
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="btn-pill flex-1 border border-line bg-surface py-3 text-sm text-muted"
        >
          キャンセル
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="btn-pill flex-[2] bg-primary py-3 text-[15px] text-white disabled:opacity-50"
        >
          {busy ? "保存中…" : "評価を保存"}
        </button>
      </div>
    </div>
  );
}
