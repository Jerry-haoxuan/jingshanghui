-- Supabase 数据库表结构设置
-- 请在 Supabase SQL Editor 中执行以下语句

-- 创建人物表（如果不存在）
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,  -- 使用 TEXT 类型作为主键，以支持时间戳字符串
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  position TEXT,
  tags TEXT[],
  current_city TEXT,
  hometown TEXT,
  industry TEXT,
  is_followed BOOLEAN DEFAULT false,
  phone TEXT,
  phones JSONB,
  email TEXT,
  political_party TEXT,
  social_organizations JSONB,
  hobbies TEXT,
  skills TEXT,
  expectations TEXT,
  educations JSONB,
  work_history TEXT,
  additional_info TEXT,
  all_companies JSONB,
  birth_date TEXT,
  school TEXT,
  products TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建企业表（如果不存在）
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,  -- 使用 TEXT 类型作为主键
  name TEXT NOT NULL,
  industry TEXT,
  scale TEXT,
  products TEXT[],
  is_followed BOOLEAN DEFAULT false,
  additional_info TEXT,
  positioning TEXT,
  value TEXT,
  achievements TEXT,
  suppliers TEXT[],
  customers TEXT[],
  supplier_infos JSONB,
  customer_infos JSONB,
  demands TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_company ON people(company);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- 设置 Row Level Security (RLS) - 可选，但推荐
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 创建策略允许匿名用户读写（根据您的需求调整）
CREATE POLICY "Enable read access for all users" ON people FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON people FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON people FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON people FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON companies FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON companies FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON companies FOR DELETE USING (true);

-- 注意：以上策略允许所有用户进行读写操作
-- 在生产环境中，您可能需要更严格的访问控制
