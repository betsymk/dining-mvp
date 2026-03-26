// 菜品路由
const express = require('express');
const router = express.Router();
const pool = require('../database');
const { eventTracker } = require('../middleware/eventTracker');

// 获取所有菜品
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM dishes WHERE status = 1 ORDER BY category, id';
    const params = [];

    if (category !== undefined) {
      query = 'SELECT * FROM dishes WHERE status = 1 AND category = $1 ORDER BY id';
      params.push(category);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取菜品列表失败:', error);
    res.status(500).json({ success: false, message: '获取菜品列表失败' });
  }
});

// 获取单个菜品
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM dishes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '菜品不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('获取菜品详情失败:', error);
    res.status(500).json({ success: false, message: '获取菜品详情失败' });
  }
});

// 创建菜品
router.post('/', async (req, res) => {
  try {
    const { name, price, description, image_url, category, status } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: '菜品名称和价格不能为空' });
    }

    const stock = req.body.stock !== undefined ? parseInt(req.body.stock) : 100;
    
    const query = `
      INSERT INTO dishes (name, price, description, image_url, category, status, stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      name,
      price,
      description || '',
      image_url || '',
      category !== undefined ? category : 0,
      status !== undefined ? status : 1,
      stock
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0], message: '菜品创建成功' });
  } catch (error) {
    console.error('创建菜品失败:', error);
    res.status(500).json({ success: false, message: '创建菜品失败' });
  }
});

// 更新菜品
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, image_url, category, status, stock } = req.body;

    const query = `
      UPDATE dishes
      SET name = $1, price = $2, description = $3, image_url = $4, category = $5, status = $6, stock = $7
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      name,
      price,
      description,
      image_url,
      category,
      status,
      stock !== undefined ? parseInt(stock) : null,
      id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '菜品不存在' });
    }

    res.json({ success: true, data: result.rows[0], message: '菜品更新成功' });
  } catch (error) {
    console.error('更新菜品失败:', error);
    res.status(500).json({ success: false, message: '更新菜品失败' });
  }
});

// 删除菜品（软删除）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE dishes SET status = 0 WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '菜品不存在' });
    }

    res.json({ success: true, message: '菜品删除成功' });
  } catch (error) {
    console.error('删除菜品失败:', error);
    res.status(500).json({ success: false, message: '删除菜品失败' });
  }
});

module.exports = router;
