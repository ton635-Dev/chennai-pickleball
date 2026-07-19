"use client";

import { useMemo, useState, useTransition } from "react";
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
  /** member_id -> status の初期マップ */
  statusByMember: Record<string, AttendanceStatus>;
  variant?: "hero" | "detail";
}

export function RsvpControl({ eventId, statusByMember, variant = "detail" }: Props) {
  const { member } = useMember();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initial = member ? statusByMember[member.id] ?? null : null;
  const [current, setCurrent] = useState<AttendanceStatus | null>(initial);
  const [saving, setSaving] = useState<AttendanceStatus | null>(null);

  const hero = variant === "hero";

  const choose = (status: AttendanceStatus) => {
    if (!member || pending) return;
    const prev = current;
    setCurrent(status);
    setSaving(status);
    startTransition(async () => {
      try {
        await setAttendance(eventId, member.id, status, null);
        router.refresh();
      } catch {
        setCurrent(prev); // 失敗したら戻す
      } finally {
        setSaving(null);
      }
    });
  };

  const cls = useMemo(() => {
    if (hero) {
      return (on: boolean) =>
        `flex-1 rounded-xl py-3 text-sm font-extrabold transition ${
          on ? "bg-accent text-navy" : "bg-white/[0.14] text-white"
        }`;
    }
    return (on: boolean) =>
      `flex-1 rounded-2xl border-2 py-3.5 text-[15px] font-extrabold transition ${
        on ? "border-primary bg-primary text-white" : "border-line bg-surface text-muted"
      }`;
  }, [hero]);

  return (
    <div className={`flex gap-2 ${hero ? "mt-4" : ""}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          onClick={() => choose(o.key)}
          disabled={pending || !member}
          className={cls(current === o.key)}
        >
          {saving === o.key ? "…" : o.label}
        </button>
      ))}
    </div>
  );
}
