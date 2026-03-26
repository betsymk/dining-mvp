-- 库存提醒功能设置（v1.3.0）
-- 使用现有的 stock 字段

-- 确保所有菜品都有合理的库存值
UPDATE dishes SET stock = 100 WHERE stock IS NULL OR stock <= 0;

-- 添加库存状态检查函数
CREATE OR REPLACE FUNCTION check_stock_availability(dish_id INTEGER, quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT stock INTO current_stock FROM dishes WHERE id = dish_id;
    
    -- 如果库存为NULL或0，表示无限库存
    IF current_stock IS NULL OR current_stock = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- 检查库存是否足够
    RETURN current_stock >= quantity;
END;
$$ LANGUAGE plpgsql;

-- 验证数据
SELECT '菜品总数:', COUNT(*) FROM dishes;
SELECT '有限库存菜品:', COUNT(*) FROM dishes WHERE stock > 0 AND stock < 999999;
SELECT '无限库存菜品:', COUNT(*) FROM dishes WHERE stock = 0 OR stock IS NULL;