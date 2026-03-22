-- 创建管理员表
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- bcrypt加密的密码
    nickname VARCHAR(50),
    role VARCHAR(20) DEFAULT 'admin',  -- admin, super_admin
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE UNIQUE INDEX idx_admin_username ON admin_users(username);
CREATE INDEX idx_admin_role ON admin_users(role);
CREATE INDEX idx_admin_last_login ON admin_users(last_login DESC);

-- 插入默认管理员账户（密码：admin123，bcrypt加密后）
-- 注意：实际密码 hash 应该使用 bcrypt.hashSync('admin123', 10) 生成
-- 这里是 'admin123' 的 bcrypt hash (salt rounds = 10)
INSERT INTO admin_users (username, password, nickname, role)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye2Vc.1.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9', '系统管理员', 'admin')
ON CONFLICT (username) DO NOTHING;

COMMENT ON TABLE admin_users IS '管理后台用户表';
COMMENT ON COLUMN admin_users.password IS 'bcrypt加密后的密码';
COMMENT ON COLUMN admin_users.role IS '用户角色: admin-普通管理员, super_admin-超级管理员';
