// 支付路由
const express = require('express');
const router = express.Router();
const pool = require('../database');

// 模拟支付接口
router.post('/mock', async (req, res) => {
  try {
    const { order_id, amount } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ success: false, message: '缺少订单ID或金额' });
    }

    // 模拟支付处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 验证订单是否存在
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = orderResult.rows[0];

    // 验证金额是否匹配
    if (parseFloat(amount) !== parseFloat(order.total_price)) {
      return res.status(400).json({ success: false, message: '订单金额不匹配' });
    }

    // 支付成功，返回支付结果
    const paymentResult = {
      success: true,
      order_id: order.id,
      amount: order.total_price,
      payment_time: new Date().toISOString(),
      transaction_id: 'MOCK_' + Date.now(),
      method: 'mock'
    };

    res.json({
      success: true,
      data: paymentResult,
      message: '支付成功'
    });
  } catch (error) {
    console.error('支付处理失败:', error);
    res.status(500).json({ success: false, message: '支付处理失败' });
  }
});

// 获取支付状态（模拟）
router.get('/status/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 模拟支付成功状态
    res.json({
      success: true,
      data: {
        order_id,
        paid: true,
        payment_time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取支付状态失败:', error);
    res.status(500).json({ success: false, message: '获取支付状态失败' });
  }
});

module.exports = router;
