export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * テーブルを置く Postgres スキーマ。
 * 別コミュニティを同じ Supabase プロジェクトに同居させるときに
 * デプロイごとに切り替える(例: community2)。既定はチェンナイ版の public。
 */
export const SUPABASE_SCHEMA =
  process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "public";

/** Supabase の接続情報が設定されているか */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** WhatsApp告知リンクなどで使うアプリの公開URL */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
