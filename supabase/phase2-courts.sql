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
insert into review_items (name, sort_order)
select v.name, v.ord
from (values
  ('コート数', 1),
  ('路面(滑りにくさ)', 2),
  ('広さ', 3),
  ('設備', 4),
  ('アクセス', 5)
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
create policy "court_photos_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'court-photos');
create policy "court_photos_write" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'court-photos');
create policy "court_photos_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'court-photos');

-- Realtime(コート評価のライブ更新は任意)
alter publication supabase_realtime add table court_reviews;
