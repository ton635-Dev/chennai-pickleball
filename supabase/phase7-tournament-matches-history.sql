-- =====================================================================
-- Chennai Pickleball — 大会の試合結果を試合履歴(matches)へ計上
-- Supabase の SQL Editor に貼り付けて実行してください。
-- (すでに実行済みの場合も、もう一度実行してください。インデックスを作り直します)
-- =====================================================================

-- 履歴レコードがどの大会・どの対戦・どのゲーム由来かを記録
alter table matches add column if not exists tournament_id uuid
  references tournaments(id) on delete set null;
alter table matches add column if not exists tie_match_id uuid
  references tournament_matches(id) on delete cascade;
alter table matches add column if not exists tie_game_no int;

-- 同じ(対戦, ゲーム番号)の履歴は1件だけ(再入力時は上書き)
-- 注意: ON CONFLICT で使うため、部分インデックス(WHERE句)にはしない。
--       通常の試合は両カラムが NULL になるが、Postgres では NULL 同士は
--       重複と見なされないため、複数行が共存できる。
drop index if exists matches_tie_game_uniq;
create unique index if not exists matches_tie_game_uniq
  on matches (tie_match_id, tie_game_no);

create index if not exists matches_tournament_idx on matches (tournament_id);
