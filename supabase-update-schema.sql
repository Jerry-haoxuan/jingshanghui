-- 为 people 表添加新的地址字段
-- 2024年12月 地址信息增强更新

-- 添加家庭详细位置字段
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS home_address TEXT;

-- 添加公司住址字段  
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS company_address TEXT;

-- 为新字段添加注释
COMMENT ON COLUMN people.home_address IS '家庭详细位置';
COMMENT ON COLUMN people.company_address IS '公司住址';

-- 确保索引优化（可选）
-- CREATE INDEX IF NOT EXISTS idx_people_home_address ON people(home_address);
-- CREATE INDEX IF NOT EXISTS idx_people_company_address ON people(company_address);

-- 验证表结构更新
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'people' 
  AND column_name IN ('home_address', 'company_address')
ORDER BY ordinal_position;
