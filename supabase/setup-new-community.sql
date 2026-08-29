-- ============================================================
-- 新しいコミュニティ用セットアップSQL(既存Supabaseプロジェクトに同居・別スキーマ方式)
-- chennai-pickleball の Supabase プロジェクトの SQL Editor でこのファイルを丸ごと実行する。
-- 何度実行してもエラーにならない(冪等)。
-- スキーマ名を変えたい場合は、実行前に community2 を一括置換すること。
--
-- 実行後に必要な手動設定(ダッシュボード):
--   Settings → API → "Exposed schemas" に community2 を追加
-- ============================================================

create schema if not exists community2;
set search_path to community2, public;


-- ============ schema.sql ============
-- =====================================================================
-- Chennai Pickleball — Phase 1 スキーマ
-- Supabase の SQL Editor にこのファイルの内容を貼り付けて実行してください。
-- (Dashboard > SQL Editor > New query > 貼り付け > Run)
--
-- 認証なし・全員フラット権限のため RLS は「anon で全操作許可」にしています。
-- アプリのURLを非公開でメンバーにのみ共有する運用が前提です(仕様書 3.2)。
-- =====================================================================

-- UUID 生成に必要
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- メンバー
-- ---------------------------------------------------------------------
create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 活動日(イベント)  ※論理削除(archived)対応
-- Phase 1 ではコートは自由入力(場所名 + 地図リンク)。
-- コートマスタ連携は Phase 2 で court_id を追加予定。
-- ---------------------------------------------------------------------
create table if not exists events (
  id             uuid primary key default gen_random_uuid(),
  event_date     date not null,
  start_time     time,
  end_time       time,
  place_name     text,
  maps_url       text,
  fee            text,             -- 「₹250」など自由入力
  rsvp_deadline  timestamptz,
  note           text,
  created_by     uuid references members(id) on delete set null,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists events_date_idx on events (event_date);
create index if not exists events_archived_idx on events (archived);

-- ---------------------------------------------------------------------
-- 出欠   status: 'join'(参加) / 'maybe'(未定) / 'no'(不参加)
-- 1メンバー1イベント1レコード
-- ---------------------------------------------------------------------
create table if not exists attendances (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  status       text not null check (status in ('join','maybe','no')),
  comment      text,
  updated_at   timestamptz not null default now(),
  unique (event_id, member_id)
);
create index if not exists attendances_event_idx on attendances (event_id);

-- ---------------------------------------------------------------------
-- 試合結果(スコアボードから任意保存)
-- team1/team2 は表示名の配列(記録なしでも名前は残せる)
-- ---------------------------------------------------------------------
create table if not exists matches (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references events(id) on delete set null,
  mode          text not null default 'doubles',  -- 'singles' / 'doubles'
  team1_names   text[] not null default '{}',
  team2_names   text[] not null default '{}',
  team1_score   int not null default 0,
  team2_score   int not null default 0,
  target_points int not null default 11,
  winner        int,                                -- 1 or 2
  created_by    uuid references members(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists matches_created_idx on matches (created_at desc);

-- ---------------------------------------------------------------------
-- 操作履歴(仕様書 3.3)。誰がいつ何をしたかの追跡用。
-- ---------------------------------------------------------------------
create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,      -- 'event' / 'attendance' / 'match'
  entity_id    uuid,
  member_id    uuid references members(id) on delete set null,
  action       text not null,      -- 'create' / 'update' / 'archive' / 'rsvp'
  summary      text,
  created_at   timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Realtime 配信対象(出欠・試合のライブ更新)
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table attendances;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table events;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table matches;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- RLS: 認証なし運用のため anon ロールに全操作を許可
-- ---------------------------------------------------------------------
alter table members     enable row level security;
alter table events      enable row level security;
alter table attendances enable row level security;
alter table matches     enable row level security;
alter table audit_logs  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['members','events','attendances','matches','audit_logs'] loop
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format(
      'create policy "public_all" on %I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;


-- ============ phase2-courts.sql ============
-- =====================================================================
-- Chennai Pickleball — Phase 2 (コート情報) スキーマ
-- Supabase の SQL Editor に貼り付けて実行してください。
-- Phase 1 の schema.sql を実行済みの前提です。
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- コート  ※論理削除(archived)対応
-- ---------------------------------------------------------------------
create table if not exists courts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text,
  maps_url      text,
  is_indoor     boolean,            -- true=屋内 / false=屋外 / null=未設定
  court_count   int,                -- 面数
  surface       text,               -- 路面(ハード/人工芝/体育館床 等)
  facilities    text,               -- 設備(ネット・照明・更衣室・駐車場・飲料 等の自由記述)
  fee           text,               -- 料金
  booking       text,               -- 予約方法
  outdoor_note  text,               -- 屋外の風・日差しの傾向メモ
  note          text,               -- 自由メモ(雨天時・混雑時間帯など)
  created_by    uuid references members(id) on delete set null,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists courts_archived_idx on courts (archived);

-- ---------------------------------------------------------------------
-- コート写真
-- ---------------------------------------------------------------------
create table if not exists court_photos (
  id            uuid primary key default gen_random_uuid(),
  court_id      uuid not null references courts(id) on delete cascade,
  url           text not null,      -- Storage の公開URL
  storage_path  text,               -- 削除用のパス
  created_by    uuid references members(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists court_photos_court_idx on court_photos (court_id);

-- ---------------------------------------------------------------------
-- 評価項目マスタ(運用しながら追加・変更可能)
-- ---------------------------------------------------------------------
create table if not exists review_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  sort_order    int not null default 0,
  active        boolean not null default true
);

-- 初期の評価項目(未登録なら投入)
-- ※「コート数」は主観評価に不向きで面数は基本情報に表示されるため項目に含めない
insert into review_items (name, sort_order)
select v.name, v.ord
from (values
  ('路面(滑りにくさ)', 1),
  ('広さ', 2),
  ('設備', 3),
  ('アクセス', 4)
) as v(name, ord)
where not exists (select 1 from review_items);

-- ---------------------------------------------------------------------
-- コート評価(1メンバー・1コート・1項目につき1件)
-- ---------------------------------------------------------------------
create table if not exists court_reviews (
  id             uuid primary key default gen_random_uuid(),
  court_id       uuid not null references courts(id) on delete cascade,
  member_id      uuid not null references members(id) on delete cascade,
  review_item_id uuid not null references review_items(id) on delete cascade,
  score          int not null check (score between 1 and 5),
  comment        text,
  updated_at     timestamptz not null default now(),
  unique (court_id, member_id, review_item_id)
);
create index if not exists court_reviews_court_idx on court_reviews (court_id);

-- ---------------------------------------------------------------------
-- 活動日にコートを紐づけ(任意)
-- ---------------------------------------------------------------------
alter table events add column if not exists court_id uuid references courts(id) on delete set null;

-- ---------------------------------------------------------------------
-- RLS: 認証なし運用のため anon に全操作許可
-- ---------------------------------------------------------------------
alter table courts        enable row level security;
alter table court_photos  enable row level security;
alter table review_items  enable row level security;
alter table court_reviews enable row level security;

do $$
declare t text;
begin
  foreach t in array array['courts','court_photos','review_items','court_reviews'] loop
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format(
      'create policy "public_all" on %I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Storage: コート写真用の公開バケット + anon アップロード許可
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('court-photos', 'court-photos', true)
on conflict (id) do nothing;

drop policy if exists "court_photos_read" on storage.objects;
drop policy if exists "court_photos_write" on storage.objects;
drop policy if exists "court_photos_delete" on storage.objects;
create policy "court_photos_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'court-photos');
create policy "court_photos_write" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'court-photos');
create policy "court_photos_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'court-photos');

-- Realtime(コート評価のライブ更新は任意)
do $$ begin
  alter publication supabase_realtime add table court_reviews;
exception when duplicate_object then null; end $$;


-- ============ phase3-tournaments.sql ============
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
do $$ begin
  alter publication supabase_realtime add table tournament_matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table tournaments;
exception when duplicate_object then null; end $$;


-- ============ phase4-payments.sql ============
-- =====================================================================
-- Chennai Pickleball — コート代割り勘 + UPIコード(QR) スキーマ
-- Supabase の SQL Editor に貼り付けて実行してください。
-- =====================================================================

-- 活動日: コート使用費(合計)・割り勘人数(手動上書き)・立替者
alter table events add column if not exists court_fee int;          -- コート使用費 合計(₹)
alter table events add column if not exists fee_split_count int;    -- 割り勘人数(null=参加人数で自動)
alter table events add column if not exists payer_member_id uuid references members(id) on delete set null;

-- メンバー: UPIコード(QR画像)
alter table members add column if not exists upi_qr_url text;
alter table members add column if not exists upi_qr_path text;

-- Storage: UPI QR 画像用の公開バケット
insert into storage.buckets (id, name, public)
values ('upi-qr', 'upi-qr', true)
on conflict (id) do nothing;

drop policy if exists "upi_qr_read" on storage.objects;
drop policy if exists "upi_qr_write" on storage.objects;
drop policy if exists "upi_qr_delete" on storage.objects;
create policy "upi_qr_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'upi-qr');
create policy "upi_qr_write" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'upi-qr');
create policy "upi_qr_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'upi-qr');


-- ============ phase5-team-league.sql ============
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


-- ============ phase6-team-config.sql ============
-- =====================================================================
-- Chennai Pickleball — 団体戦のチーム数・チーム人数の設定
-- Supabase の SQL Editor に貼り付けて実行してください。
-- =====================================================================

-- 団体戦の想定チーム数(自動振り分けの既定値。null=人数から自動判定)
alter table tournaments add column if not exists team_count int;

-- 1チームの人数(下限・上限)。既定は 3〜4人
alter table tournaments add column if not exists team_size_min int not null default 3;
alter table tournaments add column if not exists team_size_max int not null default 4;


-- ============ phase7-tournament-matches-history.sql ============
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


-- ============ phase8-guests.sql ============
-- =====================================================================
-- Chennai Pickleball — 同伴者(家族・友人)対応
-- 出欠に「追加で連れてくる人数」を大人/子供で記録する。
-- コート使用料の割り勘は 大人の総数(参加メンバー + 同伴大人) で計算。
-- Supabase の SQL Editor に貼り付けて実行してください。
-- =====================================================================

alter table attendances add column if not exists extra_adults int not null default 0;
alter table attendances add column if not exists extra_children int not null default 0;


-- ============ phase9-dupr.sql ============
alter table members
  add column if not exists dupr numeric(4,3)
    check (dupr >= 2 and dupr <= 8);


-- ============ スキーマの権限付与(PostgRESTからアクセスできるようにする) ============
grant usage on schema community2 to anon, authenticated, service_role;
grant all on all tables in schema community2 to anon, authenticated, service_role;
grant all on all sequences in schema community2 to anon, authenticated, service_role;
alter default privileges in schema community2 grant all on tables to anon, authenticated, service_role;
alter default privileges in schema community2 grant all on sequences to anon, authenticated, service_role;
