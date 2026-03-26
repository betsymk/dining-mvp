// 订单路由
const express = require('express');
const router = express.Router();
const pool = require('../database');
const { eventTracker } = require('../middleware/eventTracker');

// 获取所有订单
router.get('/', async (req, res) => {
  try {
    const { status, order_type, user_id } = req.query;
    let query = 'SELECT * FROM orders ORDER BY created_at DESC';
    const params = [];
    let paramIndex = 1;

    if (status) {
      query = `SELECT * FROM orders WHERE status = $${paramIndex} ORDER BY created_at DESC`;
      params.push(status);
      paramIndex++;
    }

    if (order_type && !status) {
      query = `SELECT * FROM orders WHERE order_type = $${paramIndex} ORDER BY created_at DESC`;
      params.push(order_type);
      paramIndex++;
    } else if (order_type && status) {
      query = `SELECT * FROM orders WHERE status = $1 AND order_type = $${paramIndex} ORDER BY created_at DESC`;
      params.push(status, order_type);
      paramIndex++;
    }

    // 添加用户ID过滤（用于外卖订单）
    if (user_id && !status && !order_type) {
      query = `SELECT * FROM orders WHERE user_id = $${paramIndex} ORDER BY created_at DESC`;
      params.push(user_id);
      paramIndex++;
    } else if (user_id && (status || order_type)) {
      // 在现有查询基础上添加用户ID条件
      const whereIndex = query.indexOf('WHERE') + 6;
      query = query.slice(0, whereIndex) + `user_id = $${paramIndex} AND ` + query.slice(whereIndex);
      params.splice(params.length - (paramIndex - 1), 0, user_id);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ success: false, message: '获取订单列表失败' });
  }
});

// 获取单个订单
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ success: false, message: '获取订单详情失败' });
  }
});

