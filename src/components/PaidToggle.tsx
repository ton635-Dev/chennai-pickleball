"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { setAttendancePaid } from "@/app/actions";

interface Props {
  eventId: string;
  memberId: string;
  memberName: string;
  paidAt: string | null;
  /** コート代の立替者(この人は支払い不要) */
  payerId: string | null;
}

/**
 * 参加者行のコート代支払いステータス。
 * - 本人: 「未払い／支払ったらタップ」ボタン(確認のうえ ✓支払済、もう一度押すと取り消し)
 * - 立替者: 他の人の分を「受取確認」/取り消しできる
 * - それ以外の人: ステータス表示のみ
 */
export function PaidToggle({ eventId, memberId, memberName, paidAt, payerId }: Props) {
  const { member } = useMember();
  const router = useRouter();
  // 楽観的更新(押した瞬間に表示を切り替え、失敗したら戻す)
  const [paid, setPaid] = useState(!!paidAt);
  const [busy, setBusy] = useState(false);

  if (memberId === payerId) {
    return (
      <span className="shrink-0 rounded-pill bg-[#EDF4F1] px-2.5 py-1 text-[11px] font-extrabold text-primary-dark">
        立替者
      </span>
    );
  }

  const isMe = member?.id === memberId;
  const isPayer = !!member && member.id === payerId;
  const canToggle = isMe || isPayer;

  const toggle = async () => {
    if (!canToggle || busy) return;
    const next = !paid;
    if (!next) {
      const who = isMe ? "あなた" : `${memberName}さん`;
      if (!window.confirm(`${who}の支払い完了を取り消しますか？`)) return;
    } else if (isMe) {
      // 未払い表示のボタンなので、押し間違いで支払済にならないよう確認する
      if (!window.confirm("コート代の支払いが済みましたか？\n「OK」で支払済にします")) return;
    }
    setBusy(true);
    setPaid(next);
    try {
      const res = await setAttendancePaid(eventId, memberId, next, member?.id ?? null);
      if (res.error) {
        setPaid(!next);
        window.alert(`更新できませんでした: ${res.error}`);
        return;
      }
      router.refresh();
    } catch {
      setPaid(!next);
      window.alert("通信に失敗しました。通信環境を確認してください");
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return canToggle ? (
      <button
        onClick={toggle}
        disabled={busy}
        title="タップで取り消し"
        className="shrink-0 rounded-pill bg-primary px-2.5 py-1 text-[11px] font-extrabold text-white disabled:opacity-60"
      >
        ✓ 支払済
      </button>
    ) : (
      <span className="shrink-0 rounded-pill bg-primary px-2.5 py-1 text-[11px] font-extrabold text-white">
        ✓ 支払済
      </span>
    );
  }

  if (isMe) {
    return (
      // 「支払い完了」だと済んだ状態に読めるため、今の状態(未払い)+操作の案内の2行にする
      <button
        onClick={toggle}
        disabled={busy}
        aria-label="未払い。支払ったらタップして支払済にする"
        className="flex shrink-0 flex-col items-center rounded-xl border-2 border-amber bg-[#FFF6E5] px-2.5 py-1 leading-tight disabled:opacity-60"
      >
        <span className="text-[11px] font-extrabold text-[#9A6B14]">未払い</span>
        <span className="text-[9px] font-bold text-[#9A6B14]">支払ったらタップ</span>
      </button>
    );
  }

  if (isPayer) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        title="受け取ったら押してください"
        className="shrink-0 rounded-pill border border-line bg-surface px-2.5 py-1 text-[11px] font-extrabold text-ink disabled:opacity-60"
      >
        受取確認
      </button>
    );
  }

  return (
    <span className="shrink-0 rounded-pill border border-line px-2.5 py-1 text-[11px] font-bold text-muted">
      未払い
    </span>
  );
}
