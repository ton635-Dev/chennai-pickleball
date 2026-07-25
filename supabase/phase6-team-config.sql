-- =====================================================================
-- Chennai Pickleball — 団体戦のチーム数・チーム人数の設定
-- Supabase の SQL Editor に貼り付けて実行してください。
-- =====================================================================

-- 団体戦の想定チーム数(自動振り分けの既定値。null=人数から自動判定)
alter table tournaments add column if not exists team_count int;

-- 1チームの人数(下限・上限)。既定は 3〜4人
alter table tournaments add column if not exists team_size_min int not null default 3;
alter table tournaments add column if not exists team_size_max int not null default 4;
