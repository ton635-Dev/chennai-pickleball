import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// Supabase 無料枠は約1週間アクセスがないと一時停止するため、
// Vercel Cron から定期的に軽いクエリを投げて起こしておく(vercel.json 参照)。
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ ok: false, reason: "not-configured" });
  }
  try {
    // 最軽量のクエリ(件数ヘッダのみ・行は取得しない)
    const { error } = await sb
      .from("members")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
