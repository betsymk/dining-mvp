-- 营销功能表结构（v1.3.0 基础营销功能）

-- 优惠券表
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- 优惠券码
    name VARCHAR(100) NOT NULL,       -- 优惠券名称
    type INTEGER NOT NULL,            -- 0=固定金额减免, 1=折扣
    value DECIMAL(10,2) NOT NULL,     -- 减免金额或折扣比例（如0.9表示9折）
    min_amount DECIMAL(10,2) DEFAULT 0, -- 最低消费金额
    max_discount DECIMAL(10,2),       -- 最大减免金额（仅折扣类型适用）
    usage_limit INTEGER DEFAULT 1,     -- 使用次数限制（0表示无限次）
    used_count INTEGER DEFAULT 0,      -- 已使用次数
    start_time TIMESTAMP,             -- 开始时间
    end_time TIMESTAMP,               -- 结束时间
    status INTEGER DEFAULT 1,         -- 0=禁用, 1=启用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 满减活动表
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,       -- 活动名称
    min_amount DECIMAL(10,2) NOT NULL, -- 满多少
    discount_amount DECIMAL(10,2) NOT NULL, -- 减多少
    start_time TIMESTAMP,             -- 开始时间
    end_time TIMESTAMP,               -- 结束时间
    status INTEGER DEFAULT 1,         -- 0=禁用, 1=启用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_promotions_status ON promotions(status);

-- 插入示例数据
INSERT INTO coupons (code, name, type, value, min_amount, usage_limit, status) VALUES
('WELCOME10', '新客立减10元', 0, 10.00, 20.00, 1, 1),
('SAVE20', '满100减20', 0, 20.00, 100.00, 0, 1);

INSERT INTO promotions (name, min_amount, discount_amount, status) VALUES
('满50减5', 50.00, 5.00, 1),
('满100减15', 100.00, 15.00, 1);

-- 验证数据
SELECT '优惠券数量:', COUNT(*) FROM coupons;
SELECT '满减活动数量:', COUNT(*) FROM promotions;