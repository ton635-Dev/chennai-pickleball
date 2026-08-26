"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  SUPABASE_SCHEMA,
  isSupabaseConfigured,
} from "./config";

let browserClient: SupabaseClient | null = null;

/**
 * ブラウザ用の Supabase クライアント(シングルトン)。
 * Realtime 購読(出欠・スコアのライブ更新)に使用する。
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    // スキーマ名が動的(string)だとジェネリクスが合わないためキャストする
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      db: { schema: SUPABASE_SCHEMA },
    }) as unknown as SupabaseClient;
  }
  return browserClient;
}
