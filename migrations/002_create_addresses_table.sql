-- 创建用户表（如果不存在）
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    avatar_url VARCHAR(500),
    nickname VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建地址表
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- 收货人姓名
    phone VARCHAR(20) NOT NULL,
    province VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    address_detail TEXT NOT NULL, -- 详细地址
    postal_code VARCHAR(10),
    is_default BOOLEAN DEFAULT false,
    longitude DECIMAL(10, 8) NOT NULL, -- 经度
    latitude DECIMAL(10, 8) NOT NULL,  -- 纬度
    delivery_range_valid BOOLEAN DEFAULT true, -- 是否在配送范围内
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建商家表
CREATE TABLE IF NOT EXISTS restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    longitude DECIMAL(10, 8) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    delivery_radius INTEGER DEFAULT 5000, -- 配送半径（米）
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(is_default);
CREATE INDEX IF NOT EXISTS idx_restaurants_coordinates ON restaurants(longitude, latitude);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 添加地理距离计算函数（Haversine公式）
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL(10, 8),
    lon1 DECIMAL(10, 8),
    lat2 DECIMAL(10, 8),
    lon2 DECIMAL(10, 8)
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
    R CONSTANT DECIMAL := 6371000; -- 地球半径（米）
    lat1_rad DECIMAL;
    lat2_rad DECIMAL;
    delta_lat_rad DECIMAL;
    delta_lon_rad DECIMAL;
    a DECIMAL;
    c DECIMAL;
    distance DECIMAL(10, 2);
BEGIN
    -- 转换为弧度
    lat1_rad := RADIANS(lat1);
    lat2_rad := RADIANS(lat2);
    delta_lat_rad := RADIANS(lat2 - lat1);
    delta_lon_rad := RADIANS(lon2 - lon1);
    
    -- Haversine公式
    a := SIN(delta_lat_rad / 2) * SIN(delta_lat_rad / 2) +
         COS(lat1_rad) * COS(lat2_rad) *
         SIN(delta_lon_rad / 2) * SIN(delta_lon_rad / 2);
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    distance := R * c;
    
    RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- 更新订单表以支持外卖订单
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS restaurant_id INTEGER REFERENCES restaurants(id),
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'dineIn' CHECK (order_type IN ('dineIn', 'takeout')),
ADD COLUMN IF NOT EXISTS delivery_address JSONB,
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'confirmed', 'preparing', 'ready', 'assigned', 'pickedUp', 'delivered', 'cancelled')),
ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS actual_delivery_time TIMESTAMP;

-- 创建索引优化订单查询
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);