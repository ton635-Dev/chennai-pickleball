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
