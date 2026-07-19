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
alter publication supabase_realtime add table attendances;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table matches;

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
