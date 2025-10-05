-- 关系数据表结构
-- 请在 Supabase SQL Editor 中执行以下语句

-- 创建关系表（如果不存在）
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  related_person_id TEXT,
  related_company_id TEXT,
  relationship_type TEXT NOT NULL,
  strength DECIMAL(3,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_relationships_person_id ON relationships(person_id);
CREATE INDEX IF NOT EXISTS idx_relationships_related_person_id ON relationships(related_person_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);

-- 设置 Row Level Security (RLS)
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- 创建策略允许所有用户读写
CREATE POLICY "Enable read access for all users" ON relationships FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON relationships FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON relationships FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON relationships FOR DELETE USING (true);

-- 添加外键约束（可选，如果people表已存在）
-- ALTER TABLE relationships ADD CONSTRAINT fk_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;
-- ALTER TABLE relationships ADD CONSTRAINT fk_related_person FOREIGN KEY (related_person_id) REFERENCES people(id) ON DELETE CASCADE;

-- 验证表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'relationships'
ORDER BY ordinal_position;

