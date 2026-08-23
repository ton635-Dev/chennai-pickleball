-- =====================================================================
-- Chennai Pickleball — 同伴者(家族・友人)対応
-- 出欠に「追加で連れてくる人数」を大人/子供で記録する。
-- コート使用料の割り勘は 大人の総数(参加メンバー + 同伴大人) で計算。
-- Supabase の SQL Editor に貼り付けて実行してください。
-- =====================================================================

alter table attendances add column if not exists extra_adults int not null default 0;
alter table attendances add column if not exists extra_children int not null default 0;