// 创建订单
router.post('/', async (req, res) => {
  try {
    const { 
      table_id, 
      items, 
      total_price, 
      customer_phone, 
      order_type = 'dineIn',
      user_id,
      restaurant_id,
      delivery_address,
      delivery_fee = 0,
      estimated_delivery_time
    } = req.body;

    // 验证必填字段
    if (!items || items.length === 0 || !total_price) {
      return res.status(400).json({ success: false, message: '订单信息不完整' });
    }

    // 验证和转换订单类型
    let orderTypeValue;
    if (typeof order_type === 'string') {
      if (order_type === 'dineIn') {
        orderTypeValue = 0;
      } else if (order_type === 'takeout') {
        orderTypeValue = 1;
      } else {
        return res.status(400).json({ success: false, message: '无效的订单类型' });
      }
    } else if (typeof order_type === 'number') {
      if ([0, 1, 2].includes(order_type)) {
        orderTypeValue = order_type;
      } else {
        return res.status(400).json({ success: false, message: '无效的订单类型' });
      }
    } else {
      return res.status(400).json({ success: false, message: '无效的订单类型' });
    }

    // 外卖订单验证
    if (orderTypeValue === 1) {
      if (!user_id) {
        return res.status(400).json({ success: false, message: '外卖订单需要用户ID' });
      }
      if (!restaurant_id) {
        return res.status(400).json({ success: false, message: '外卖订单需要餐厅ID' });
      }
      if (!delivery_address) {
        return res.status(400).json({ success: false, message: '外卖订单需要配送地址' });
      }
    }

    // 堂食订单验证
    if (orderTypeValue === 0) {
      if (!table_id) {
        return res.status(400).json({ success: false, message: '堂食订单需要桌号' });
      }
    }

    // 检查库存是否充足
    for (const item of items) {
      if (!item.id || !item.quantity) {
        return res.status(400).json({ success: false, message: '菜品信息不完整' });
      }
      
      // 查询菜品库存
      const dishQuery = 'SELECT id, name, stock FROM dishes WHERE id = $1 AND status = 1';
      const dishResult = await pool.query(dishQuery, [item.id]);
      
      if (dishResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: `菜品不存在或已下架: ${item.name}` });
      }
      
      const dish = dishResult.rows[0];
      // 如果库存为null或0，表示无限库存
      if (dish.stock !== null && dish.stock > 0 && dish.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `${dish.name} 库存不足，当前库存: ${dish.stock}` 
        });
      }
    }

    // 构建查询语句
    const columns = [
      'items', 
      'total_price', 
      'customer_phone', 
      'order_type'
    ];
    const values = [
      JSON.stringify(items),
      total_price,
      customer_phone || '',
      orderTypeValue
    ];
    let placeholders = ['$1', '$2', '$3', '$4'];
    let paramIndex = 5;

    // 添加堂食特定字段
    if (order_type === 'dineIn') {
      columns.push('table_id');
      values.push(table_id);
      placeholders.push(`$${paramIndex}`);
      paramIndex++;
    }

    // 添加外卖特定字段
    if (order_type === 'takeout') {
      columns.push('user_id', 'restaurant_id', 'delivery_address', 'delivery_fee');
      values.push(user_id, restaurant_id, JSON.stringify(delivery_address), delivery_fee);
      placeholders.push(`$${paramIndex}`, `$${paramIndex + 1}`, `$${paramIndex + 2}`, `$${paramIndex + 3}`);
      paramIndex += 4;

      if (estimated_delivery_time) {
        columns.push('estimated_delivery_time');
        values.push(estimated_delivery_time);
        placeholders.push(`$${paramIndex}`);
      }
    }

    // 使用事务确保订单创建和库存扣减的一致性
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO orders (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      // 扣减库存
      for (const item of items) {
        // 只有当库存不为null且大于0时才扣减
        const updateStockQuery = `
          UPDATE dishes 
          SET stock = CASE 
            WHEN stock IS NULL OR stock = 0 THEN stock
            ELSE GREATEST(stock - $1, 0)
          END
          WHERE id = $2 AND stock IS NOT NULL AND stock > 0
        `;
        await client.query(updateStockQuery, [item.quantity, item.id]);
      }
      
      await client.query('COMMIT');
      client.release();
      
      // 记录订单创建事件
      eventTracker.trackBusinessEvent('order_created', user_id || null, {
        order_id: result.rows[0].id,
        table_id: table_id,
        total_price: total_price,
        item_count: items.length,
        order_type: orderTypeValue,
        items: items.map(item => ({
          dish_id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      });
      
      res.json({ success: true, data: result.rows[0], message: '订单创建成功' });
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      console.error('创建订单失败:', error);
      res.status(500).json({ success: false, message: '创建订单失败' });
    }
  } catch (error) {
    console.error('创建订单验证失败:', error);
    res.status(500).json({ success: false, message: '创建订单验证失败' });
  }
});

// 更新订单状态
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || (status !== 'new' && status !== 'done')) {
      return res.status(400).json({ success: false, message: '无效的订单状态' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 记录订单状态更新事件
    eventTracker.trackBusinessEvent('order_status_updated', null, {
      order_id: id,
      new_status: status
    });

    res.json({ success: true, data: result.rows[0], message: '订单状态更新成功' });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ success: false, message: '更新订单状态失败' });
  }
});

// 完成订单（快捷操作）
router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE orders SET status = \'done\', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = \'new\' RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在或已完成' });
    }

    // 记录订单完成事件
    eventTracker.trackBusinessEvent('order_completed', null, {
      order_id: id
    });

    res.json({ success: true, data: result.rows[0], message: '订单完成成功' });
  } catch (error) {
    console.error('完成订单失败:', error);
    res.status(500).json({ success: false, message: '完成订单失败' });
  }
});

// 获取今日统计
router.get('/stats/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 总订单数
    const totalOrdersResult = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE created_at >= $1',
      [today]
    );
    
    // 新订单数
    const newOrdersResult = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE created_at >= $1 AND status = \'new\'',
      [today]
    );
    
    // 总营收
    const revenueResult = await pool.query(
      'SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE created_at >= $1',
      [today]
    );
    
    const stats = {
      total_orders: parseInt(totalOrdersResult.rows[0].count),
      new_orders: parseInt(newOrdersResult.rows[0].count),
      total_revenue: parseFloat(revenueResult.rows[0].total)
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取今日统计失败:', error);
    res.status(500).json({ success: false, message: '获取今日统计失败' });
  }
});

module.exports = router;