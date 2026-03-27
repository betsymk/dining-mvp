-- v1.4.0 数据分析功能 - 数据库表结构

-- 1. 用户行为事件表 (用于追踪用户操作)
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,           -- 事件类型: page_view, order_create, dish_click等
    user_id INTEGER,                           -- 用户ID (管理员或顾客)
    session_id VARCHAR(100),                   -- 会话ID
    table_id VARCHAR(20),                      -- 桌号 (顾客端)
    entity_id INTEGER,                         -- 相关实体ID (如订单ID、菜品ID)
    entity_type VARCHAR(20),                   -- 实体类型: order, dish, category等
    properties JSONB,                          -- 事件属性 (JSON格式存储额外信息)
    ip_address INET,                           -- IP地址
    user_agent TEXT,                           -- 用户代理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引优化查询性能
    INDEX idx_event_type_created (event_type, created_at),
    INDEX idx_user_id_created (user_id, created_at),
    INDEX idx_table_id_created (table_id, created_at),
    INDEX idx_entity_id_type (entity_id, entity_type)
);

-- 2. 日销售汇总表 (预计算的聚合数据，提升查询性能)
CREATE TABLE IF NOT EXISTS daily_sales_summary (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,                        -- 统计日期
    total_orders INTEGER DEFAULT 0,            -- 总订单数
    total_revenue DECIMAL(10,2) DEFAULT 0.00,  -- 总收入
    avg_order_value DECIMAL(10,2) DEFAULT 0.00,-- 平均客单价
    dine_in_orders INTEGER DEFAULT 0,          -- 到店订单数
    delivery_orders INTEGER DEFAULT 0,         -- 外卖订单数
    prepackaged_orders INTEGER DEFAULT 0,      -- 预制菜订单数
    completed_orders INTEGER DEFAULT 0,        -- 完成订单数
    pending_orders INTEGER DEFAULT 0,          -- 待处理订单数
    
    -- 唯一约束确保每天只有一条记录
    UNIQUE(date)
);

-- 3. 客户洞察表 (存储客户行为分析结果)
CREATE TABLE IF NOT EXISTS customer_insights (
    id SERIAL PRIMARY KEY,
    customer_identifier VARCHAR(100) NOT NULL, -- 客户标识 (桌号或手机号)
    first_visit_date DATE,                     -- 首次访问日期
    last_visit_date DATE,                      -- 最后访问日期
    total_visits INTEGER DEFAULT 0,            -- 总访问次数
    total_spent DECIMAL(10,2) DEFAULT 0.00,    -- 总消费金额
    avg_visit_frequency_days INTEGER,          -- 平均访问间隔天数
    favorite_categories JSONB,                 -- 偏好分类 (JSON数组)
    favorite_dishes JSONB,                     -- 偏好菜品 (JSON数组)
    last_order_items JSONB,                    -- 最近订单菜品
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 唯一约束确保每个客户只有一条记录
    UNIQUE(customer_identifier)
);

-- 4. 运营指标表 (存储关键运营指标)
CREATE TABLE IF NOT EXISTS operational_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,                 -- 指标日期
    metric_name VARCHAR(50) NOT NULL,          -- 指标名称
    metric_value DECIMAL(15,4) NOT NULL,       -- 指标值
    metric_unit VARCHAR(20),                   -- 指标单位
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 唯一约束确保每天每个指标只有一条记录
    UNIQUE(metric_date, metric_name)
);

-- 5. 创建视图：简化常用查询
-- 销售趋势视图
CREATE OR REPLACE VIEW sales_trends AS
SELECT 
    date,
    total_orders,
    total_revenue,
    avg_order_value,
    (total_revenue - LAG(total_revenue) OVER (ORDER BY date)) / NULLIF(LAG(total_revenue) OVER (ORDER BY date), 0) * 100 as revenue_growth_pct,
    (total_orders - LAG(total_orders) OVER (ORDER BY date)) / NULLIF(LAG(total_orders) OVER (ORDER BY date), 0) * 100 as orders_growth_pct
FROM daily_sales_summary
ORDER BY date DESC;

-- 客户活跃度视图  
CREATE OR REPLACE VIEW customer_activity AS
SELECT 
    customer_identifier,
    total_visits,
    total_spent,
    avg_visit_frequency_days,
    CASE 
        WHEN last_visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN 'active'
        WHEN last_visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'recent'
        ELSE 'inactive'
    END as activity_status
FROM customer_insights
WHERE last_visit_date IS NOT NULL;

-- 添加注释说明表用途
COMMENT ON TABLE analytics_events IS '用户行为事件追踪表，用于数据分析和推荐系统';
COMMENT ON TABLE daily_sales_summary IS '日销售汇总表，预计算聚合数据以提升查询性能';
COMMENT ON TABLE customer_insights IS '客户洞察表，存储客户行为分析结果';
COMMENT ON TABLE operational_metrics IS '运营指标表，存储关键业务指标';

-- 初始化示例数据 (可选)
INSERT INTO operational_metrics (metric_date, metric_name, metric_value, metric_unit) 
VALUES 
    (CURRENT_DATE, 'system_uptime', 100.0, '%'),
    (CURRENT_DATE, 'api_response_time_avg', 250.0, 'ms')
ON CONFLICT (metric_date, metric_name) DO NOTHING;