-- 添加库存字段到菜品表（v1.3.0 库存提醒功能）
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS inventory INTEGER DEFAULT NULL;

-- inventory字段说明：
-- NULL 或 0 表示无限库存（不限制）
-- 正整数表示具体库存数量
-- 当库存为0时，菜品标记为"已售罄"

-- 更新现有菜品，设置默认无限库存
UPDATE dishes SET inventory = NULL WHERE inventory IS NULL;

-- 验证表结构
\d dishes;