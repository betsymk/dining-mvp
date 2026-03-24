-- 修复索引优化迁移
-- 版本: v1.0.1-Phase 3-Fix
-- 创建日期: 2026-03-22
-- 说明: 修复索引创建问题

-- ============================================
-- 修复今日订单索引（移除不稳定的函数过滤）
-- ============================================

-- 直接创建时间索引（已有 idx_orders_created_at，这里只是为了确保）
-- 原来的 idx_orders_created_at_today 使用了 CURRENT_DATE，这在索引中不是 IMMUTABLE
-- 建议使用应用层过滤或定期重建索引，这里不再创建

-- ============================================
-- 创建缺失的管理员索引（之前已经创建，这里只为确认）
-- ============================================

-- 创建管理员最后登录时间索引
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
-- 验证所有索引
-- ============================================

-- 显示所有重要索引
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

-- 注释说明已移除 idx_orders_created_at_today 索引
-- 原因：使用 CURRENT_DATE 函数时，PostgreSQL 要求索引函数必须是 IMMUTABLE
-- 解决方案：应用层查询时使用 DATE(created_at) = CURRENT_DATE，性能足够
-- 或者可以考虑使用表达式索引：CREATE INDEX idx_orders_date ON orders((created_at::date))
