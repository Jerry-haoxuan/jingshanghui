-- ============================================================
-- 精尚慧生态圈 - 阿里云 RDS PostgreSQL 数据库建表脚本
-- 在 RDS 控制台或 DBeaver 中执行此文件
-- 如果表已存在，使用 IF NOT EXISTS 跳过，不会破坏现有数据
-- ============================================================

-- 1. 用户账号表
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id            VARCHAR(100) PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'member',
  invitation_code VARCHAR(100) NOT NULL,
  person_name   VARCHAR(100),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 如果 user_accounts 已存在但缺少 person_name 列，执行下面这行
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS person_name VARCHAR(100);

-- 2. 好友关系表
CREATE TABLE IF NOT EXISTS public.friendships (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id_1 VARCHAR(100) NOT NULL,
  person_id_2 VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (person_id_1, person_id_2)
);

-- 3. 项目表
CREATE TABLE IF NOT EXISTS public.projects (
  id                   UUID         PRIMARY KEY,
  name                 VARCHAR(200) NOT NULL,
  description          TEXT,
  status               VARCHAR(50)  NOT NULL DEFAULT 'in_progress',
  current_stage        VARCHAR(50)  NOT NULL DEFAULT 'initiation',
  creator_person_id    VARCHAR(100) NOT NULL,
  partner_person_id    VARCHAR(100) NOT NULL,
  termination_category VARCHAR(100),
  termination_reason   TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 4. 项目里程碑表
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id             UUID        PRIMARY KEY,
  project_id     UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage          VARCHAR(50) NOT NULL,
  planned_date   DATE,
  completed_date DATE,
  reminder_days  INTEGER,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 项目日志表
CREATE TABLE IF NOT EXISTS public.project_logs (
  id               UUID        PRIMARY KEY,
  project_id       UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  log_type         VARCHAR(50) NOT NULL DEFAULT 'message',
  content          TEXT        NOT NULL,
  author_person_id VARCHAR(100),
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. 项目文件表
CREATE TABLE IF NOT EXISTS public.project_files (
  id                      UUID         PRIMARY KEY,
  project_id              UUID         NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name               VARCHAR(200) NOT NULL,
  file_url                TEXT,
  file_type               VARCHAR(100),
  uploaded_by_person_id   VARCHAR(100),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 7. 项目点评表
CREATE TABLE IF NOT EXISTS public.project_reviews (
  id                  UUID         PRIMARY KEY,
  project_id          UUID         NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_person_id  VARCHAR(100) NOT NULL,
  reviewee_person_id  VARCHAR(100) NOT NULL,
  tags                TEXT[]       NOT NULL DEFAULT '{}',
  comment             TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 执行完成后，可用以下查询验证：
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
