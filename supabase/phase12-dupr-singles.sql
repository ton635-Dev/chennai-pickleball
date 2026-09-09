-- =====================================================================
-- Phase 12: DUPRシングルスレーティング
-- dupr 列はダブルス。シングルスを別列で持ち、自動取得・手入力とも両方対応。
-- 冪等: 再実行しても安全。
-- =====================================================================

alter table members
  add column if not exists dupr_singles numeric(4,3)
    check (dupr_singles >= 2 and dupr_singles <= 8);

comment on column members.dupr is 'DUPRダブルスレーティング(2.000〜8.000・null=未設定)';
comment on column members.dupr_singles is 'DUPRシングルスレーティング(2.000〜8.000・null=未設定)';
