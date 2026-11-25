-- =====================================================================
-- Phase 14: 大会・イベント掲示板
-- 外部大会(TurfTown等)やサークル内イベント(合宿など)を誰でも投稿でき、
-- 各メンバーが「出場予定 / ペア探し中 / 興味あり」を表明できる。
-- コミュニティ間では共有しない(各スキーマに独立して作る)。
-- 冪等: 再実行しても安全。
-- =====================================================================

create table if not exists board_posts (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'external'
                    check (kind in ('external','circle','other')),
  title           text not null,
  start_date      date not null,
  end_date        date,                       -- 複数日(合宿など)。null=1日
  start_time      time,
  end_time        time,
  place_name      text,
  maps_url        text,
  url             text,                       -- 大会ページ(TurfTown等)
  entry_deadline  date,                       -- 申込締切
  categories      text[] not null default '{}', -- md / wd / mx / singles
  level           text,                       -- レベル帯(自由記入)
  fee             text,                       -- 参加費(自由記入)
  note            text,
  image_url       text,                       -- チラシ画像
  image_path      text,
  created_by      uuid references members(id) on delete set null,
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists board_posts_date_idx on board_posts (start_date);

create table if not exists board_responses (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references board_posts(id) on delete cascade,
  member_id          uuid not null references members(id) on delete cascade,
  status             text not null check (status in ('going','seeking','interested')),
  category           text,                    -- 出たい種目(md / wd / mx / singles)
  comment            text,
  partner_member_id  uuid references members(id) on delete set null, -- 決まったペア
  updated_at         timestamptz not null default now(),
  unique (post_id, member_id)
);
create index if not exists board_responses_post_idx on board_responses (post_id);

alter table board_posts enable row level security;
alter table board_responses enable row level security;
drop policy if exists "public_all" on board_posts;
create policy "public_all" on board_posts
  for all to anon, authenticated using (true) with check (true);
drop policy if exists "public_all" on board_responses;
create policy "public_all" on board_responses
  for all to anon, authenticated using (true) with check (true);

-- チラシ画像用の公開バケット(両コミュニティ共用。パスの先頭にスキーマ名を付けて分ける)
insert into storage.buckets (id, name, public)
values ('board-images', 'board-images', true)
on conflict (id) do nothing;
drop policy if exists "board_images_read" on storage.objects;
drop policy if exists "board_images_write" on storage.objects;
drop policy if exists "board_images_delete" on storage.objects;
create policy "board_images_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'board-images');
create policy "board_images_write" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'board-images');
create policy "board_images_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'board-images');
