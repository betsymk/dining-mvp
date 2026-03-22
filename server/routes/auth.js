// 认证路由
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'dining-mvp-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

// 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 查询管理员
    const query = 'SELECT * FROM admin_users WHERE username = $1';
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const user = result.rows[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await pool.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // 生成JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname || user.username,
          role: user.role
        }
      },
      message: '登录成功'
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 验证token
router.post('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      valid: true
    }
  });
});

// 登出（客户端清除token即可）
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 创建管理员（需要super_admin权限）
router.post('/create-admin', authenticateToken, checkRole('super_admin'), async (req, res) => {
  try {
    const { username, password, nickname, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ success: false, message: '无效的角色' });
    }

    // 检查用户名是否已存在
    const checkQuery = 'SELECT id FROM admin_users WHERE username = $1';
    const checkResult = await pool.query(checkQuery, [username]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员
    const insertQuery = `
      INSERT INTO admin_users (username, password, nickname, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, nickname, role, created_at
    `;

    const result = await pool.query(insertQuery, [
      username,
      hashedPassword,
      nickname || username,
      role || 'admin'
    ]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '管理员创建成功'
    });
  } catch (error) {
    console.error('创建管理员失败:', error);
    res.status(500).json({ success: false, message: '创建管理员失败' });
  }
});

// 修改密码
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '旧密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码长度至少6位' });
    }

    // 获取当前用户
    const query = 'SELECT * FROM admin_users WHERE id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const user = result.rows[0];

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: '旧密码错误' });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    const updateQuery = `
      UPDATE admin_users
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, updated_at
    `;

    const updateResult = await pool.query(updateQuery, [hashedPassword, userId]);

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ success: false, message: '修改密码失败' });
  }
});

// 获取管理员列表（需要admin权限）
router.get('/list', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const query = `
      SELECT id, username, nickname, role, last_login, created_at
      FROM admin_users
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    res.status(500).json({ success: false, message: '获取管理员列表失败' });
  }
});

// 认证中间件：验证JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证token' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '无效或过期的token' });
    }

    req.user = user;
    next();
  });
}

// 角色检查中间件
function checkRole(requiredRole) {
  return (req, res, next) => {
    const userRole = req.user && req.user.role;

    if (!userRole) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    // super_admin拥有所有权限
    if (userRole === 'super_admin') {
      return next();
    }

    // 检查角色是否匹配
    if (userRole !== requiredRole) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }

    next();
  };
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.checkRole = checkRole;
