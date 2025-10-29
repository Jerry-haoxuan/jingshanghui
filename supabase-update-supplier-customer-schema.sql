-- 更新 companies 表以支持新的供应商和客户数据结构
-- 包含行业大类 (industryCategory) 和小标题 (subTitle)
-- 请在 Supabase SQL Editor 中执行以下语句

-- 1. 确保 supplier_infos 和 customer_infos 字段存在（如果已存在则跳过）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'supplier_infos'
    ) THEN
        ALTER TABLE companies ADD COLUMN supplier_infos JSONB;
        RAISE NOTICE 'Added supplier_infos column';
    ELSE
        RAISE NOTICE 'supplier_infos column already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'customer_infos'
    ) THEN
        ALTER TABLE companies ADD COLUMN customer_infos JSONB;
        RAISE NOTICE 'Added customer_infos column';
    ELSE
        RAISE NOTICE 'customer_infos column already exists';
    END IF;
END $$;

-- 2. 为已有的旧数据创建迁移脚本（可选执行）
-- 将旧的 suppliers TEXT[] 数据转换为新的 JSONB 格式
-- 如果您已经有数据并想保留，可以执行下面的语句

-- 迁移供应商数据
UPDATE companies
SET supplier_infos = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'materialName', '',
            'materialCategory', '',
            'supplierName', supplier_name,
            'industryCategory', '',
            'subTitle', '',
            'keywords', '',
            'keyPerson1', '',
            'keyPerson2', '',
            'keyPerson3', ''
        )
    )
    FROM unnest(suppliers) AS supplier_name
)
WHERE suppliers IS NOT NULL 
  AND array_length(suppliers, 1) > 0
  AND (supplier_infos IS NULL OR supplier_infos = '[]'::jsonb);

-- 迁移客户数据
UPDATE companies
SET customer_infos = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'productName', '',
            'productCategory', '',
            'customerName', customer_name,
            'industryCategory', '',
            'subTitle', '',
            'keywords', '',
            'keyPerson1', '',
            'keyPerson2', '',
            'keyPerson3', ''
        )
    )
    FROM unnest(customers) AS customer_name
)
WHERE customers IS NOT NULL 
  AND array_length(customers, 1) > 0
  AND (customer_infos IS NULL OR customer_infos = '[]'::jsonb);

-- 3. 验证更新结果
SELECT 
    id,
    name,
    suppliers,
    supplier_infos,
    customers,
    customer_infos
FROM companies
WHERE (suppliers IS NOT NULL AND array_length(suppliers, 1) > 0)
   OR (customers IS NOT NULL AND array_length(customers, 1) > 0)
   OR supplier_infos IS NOT NULL
   OR customer_infos IS NOT NULL
LIMIT 10;

-- 4. 查看数据结构示例
-- 新的 supplier_infos 格式示例:
-- [
--   {
--     "materialName": "芯片材料",
--     "materialCategory": "",
--     "supplierName": "供应商A",
--     "industryCategory": "半导体",
--     "subTitle": "光刻胶供应商",
--     "keywords": "",
--     "keyPerson1": "",
--     "keyPerson2": "",
--     "keyPerson3": ""
--   }
-- ]

-- 新的 customer_infos 格式示例:
-- [
--   {
--     "productName": "AI芯片",
--     "productCategory": "",
--     "customerName": "客户B",
--     "industryCategory": "人工智能",
--     "subTitle": "终端设备制造商",
--     "keywords": "",
--     "keyPerson1": "",
--     "keyPerson2": "",
--     "keyPerson3": ""
--   }
-- ]

-- 5. 创建索引以提高查询性能（可选）
CREATE INDEX IF NOT EXISTS idx_companies_supplier_infos ON companies USING GIN (supplier_infos);
CREATE INDEX IF NOT EXISTS idx_companies_customer_infos ON companies USING GIN (customer_infos);

-- 完成！
SELECT 'Database schema update completed successfully!' AS status;

