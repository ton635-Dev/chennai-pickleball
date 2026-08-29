-- =====================================================================
-- Phase 9: メンバーのDUPRレーティング(手入力)
-- DUPR(Dynamic Universal Pickleball Rating)は 2.000〜8.000。
-- 公式APIは一般公開されていないため、各自(または誰でも)が手入力する運用。
-- 冪等: 再実行しても安全。
-- =====================================================================

alter table members
  add column if not exists dupr numeric(4,3)
    check (dupr >= 2 and dupr <= 8);

comment on column members.dupr is 'DUPRレーティング(手入力・2.000〜8.000・null=未設定)';
