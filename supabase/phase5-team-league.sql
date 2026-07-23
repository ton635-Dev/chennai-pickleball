-- =====================================================================
-- Chennai Pickleball — 団体戦(チーム対抗リーグ)対応
-- 例: 第一回ヤマハカップ
--   ・1チーム3〜4人 / チーム総当たり
--   ・1対戦につきダブルスを3ゲーム / 1ゲーム7点マッチ
--   ・順位は 勝敗数 → 勝ゲーム数 → 得失点差
-- Supabase の SQL Editor に貼り付けて実行してください。
-- =====================================================================

-- 大会: 団体戦フォーマットを許可
alter table tournaments drop constraint if exists tournaments_format_check;
alter table tournaments add constraint tournaments_format_check
  check (format in ('single_elim','round_robin','team_league'));

-- 団体戦の設定
alter table tournaments add column if not exists games_per_tie int not null default 3; -- 1対戦のゲーム数
alter table tournaments add column if not exists points_per_game int not null default 7; -- 1ゲームの点数

-- エントリー(チーム)の構成メンバー(3〜4人。表示名の配列)
alter table tournament_entries add column if not exists player_names text[] not null default '{}';

-- 対戦ごとのゲーム内訳
-- 例: [{"g":1,"s1":7,"s2":5,"p1":"けんじ・ゆうた","p2":"さとし・まい"}, ...]
alter table tournament_matches add column if not exists games jsonb not null default '[]'::jsonb;
