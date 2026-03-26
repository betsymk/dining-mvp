-- 创建系统设置表（v1.3.0 营业时间功能）
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认营业时间设置
-- 格式: [{"start":"11:00","end":"14:00"},{"start":"17:00","end":"21:00"}]
INSERT INTO settings (setting_key, setting_value, description) VALUES
('business_hours', '[{"start":"11:00","end":"14:00"},{"start":"17:00","end":"21:00"}]', '营业时间段设置'),
('is_business_enabled', 'true', '是否启用营业时间控制');

-- 验证插入的数据
SELECT * FROM settings;