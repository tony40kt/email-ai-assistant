-- Email AI Assistant — Supabase 資料庫 Schema
-- 執行前請確認已在 Supabase 專案中開啟 SQL Editor 並貼上此檔案

-- ============================================================
-- 擴充套件
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- 使用者帳號（與 Supabase Auth 整合）
-- ============================================================
create table if not exists public.user_profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  email         text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- Gmail OAuth 憑證（後端加密儲存）
-- ============================================================
create table if not exists public.oauth_tokens (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.user_profiles (id) on delete cascade,
  provider      text not null default 'gmail',   -- 'gmail' | 'outlook'
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  scope         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

-- ============================================================
-- 郵件同步狀態
-- ============================================================
create table if not exists public.sync_states (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.user_profiles (id) on delete cascade,
  provider        text not null default 'gmail',
  sync_token      text,           -- Gmail nextPageToken / historyId
  last_synced_at  timestamptz,
  resume_cursor   text,           -- 多頁同步中斷時的續點
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, provider)
);

-- ============================================================
-- 分類規則
-- ============================================================
create table if not exists public.classification_rules (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.user_profiles (id) on delete cascade,
  name        text not null,
  enabled     boolean not null default true,
  priority    integer not null default 100,   -- 數字越小越優先
  -- 條件（至少填一欄）
  cond_from       text[],    -- 寄件人（模糊比對）
  cond_to         text[],    -- 收件人
  cond_keyword    text[],    -- 主旨或內文關鍵字
  cond_subject    text[],    -- 主旨關鍵字
  cond_body       text[],    -- 內文關鍵字
  cond_is_read    boolean,   -- null = 不限
  -- 命中後套用的標籤
  labels      text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 本地郵件快取（分類後的結果）
-- ============================================================
create table if not exists public.emails (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.user_profiles (id) on delete cascade,
  provider            text not null default 'gmail',
  provider_id         text not null,   -- Gmail message ID
  thread_id           text,
  subject             text,
  sender              text,
  recipients          text[],
  snippet             text,
  body_text           text,
  is_read             boolean not null default false,
  labels              text[] not null default '{}',
  -- 分類引擎結果
  matched_rule_id     uuid references public.classification_rules (id) on delete set null,
  matched_rule_name   text,
  applied_labels      text[] not null default '{}',
  classification_priority integer,
  -- 時間
  received_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, provider, provider_id)
);

-- ============================================================
-- 通知規則
-- ============================================================
create table if not exists public.notification_rules (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.user_profiles (id) on delete cascade,
  name        text not null,
  enabled     boolean not null default true,
  priority    integer not null default 100,
  -- 與分類規則相同的條件欄位
  cond_from       text[],
  cond_to         text[],
  cond_keyword    text[],
  cond_is_read    boolean,
  -- 推送排程設定
  schedule_mode   text not null default 'immediate',  -- 'immediate' | 'fixed_times' | 'daily'
  schedule_times  text[],    -- ['09:00', '18:00'] for fixed_times / daily
  quiet_start     text,      -- '22:00' 安靜時段開始
  quiet_end       text,      -- '07:00' 安靜時段結束
  timezone        text not null default 'Asia/Taipei',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 使用者偏好設定
-- ============================================================
create table if not exists public.user_preferences (
  user_id           uuid primary key references public.user_profiles (id) on delete cascade,
  language          text not null default 'zh-TW',
  timezone          text not null default 'Asia/Taipei',
  notifications_enabled boolean not null default true,
  translation_warning_accepted boolean not null default false,  -- 用戶已知悉翻譯會送至外部
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- 自動更新 updated_at 的 trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_profiles', 'oauth_tokens', 'sync_states',
    'classification_rules', 'emails', 'notification_rules', 'user_preferences'
  ]
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ============================================================
-- Row-Level Security（每個使用者只能存取自己的資料）
-- ============================================================
alter table public.user_profiles        enable row level security;
alter table public.oauth_tokens         enable row level security;
alter table public.sync_states          enable row level security;
alter table public.classification_rules enable row level security;
alter table public.emails               enable row level security;
alter table public.notification_rules   enable row level security;
alter table public.user_preferences     enable row level security;

-- user_profiles
create policy "users can manage own profile"
  on public.user_profiles for all
  using (auth.uid() = id);

-- oauth_tokens（僅後端 service_role 可存取，前端不可直接讀）
create policy "service role only"
  on public.oauth_tokens for all
  using (auth.role() = 'service_role');

-- sync_states（同上，後端內部使用）
create policy "service role only"
  on public.sync_states for all
  using (auth.role() = 'service_role');

-- classification_rules
create policy "users can manage own rules"
  on public.classification_rules for all
  using (auth.uid() = user_id);

-- emails
create policy "users can manage own emails"
  on public.emails for all
  using (auth.uid() = user_id);

-- notification_rules
create policy "users can manage own notification rules"
  on public.notification_rules for all
  using (auth.uid() = user_id);

-- user_preferences
create policy "users can manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id);

-- ============================================================
-- 索引（提升查詢效能）
-- ============================================================
create index if not exists idx_emails_user_received     on public.emails (user_id, received_at desc);
create index if not exists idx_emails_user_labels       on public.emails using gin (labels);
create index if not exists idx_emails_user_sender       on public.emails (user_id, sender);
create index if not exists idx_rules_user_priority      on public.classification_rules (user_id, priority, created_at);
create index if not exists idx_notif_rules_user_priority on public.notification_rules (user_id, priority, created_at);
