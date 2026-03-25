const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 验证JWT token中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// 计算两点间距离（米）
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // 地球半径（米）
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

// 获取用户地址列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT id, user_id, name, phone, province, city, district, address_detail, 
              postal_code, is_default, longitude, latitude, delivery_range_valid, 
              created_at, updated_at
       FROM addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM addresses WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({
      addresses: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// 创建新地址
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name,
      phone,
      province,
      city,
      district,
      addressDetail,
      postalCode,
      coordinates,
      isDefault = false
    } = req.body;

    // 验证必填字段
    if (!name || !phone || !province || !city || !district || !addressDetail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!coordinates || typeof coordinates.longitude !== 'number' || typeof coordinates.latitude !== 'number') {
      return res.status(400).json({ error: 'Valid coordinates required' });
    }

    await client.query('BEGIN');

    // 如果设置为默认地址，先将其他地址的is_default设为false
    if (isDefault) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.userId]
      );
    }

    const result = await client.query(
      `INSERT INTO addresses (user_id, name, phone, province, city, district, address_detail, 
                              postal_code, is_default, longitude, latitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, user_id, name, phone, province, city, district, address_detail, 
                postal_code, is_default, longitude, latitude, delivery_range_valid, 
                created_at, updated_at`,
      [
        req.user.userId,
        name,
        phone,
        province,
        city,
        district,
        addressDetail,
        postalCode || null,
        isDefault,
        coordinates.longitude,
        coordinates.latitude
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating address:', error);
    res.status(500).json({ error: 'Failed to create address' });
  } finally {
    client.release();
  }
});

// 更新地址
router.put('/:addressId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const addressId = parseInt(req.params.addressId);
    const {
      name,
      phone,
      province,
      city,
      district,
      addressDetail,
      postalCode,
      coordinates,
      isDefault = false
    } = req.body;

    // 验证地址是否存在且属于当前用户
    const existingAddress = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.userId]
    );

    if (existingAddress.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // 验证必填字段
    if (!name || !phone || !province || !city || !district || !addressDetail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!coordinates || typeof coordinates.longitude !== 'number' || typeof coordinates.latitude !== 'number') {
      return res.status(400).json({ error: 'Valid coordinates required' });
    }

    await client.query('BEGIN');

    // 如果设置为默认地址，先将其他地址的is_default设为false
    if (isDefault) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.userId]
      );
    }

    const result = await client.query(
      `UPDATE addresses 
       SET name = $1, phone = $2, province = $3, city = $4, district = $5, 
           address_detail = $6, postal_code = $7, is_default = $8, 
           longitude = $9, latitude = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12
       RETURNING id, user_id, name, phone, province, city, district, address_detail, 
                postal_code, is_default, longitude, latitude, delivery_range_valid, 
                created_at, updated_at`,
      [
        name,
        phone,
        province,
        city,
        district,
        addressDetail,
        postalCode || null,
        isDefault,
        coordinates.longitude,
        coordinates.latitude,
        addressId,
        req.user.userId
      ]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'Failed to update address' });
  } finally {
    client.release();
  }
});

// 删除地址
router.delete('/:addressId', authenticateToken, async (req, res) => {
  try {
    const addressId = parseInt(req.params.addressId);

    // 验证地址是否存在且属于当前用户
    const existingAddress = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.userId]
    );

    if (existingAddress.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await pool.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [
      addressId,
      req.user.userId
    ]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// 验证配送范围
router.post('/validate-delivery', authenticateToken, async (req, res) => {
  try {
    const { restaurantId, coordinates } = req.body;

    if (!restaurantId || !coordinates) {
      return res.status(400).json({ error: 'restaurantId and coordinates are required' });
    }

    if (typeof coordinates.longitude !== 'number' || typeof coordinates.latitude !== 'number') {
      return res.status(400).json({ error: 'Valid coordinates required' });
    }

    // 获取餐厅信息
    const restaurantResult = await pool.query(
      'SELECT id, name, longitude, latitude, delivery_radius, delivery_fee FROM restaurants WHERE id = $1',
      [restaurantId]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurant = restaurantResult.rows[0];
    const distance = calculateDistance(
      restaurant.latitude,
      restaurant.longitude,
      coordinates.latitude,
      coordinates.longitude
    );

    const isValid = distance <= restaurant.delivery_radius;
    const deliveryFee = isValid ? restaurant.delivery_fee : null;

    res.json({
      valid: isValid,
      distance: Math.round(distance),
      deliveryFee: deliveryFee,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        deliveryRadius: restaurant.delivery_radius
      }
    });
  } catch (error) {
    console.error('Error validating delivery range:', error);
    res.status(500).json({ error: 'Failed to validate delivery range' });
  }
});

// 设置默认地址
router.post('/:addressId/set-default', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const addressId = parseInt(req.params.addressId);

    // 验证地址是否存在且属于当前用户
    const existingAddress = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.userId]
    );

    if (existingAddress.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await client.query('BEGIN');

    // 将其他地址的is_default设为false
    await client.query(
      'UPDATE addresses SET is_default = false WHERE user_id = $1',
      [req.user.userId]
    );

    // 将当前地址设为默认
    await client.query(
      'UPDATE addresses SET is_default = true WHERE id = $1',
      [addressId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Default address updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting default address:', error);
    res.status(500).json({ error: 'Failed to set default address' });
  } finally {
    client.release();
  }
});

module.exports = router;