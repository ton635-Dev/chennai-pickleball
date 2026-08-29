-- =====================================================================
-- Phase 10: DUPRプロフィール連携(自動取得)
-- 非公式API(api.dupr.gg)で本人のプロフィールをひも付け、レーティングを
-- 自動更新する。dupr 列(phase9)は表示値として引き続き使用。
-- 冪等: 再実行しても安全。
-- =====================================================================

alter table members add column if not exists dupr_player_id bigint;
alter table members add column if not exists dupr_dupr_id text;
alter table members add column if not exists dupr_updated_at timestamptz;

comment on column members.dupr_player_id is 'DUPR内部プレイヤーID(連携済み=自動更新対象)';
comment on column members.dupr_dupr_id is 'DUPR ID(表示用の共有コード)';
comment on column members.dupr_updated_at is 'レーティング最終自動更新日時';
