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
}

export function EventRsvpPanel({
  eventId,
  statusByMember,
  commentByMember,
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
  const [saved, setSaved] = useState(false);

  if (!member) {
    return (
      <p className="text-sm text-muted">
        出欠を登録するには、右上からメンバー登録してください。
      </p>
    );
  }

  const save = (nextStatus: AttendanceStatus, nextComment: string) => {
    startTransition(async () => {
      try {
        await setAttendance(eventId, member.id, nextStatus, nextComment || null);
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
    save(s, comment);
  };

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
      <div className="mt-3 flex gap-2">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="コメント(例: 7時ごろ到着します)"
          className="flex-1 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[13px] outline-none focus:border-primary"
        />
        <button
          onClick={() => status && save(status, comment)}
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
