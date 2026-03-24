-- 创建台桌表
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_id VARCHAR(50) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 台桌状态约束
ALTER TABLE tables ADD CONSTRAINT check_table_status 
CHECK (status IN ('available', 'occupied', 'reserved'));

-- 添加索引
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_tables_table_id ON tables(table_id);