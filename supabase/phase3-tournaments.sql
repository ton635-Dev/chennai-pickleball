-- =====================================================================
-- Chennai Pickleball — Phase 3 (大会管理) スキーマ
-- Supabase の SQL Editor に貼り付けて実行してください。
-- Phase 1/2 のスキーマを実行済みの前提です。
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 大会
-- format:     'single_elim'(トーナメント) / 'round_robin'(リーグ)
-- discipline: 'singles' / 'doubles'
-- status:     'draft'(準備中) / 'ongoing'(開催中) / 'done'(終了)
-- ---------------------------------------------------------------------
create table if not exists tournaments (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  event_id     uuid references events(id) on delete set null,
  format       text not null check (format in ('single_elim','round_robin')),
  discipline   text not null default 'doubles' check (discipline in ('singles','doubles')),
  status       text not null default 'draft' check (status in ('draft','ongoing','done')),
  champion     text,                 -- 優勝者(表示名。終了時に記録)
  created_by   uuid references members(id) on delete set null,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tournaments_archived_idx on tournaments (archived);

-- ---------------------------------------------------------------------
-- 参加者/ペア(エントリー)
-- name はブラケット表示名(例: "けんじ・ゆうた")。member 参照は任意。
-- ---------------------------------------------------------------------
create table if not exists tournament_entries (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name          text not null,
  seed          int,
  member1_id    uuid references members(id) on delete set null,
  member2_id    uuid references members(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists tournament_entries_t_idx on tournament_entries (tournament_id);

-- ---------------------------------------------------------------------
-- 組み合わせ(試合)
-- round/position で位置を表す。
--  - single_elim: round=1(1回戦)…最大, position=そのラウンド内の位置(0始まり)
--    勝者は round+1, floor(position/2), スロット= position%2 に進む
--  - round_robin: round=試合日(0始まり), position=順序
-- ---------------------------------------------------------------------
create table if not exists tournament_matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  round           int not null,
  position        int not null,
  entry1_id       uuid references tournament_entries(id) on delete set null,
  entry2_id       uuid references tournament_entries(id) on delete set null,
  score1          int,
  score2          int,
  winner_entry_id uuid references tournament_entries(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending','done')),
  court           text,
  created_at      timestamptz not null default now()
);
create index if not exists tournament_matches_t_idx on tournament_matches (tournament_id);

-- ---------------------------------------------------------------------
-- RLS(認証なし運用: anon に全操作許可)
-- ---------------------------------------------------------------------
alter table tournaments        enable row level security;
alter table tournament_entries enable row level security;
alter table tournament_matches enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tournaments','tournament_entries','tournament_matches'] loop
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format(
      'create policy "public_all" on %I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- Realtime(観戦ビューのライブ更新用)
alter publication supabase_realtime add table tournament_matches;
alter publication supabase_realtime add table tournaments;
