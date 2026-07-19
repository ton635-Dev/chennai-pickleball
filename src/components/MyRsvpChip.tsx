"use client";

import { useMember } from "./MemberProvider";
import { AttendanceChip } from "./bits";
import type { AttendanceStatus } from "@/lib/types";

/** 現在の端末メンバーの出欠状態をチップ表示 */
export function MyRsvpChip({
  statusByMember,
}: {
  statusByMember: Record<string, AttendanceStatus>;
}) {
  const { member } = useMember();
  const status = member ? statusByMember[member.id] ?? "none" : "none";
  return <AttendanceChip status={status} />;
}
