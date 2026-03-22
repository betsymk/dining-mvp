-- 数据完整性约束迁移
-- 版本: v1.0.1-Phase 2
-- 创建日期: 2026-03-22
-- 说明: 添加数据验证约束，确保数据质量

-- ============================================
-- 菜品表 (dishes) 约束
-- ============================================

-- 菜品价格必须大于0
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'dishes' AND con.conname = 'check_price_positive'
    ) THEN
        ALTER TABLE dishes ADD CONSTRAINT check_price_positive CHECK (price > 0);
    END IF;
END $$;

-- 菜品状态只能是0或1
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'dishes' AND con.conname = 'check_status_range'
    ) THEN
        ALTER TABLE dishes ADD CONSTRAINT check_status_range CHECK (status IN (0, 1));
    END IF;
END $$;

-- 菜品名称不能为空（应该已经在schema定义，但再次确认）
-- ALTER TABLE dishes ALTER COLUMN name SET NOT NULL;

-- 菜品价格不能为空（应该已经在schema定义，但再次确认）
-- ALTER TABLE dishes ALTER COLUMN price SET NOT NULL;

-- ============================================
-- 订单表 (orders) 约束
-- ============================================

-- 订单总价必须大于0
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'orders' AND con.conname = 'check_total_price_positive'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT check_total_price_positive CHECK (total_price > 0);
    END IF;
END $$;

-- 订单状态只能是'new'或'done'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'orders' AND con.conname = 'check_order_status'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT check_order_status CHECK (status IN ('new', 'done'));
    END IF;
END $$;

-- 订单项不能为空（JSONB字段必须有内容）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'orders' AND con.conname = 'check_items_not_empty'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT check_items_not_empty CHECK (jsonb_array_length(items) > 0);
    END IF;
END $$;

-- 订单类型只能是0、1或2（到店、外卖、预制菜）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'orders' AND con.conname = 'check_order_type'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT check_order_type CHECK (order_type IN (0, 1, 2));
    END IF;
END $$;

-- 桌号不能为空（到店订单必须有桌号）
-- 注意：外卖订单桌号可能为空，这里暂时不强制NOT NULL
-- ALTER TABLE orders ALTER COLUMN table_id SET NOT NULL;

-- ============================================
-- 验证约束创建结果
-- ============================================

-- 显示所有约束
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    rc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('dishes', 'orders')
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

COMMENT ON CONSTRAINT check_price_positive ON dishes IS '菜品价格必须大于0';
COMMENT ON CONSTRAINT check_status_range ON dishes IS '菜品状态只能是0(下架)或1(上架)';
COMMENT ON CONSTRAINT check_total_price_positive ON orders IS '订单总价必须大于0';
COMMENT ON CONSTRAINT check_order_status ON orders IS '订单状态只能是new或done';
COMMENT ON CONSTRAINT check_items_not_empty ON orders IS '订单项不能为空';
COMMENT ON CONSTRAINT check_order_type ON orders IS '订单类型只能是0(到店)、1(外卖)、2(预制菜)';
