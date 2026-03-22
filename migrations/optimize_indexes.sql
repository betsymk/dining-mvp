-- 索引优化迁移
-- 版本: v1.0.1-Phase 3
-- 创建日期: 2026-03-22
-- 说明: 优化常用查询性能，提升系统响应速度

-- ============================================
-- 订单表 (orders) 索引优化
-- ============================================

-- 1. 创建订单复合索引（status, created_at）
-- 优化场景：查询特定状态的订单并按时间排序
-- 示例：SELECT * FROM orders WHERE status = 'new' ORDER BY created_at DESC;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'orders' AND indexname = 'idx_orders_status_created'
    ) THEN
        CREATE INDEX idx_orders_status_created
        ON orders(status, created_at DESC)
        WHERE status IN ('new', 'done');
    END IF;
END $$;

-- 2. 创建今日订单索引（created_at过滤器）
-- 优化场景：查询今日的订单统计
-- 示例：SELECT * FROM orders WHERE DATE(created_at) = CURRENT_DATE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'orders' AND indexname = 'idx_orders_created_at_today'
    ) THEN
        CREATE INDEX idx_orders_created_at_today
        ON orders(created_at DESC)
        WHERE created_at >= CURRENT_DATE;
    END IF;
END $$;

-- 3. 创建桌号+状态复合索引
-- 优化场景：查询特定桌号的订单
-- 示例：SELECT * FROM orders WHERE table_id = 'A01' AND status = 'new';
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'orders' AND indexname = 'idx_orders_table_id_status'
    ) THEN
        CREATE INDEX idx_orders_table_id_status
        ON orders(table_id, status, created_at DESC)
        WHERE table_id IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- 菜品表 (dishes) 索引优化
-- ============================================

-- 1. 创建菜品分类+状态复合索引
-- 优化场景：查询特定分类的上架菜品
-- 示例：SELECT * FROM dishes WHERE category = 0 AND status = 1;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'dishes' AND indexname = 'idx_dishes_category_status'
    ) THEN
        CREATE INDEX idx_dishes_category_status
        ON dishes(category, status, name)
        WHERE status = 1;
    END IF;
END $$;

-- 2. 创建菜品价格范围索引
-- 优化场景：按价格区间查询菜品
-- 示例：SELECT * FROM dishes WHERE price BETWEEN 20 AND 50 ORDER BY price;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'dishes' AND indexname = 'idx_dishes_price'
    ) THEN
        CREATE INDEX idx_dishes_price
        ON dishes(price ASC)
        WHERE status = 1;
    END IF;
END $$;

-- 3. 创建上架菜品完整索引（包含主要查询字段）
-- 优化场景：主页面加载所有上架菜品
-- 示例：SELECT * FROM dishes WHERE status = 1 ORDER BY category, name;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'dishes' AND indexname = 'idx_dishes_active_full'
    ) THEN
        CREATE INDEX idx_dishes_active_full
        ON dishes(category, name, price, stock)
        WHERE status = 1 AND stock > 0;
    END IF;
END $$;

-- ============================================
-- 管理员表 (admin_users) 索引优化
-- ============================================

-- 1. 创建最后登录时间索引
-- 优化场景：查询活跃管理员
-- 示例：SELECT * FROM admin_users ORDER BY last_login DESC;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'admin_users' AND indexname = 'idx_admin_last_login'
    ) THEN
        CREATE INDEX idx_admin_last_login
        ON admin_users(last_login DESC)
        WHERE last_login IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- 验证索引创建结果
-- ============================================

-- 显示所有表的索引
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('orders', 'dishes', 'admin_users')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 显示索引大小统计
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename IN ('orders', 'dishes', 'admin_users')
    AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- 显示索引使用情况（需要运行一些查询后才能看到）
-- SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY schemaname, tablename, indexname;

-- ============================================
-- 性能测试查询（可选）
-- ============================================

-- 测试1：查询今日订单
-- EXPLAIN ANALYZE
-- SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE;

-- 测试2：查询上菜品
-- EXPLAIN ANALYZE
-- SELECT * FROM dishes WHERE status = 1 ORDER BY category, name;

-- 测试3：查询新订单
-- EXPLAIN ANALYZE
-- SELECT * FROM orders WHERE status = 'new' ORDER BY created_at DESC;

-- ============================================
-- 索引注释
-- ============================================

COMMENT ON INDEX idx_orders_status_created IS '订单状态+时间复合索引，优化订单状态查询';
COMMENT ON INDEX idx_orders_created_at_today IS '今日订单索引，优化今日统计查询';
COMMENT ON INDEX idx_orders_table_id_status IS '桌号+状态复合索引，优化桌号查询';
COMMENT ON INDEX idx_dishes_category_status IS '菜品分类+状态复合索引，优化菜品分类查询';
COMMENT ON INDEX idx_dishes_price IS '菜品价格索引，优化价格区间查询';
COMMENT ON INDEX idx_dishes_active_full IS '上架菜品完整索引，优化主页面查询';
COMMENT ON INDEX idx_admin_last_login IS '管理员最后登录时间索引，优化活跃管理员查询';
