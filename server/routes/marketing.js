const express = require('express');
const pool = require('../database');

const router = express.Router();

// 获取所有优惠券
router.get('/coupons', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM coupons WHERE status = 1 ORDER BY created_at DESC';
    const params = [];
    
    if (status !== undefined) {
      query = 'SELECT * FROM coupons ORDER BY created_at DESC';
    }
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('获取优惠券失败:', err);
    res.status(500).json({ error: '获取优惠券失败' });
  }
});

// 获取所有满减活动
router.get('/promotions', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM promotions WHERE status = 1 ORDER BY created_at DESC';
    const params = [];
    
    if (status !== undefined) {
      query = 'SELECT * FROM promotions ORDER BY created_at DESC';
    }
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('获取满减活动失败:', err);
    res.status(500).json({ error: '获取满减活动失败' });
  }
});

// 验证优惠券
router.post('/coupons/validate', async (req, res) => {
  try {
    const { code, totalAmount } = req.body;
    
    if (!code || totalAmount === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const result = await pool.query(
      'SELECT * FROM coupons WHERE code = $1 AND status = 1',
      [code.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: false, 
        message: '优惠券不存在或已失效',
        discount: 0,
        finalAmount: totalAmount
      });
    }
    
    const coupon = result.rows[0];
    
    // 检查时间有效性
    const now = new Date();
    if (coupon.start_time && now < new Date(coupon.start_time)) {
      return res.json({ 
        success: false, 
        message: '优惠券尚未生效',
        discount: 0,
        finalAmount: totalAmount
      });
    }
    
    if (coupon.end_time && now > new Date(coupon.end_time)) {
      return res.json({ 
        success: false, 
        message: '优惠券已过期',
        discount: 0,
        finalAmount: totalAmount
      });
    }
    
    // 检查使用次数限制
    if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
      return res.json({ 
        success: false, 
        message: '优惠券已达到使用次数上限',
        discount: 0,
        finalAmount: totalAmount
      });
    }
    
    // 检查最低消费金额
    if (totalAmount < coupon.min_amount) {
      return res.json({ 
        success: false, 
        message: `订单金额需满¥${coupon.min_amount}才能使用此优惠券`,
        discount: 0,
        finalAmount: totalAmount
      });
    }
    
    let discount = 0;
    if (coupon.type === 0) {
      // 固定金额减免
      discount = Math.min(coupon.value, totalAmount);
    } else if (coupon.type === 1) {
      // 折扣
      const calculatedDiscount = totalAmount - (totalAmount * coupon.value);
      discount = coupon.max_discount ? 
        Math.min(calculatedDiscount, coupon.max_discount) : 
        calculatedDiscount;
    }
    
    const finalAmount = totalAmount - discount;
    
    res.json({ 
      success: true, 
      message: '优惠券验证成功',
      coupon: {
        id: coupon.id,
        name: coupon.name,
        code: coupon.code
      },
      discount: parseFloat(discount.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2))
    });
  } catch (err) {
    console.error('验证优惠券失败:', err);
    res.status(500).json({ error: '验证优惠券失败' });
  }
});

// 计算满减优惠
router.post('/promotions/calculate', async (req, res) => {
  try {
    const { totalAmount } = req.body;
    
    if (totalAmount === undefined) {
      return res.status(400).json({ success: false, message: '缺少订单金额参数' });
    }
    
    const result = await pool.query(
      'SELECT * FROM promotions WHERE status = 1 AND ($1 >= min_amount) ORDER BY discount_amount DESC LIMIT 1',
      [totalAmount]
    );
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: false, 
        message: '未达到满减条件',
        discount: 0,
        finalAmount: totalAmount
      });
    }
    
    const promotion = result.rows[0];
    const discount = promotion.discount_amount;
    const finalAmount = totalAmount - discount;
    
    res.json({ 
      success: true, 
      message: '满减计算成功',
      promotion: {
        id: promotion.id,
        name: promotion.name
      },
      discount: parseFloat(discount.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2))
    });
  } catch (err) {
    console.error('计算满减失败:', err);
    res.status(500).json({ error: '计算满减失败' });
  }
});

// 管理员：创建优惠券
router.post('/admin/coupons', async (req, res) => {
  try {
    const { code, name, type, value, min_amount, max_discount, usage_limit, start_time, end_time } = req.body;
    
    if (!code || !name || type === undefined || value === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const result = await pool.query(
      `INSERT INTO coupons (code, name, type, value, min_amount, max_discount, usage_limit, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [code.toUpperCase(), name, type, value, min_amount || 0, max_discount || null, usage_limit || 0, start_time || null, end_time || null]
    );
    
    res.json({ success: true, data: result.rows[0], message: '优惠券创建成功' });
  } catch (err) {
    console.error('创建优惠券失败:', err);
    if (err.code === '23505') { // 唯一约束冲突
      return res.status(400).json({ success: false, message: '优惠券码已存在' });
    }
    res.status(500).json({ success: false, message: '创建优惠券失败' });
  }
});

// 管理员：创建满减活动
router.post('/admin/promotions', async (req, res) => {
  try {
    const { name, min_amount, discount_amount, start_time, end_time } = req.body;
    
    if (!name || min_amount === undefined || discount_amount === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const result = await pool.query(
      `INSERT INTO promotions (name, min_amount, discount_amount, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, min_amount, discount_amount, start_time || null, end_time || null]
    );
    
    res.json({ success: true, data: result.rows[0], message: '满减活动创建成功' });
  } catch (err) {
    console.error('创建满减活动失败:', err);
    res.status(500).json({ success: false, message: '创建满减活动失败' });
  }
});

// 管理员：更新优惠券状态
router.put('/admin/coupons/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (status === undefined) {
      return res.status(400).json({ success: false, message: '缺少状态参数' });
    }
    
    const result = await pool.query(
      'UPDATE coupons SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '优惠券不存在' });
    }
    
    res.json({ success: true, data: result.rows[0], message: '优惠券状态更新成功' });
  } catch (err) {
    console.error('更新优惠券状态失败:', err);
    res.status(500).json({ success: false, message: '更新优惠券状态失败' });
  }
});

// 管理员：更新满减活动状态
router.put('/admin/promotions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (status === undefined) {
      return res.status(400).json({ success: false, message: '缺少状态参数' });
    }
    
    const result = await pool.query(
      'UPDATE promotions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '满减活动不存在' });
    }
    
    res.json({ success: true, data: result.rows[0], message: '满减活动状态更新成功' });
  } catch (err) {
    console.error('更新满减活动状态失败:', err);
    res.status(500).json({ success: false, message: '更新满减活动状态失败' });
  }
});

module.exports = router;