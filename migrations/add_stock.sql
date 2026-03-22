-- 库存管理迁移
-- 版本: v1.0.1-Phase 2
-- 创建日期: 2026-03-22
-- 说明: 为菜品表添加库存管理功能

-- ============================================
-- 添加库存字段
-- ============================================

-- 添加库存字段（默认100）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dishes' AND column_name = 'stock'
    ) THEN
        ALTER TABLE dishes ADD COLUMN stock INTEGER DEFAULT 100;
    END IF;
END $$;

-- 库存非负约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'dishes' AND con.conname = 'check_stock_non_negative'
    ) THEN
        ALTER TABLE dishes ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);
    END IF;
END $$;

-- ============================================
-- 创建库存索引
-- ============================================

-- 添加库存索引（过滤索引，只索引有库存的菜品）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'dishes' AND indexname = 'idx_dishes_stock'
    ) THEN
        CREATE INDEX idx_dishes_stock ON dishes(stock) WHERE stock > 0;
    END IF;
END $$;

-- 创建复合索引，优化库存和状态查询
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'dishes' AND indexname = 'idx_dishes_status_stock'
    ) THEN
        CREATE INDEX idx_dishes_status_stock ON dishes(status, stock);
    END IF;
END $$;

-- ============================================
-- 设置现有菜品的初始库存
-- ============================================

-- 为现有菜品设置默认库存（如果还没有库存值）
UPDATE dishes
SET stock = 100
WHERE stock IS NULL OR stock = 0;

-- 根据销售预期调整部分热门菜品的库存（示例）
-- 这里可以根据实际情况调整
-- UPDATE dishes SET stock = 50 WHERE id IN (1, 2, 5);  -- 热门菜品库存较少

-- ============================================
-- 验证迁移结果
-- ============================================

-- 显示菜品表的列信息
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'dishes'
    AND column_name = 'stock'
ORDER BY ordinal_position;

-- 显示所有约束
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    rc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'dishes'
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;

-- 显示所有索引
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'dishes'
    AND indexname LIKE 'idx_dishes_stock%'
ORDER BY indexname;

-- 显示菜品库存统计
SELECT
    COUNT(*) as total_dishes,
    COUNT(CASE WHEN stock > 0 THEN 1 END) as in_stock,
    COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock,
    MIN(stock) as min_stock,
    MAX(stock) as max_stock,
    AVG(stock) as avg_stock
FROM dishes;

-- 显示前10个菜品的库存情况
SELECT
    id,
    name,
    price,
    status,
    stock,
    CASE
        WHEN stock = 0 THEN '售罄'
        WHEN stock < 20 THEN '库存紧张'
        ELSE '充足'
    END as stock_status
FROM dishes
ORDER BY id
LIMIT 10;

COMMENT ON COLUMN dishes.stock IS '菜品库存数量，0表示售罄';
COMMENT ON CONSTRAINT check_stock_non_negative ON dishes IS '库存必须非负';
COMMENT ON INDEX idx_dishes_stock IS '库存索引（过滤索引，只索引有库存的菜品）';
COMMENT ON INDEX idx_dishes_status_stock IS '状态和库存复合索引，优化上架且有库存的菜品查询';
