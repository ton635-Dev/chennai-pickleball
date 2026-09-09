-- =====================================================================
-- Phase 11: DUPR認証トークンの保存
-- DUPRがログイン時のメール2段階認証を必須化したため、パスワードでの
-- 自動ログインができなくなった。一度コード認証して得たトークンを
-- (サーバー側の鍵で暗号化して)保存し、以後は refresh で維持する。
-- 1行だけのテーブル(id=1固定)。冪等: 再実行しても安全。
-- =====================================================================

create table if not exists dupr_auth (
  id          smallint primary key default 1 check (id = 1),
  payload     text not null,          -- 暗号化済みJSON(accessToken/refreshToken/challengeToken)
  updated_at  timestamptz not null default now()
);

alter table dupr_auth enable row level security;
drop policy if exists "public_all" on dupr_auth;
create policy "public_all" on dupr_auth
  for all to anon, authenticated using (true) with check (true);
