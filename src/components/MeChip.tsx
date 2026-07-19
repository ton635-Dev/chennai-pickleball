"use client";

import Link from "next/link";
import { useMember } from "./MemberProvider";
import { initial } from "@/lib/format";

export function MeChip() {
  const { member } = useMember();
  if (!member) return <span className="w-8" />;
  return (
    <Link
      href="/more"
      className="flex items-center gap-1.5 rounded-pill border border-line bg-surface py-1 pl-1 pr-3 text-[13px] font-bold"
    >
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-navy text-xs text-white">
        {initial(member.name)}
      </span>
      {member.name}
    </Link>
  );
}
