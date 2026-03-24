// H5点餐系统 - 服务器主文件
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const bodyparser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyparser.json({ limit: '10mb' }));
app.use(bodyparser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '..')));

// API路由
require('./routes')(app);

// 前端路由 - 顾客端
app.get('/client', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/client/menu', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/menu.html'));
});

app.get('/client/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/cart.html'));
});

app.get('/client/order', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/order.html'));
});

// 前端路由 - 管理后台
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   H5点餐系统 MVP 服务器已启动       ║
  ╠══════════════════════════════════════╣
  ║   服务地址: http://localhost:${PORT}    ║
  ║   顾客端:   http://localhost:${PORT}/client  ║
  ║   管理端:   http://localhost:${PORT}/admin   ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
