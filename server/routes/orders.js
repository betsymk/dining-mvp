// 订单路由
const express = require('express');
const router = express.Router();
const pool = require('../database');

// 获取所有订单
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM orders ORDER BY created_at DESC';
    const params = [];

    if (status) {
      query = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
      params.push(status);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ success: false, message: '获取订单列表失败' });
  }
});

// 获取今日订单统计
router.get('/stats/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_price), 0) as total_revenue,
        COUNT(*) FILTER (WHERE status = 'new') as new_orders,
        COUNT(*) FILTER (WHERE status = 'done') as completed_orders
      FROM orders
      WHERE created_at >= $1
    `;

    const result = await pool.query(query, [today]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('获取今日统计失败:', error);
    res.status(500).json({ success: false, message: '获取今日统计失败' });
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
    const { table_id, items, total_price, customer_phone, order_type } = req.body;

    if (!table_id || !items || items.length === 0 || !total_price) {
      return res.status(400).json({ success: false, message: '订单信息不完整' });
    }

    const query = `
      INSERT INTO orders (table_id, items, total_price, customer_phone, order_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      table_id,
      JSON.stringify(items),
      total_price,
      customer_phone || '',
      order_type !== undefined ? order_type : 0
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0], message: '订单创建成功' });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ success: false, message: '创建订单失败' });
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

    const query = `
      UPDATE orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    res.json({ success: true, data: result.rows[0], message: '订单状态更新成功' });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ success: false, message: '更新订单状态失败' });
  }
});

// 标记订单为完成
router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['done', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    res.json({ success: true, data: result.rows[0], message: '订单已完成' });
  } catch (error) {
    console.error('完成订单失败:', error);
    res.status(500).json({ success: false, message: '完成订单失败' });
  }
});

module.exports = router;
