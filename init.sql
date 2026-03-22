-- H5点餐系统数据库初始化脚本

-- 创建数据库（如果需要）
-- CREATE DATABASE dining_mvp;

-- 连接到数据库
-- \c dining_mvp;

-- 删除已存在的表（如果存在）
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS dishes;

-- 创建菜品表
CREATE TABLE dishes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    category INTEGER DEFAULT 0, -- 0=到店 1=外卖 2=预制菜
    status INTEGER DEFAULT 1, -- 0=下架 1=上架
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建订单表
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    table_id VARCHAR(20), -- 桌号（如 A01）
    items JSONB NOT NULL, -- [{"id":1, "name":"菜名", "price":10, "quantity":2}]
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'new', -- 'new' | 'done'
    customer_phone VARCHAR(20), -- 可选
    order_type INTEGER DEFAULT 0, -- 0=到店 1=外卖 2=预制菜
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引优化查询性能
CREATE INDEX idx_dishes_status ON dishes(status);
CREATE INDEX idx_dishes_category ON dishes(category);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_table_id ON orders(table_id);

-- 插入示例菜品数据（10个菜品）

INSERT INTO dishes (name, price, description, image_url, category, status) VALUES
('招牌红烧肉', 48.00, '精选五花肉，秘制酱料红烧，软糯香甜', '/images/dish1.jpg', 0, 1),
('清蒸鲈鱼', 68.00, '新鲜鲈鱼，清蒸保留原汁原味', '/images/dish2.jpg', 0, 1),
('麻婆豆腐', 28.00, '经典川菜，麻辣鲜香', '/images/dish3.jpg', 0, 1),
('宫保鸡丁', 38.00, '花生米 + 鸡丁 + 青椒，酸甜微辣', '/images/dish4.jpg', 0, 1),
('水煮鱼', 58.00, '鲜嫩鱼肉配豆芽，麻辣过瘾', '/images/dish5.jpg', 0, 1),
('蒜蓉西兰花', 22.00, '清爽健康，蒜香浓郁', '/images/dish6.jpg', 0, 1),
('糖醋排骨', 42.00, '酸甜开胃，老少皆宜', '/images/dish7.jpg', 1, 1),
('鱼香肉丝', 35.00, '经典川菜，酸甜微辣', '/images/dish8.jpg', 1, 1),
('土豆炖牛腩', 45.00, '软烂入味，家常经典', '/images/dish9.jpg', 2, 1),
('番茄鸡蛋汤', 18.00, '简单营养，暖心暖胃', '/images/dish10.jpg', 0, 1);

-- 插入示例订单数据
INSERT INTO orders (table_id, items, total_price, status, customer_phone, order_type) VALUES
('A01',
 '[{"id":1,"name":"招牌红烧肉","price":48,"quantity":1},{"id":3,"name":"麻婆豆腐","price":28,"quantity":2}]',
 104.00,
 'done',
 '13800138000',
 0
),
('B02',
 '[{"id":4,"name":"宫保鸡丁","price":38,"quantity":1},{"id":6,"name":"蒜蓉西兰花","price":22,"quantity":1},{"id":10,"name":"番茄鸡蛋汤","price":18,"quantity":1}]',
 78.00,
 'new',
 '13900139000',
 0
);

-- 验证插入的数据
SELECT '菜品数量：' as info, COUNT(*) FROM dishes;
SELECT '订单数量：' as info, COUNT(*) FROM orders;

-- 显示所有菜品
SELECT * FROM dishes ORDER BY id;

-- 显示所有订单
SELECT * FROM orders ORDER BY created_at DESC;
