-- v1.3.0 数据导出功能 - 无需数据库结构变更
-- 此版本仅添加API路由，使用现有orders表结构

-- 验证orders表结构是否完整
DO $$
BEGIN
    -- 确保orders表包含所有必要的字段
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'id'
    ) THEN
        RAISE EXCEPTION 'orders表缺少id字段';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'table_id'
    ) THEN
        RAISE EXCEPTION 'orders表缺少table_id字段';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_type'
    ) THEN
        RAISE EXCEPTION 'orders表缺少order_type字段';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'total_price'
    ) THEN
        RAISE EXCEPTION 'orders表缺少total_price字段';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'status'
    ) THEN
        RAISE EXCEPTION 'orders表缺少status字段';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'created_at'
    ) THEN
        RAISE EXCEPTION 'orders表缺少created_at字段';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE EXCEPTION 'orders表缺少updated_at字段';
    END IF;
    
    RAISE NOTICE '订单导出功能数据库验证通过';
END $$;