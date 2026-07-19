import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * サーバー(Server Components / Server Actions)用の Supabase クライアント。
 * 認証なし運用のため anon キーで接続する。
 * 未設定の場合は null を返し、呼び出し側で設定案内を表示する。
 */
export function getServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
