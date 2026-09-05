// 週1回のVercel cronから呼ばれ、DUPR連携済みメンバーのレーティングを更新する。
// DUPR未設定の環境(環境変数なし)では何もしない。
import { NextResponse } from "next/server";
import { refreshDuprRatings } from "@/app/actions";
import { duprConfigured } from "@/lib/dupr";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!duprConfigured()) {
    return NextResponse.json({ ok: true, skipped: "DUPR not configured" });
  }
  const res = await refreshDuprRatings(null);
  if (res.error) {
    return NextResponse.json({ ok: false, ...res }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...res });
}
