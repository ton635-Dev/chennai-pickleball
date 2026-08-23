"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { setAttendance } from "@/app/actions";
import type { AttendanceStatus } from "@/lib/types";

const OPTIONS: { key: AttendanceStatus; label: string }[] = [
  { key: "join", label: "参加" },
  { key: "maybe", label: "未定" },
  { key: "no", label: "不参加" },
];

interface Props {
  eventId: string;
  statusByMember: Record<string, AttendanceStatus>;
  commentByMember: Record<string, string>;
  /** member_id -> 同伴者(大人/子供) */
  extrasByMember: Record<string, { adults: number; children: number }>;
}

export function EventRsvpPanel({
  eventId,
  statusByMember,
  commentByMember,
  extrasByMember,
}: Props) {
  const { member } = useMember();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<AttendanceStatus | null>(
    member ? statusByMember[member.id] ?? null : null
  );
  const [comment, setComment] = useState(
    member ? commentByMember[member.id] ?? "" : ""
  );
  const [adults, setAdults] = useState(
    member ? extrasByMember[member.id]?.adults ?? 0 : 0
  );
  const [children, setChildren] = useState(
    member ? extrasByMember[member.id]?.children ?? 0 : 0
  );
  const [saved, setSaved] = useState(false);

  if (!member) {
    return (
      <p className="text-sm text-muted">
        出欠を登録するには、右上からメンバー登録してください。
      </p>
    );
  }

  const save = (
    nextStatus: AttendanceStatus,
    nextComment: string,
    nextAdults: number,
    nextChildren: number
  ) => {
    startTransition(async () => {
      try {
        await setAttendance(eventId, member.id, nextStatus, nextComment || null, {
          adults: nextAdults,
          children: nextChildren,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
        router.refresh();
      } catch {
        /* noop */
      }
    });
  };

  const choose = (s: AttendanceStatus) => {
    setStatus(s);
    save(s, comment, adults, children);
  };

  /** 同伴者の増減はその場で保存 */
  const bumpAdults = (d: number) => {
    if (!status) return;
    const v = Math.max(0, Math.min(20, adults + d));
    setAdults(v);
    save(status, comment, v, children);
  };
  const bumpChildren = (d: number) => {
    if (!status) return;
    const v = Math.max(0, Math.min(20, children + d));
    setChildren(v);
    save(status, comment, adults, v);
  };

  const Stepper = ({
    label,
    note,
    value,
    onBump,
  }: {
    label: string;
    note: string;
    value: number;
    onBump: (d: number) => void;
  }) => (
    <div className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-bold">{label}</span>
        <span className="ml-1.5 text-[10px] text-muted">{note}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onBump(-1)}
          disabled={pending || value <= 0}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-line bg-surface text-lg font-extrabold text-muted disabled:opacity-40"
          aria-label={`${label}を減らす`}
        >
          −
        </button>
        <span className="tabnum w-6 text-center text-lg font-extrabold">
          {value}
        </span>
        <button
          onClick={() => onBump(1)}
          disabled={pending || value >= 20}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-surface text-lg font-extrabold text-primary disabled:opacity-40"
          aria-label={`${label}を増やす`}
        >
          ＋
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => choose(o.key)}
            disabled={pending}
            className={`flex-1 rounded-2xl border-2 py-3.5 text-[15px] font-extrabold transition ${
              status === o.key
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* 同伴者(参加のときのみ表示) */}
      {status === "join" && (
        <div className="mt-3 rounded-xl bg-bg p-3">
          <div className="mb-0.5 text-[11px] font-extrabold text-muted">
            同伴者(家族・友人を連れてくる場合)
          </div>
          <Stepper
            label="大人"
            note="コート代の割り勘に含みます"
            value={adults}
            onBump={bumpAdults}
          />
          <div className="border-t border-line" />
          <Stepper
            label="子供"
            note="割り勘には含みません"
            value={children}
            onBump={bumpChildren}
          />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="コメント(例: 7時ごろ到着します)"
          className="flex-1 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[13px] outline-none focus:border-primary"
        />
        <button
          onClick={() => status && save(status, comment, adults, children)}
          disabled={pending || !status}
          className="rounded-xl bg-navy px-4 text-[13px] font-extrabold text-white disabled:opacity-40"
        >
          {saved ? "保存済" : "送信"}
        </button>
      </div>
      {!status && (
        <p className="mt-2 text-xs text-muted">
          まず参加/未定/不参加を選んでください
        </p>
      )}
    </div>
  );
}
