// 路由主入口
const dishesRoutes = require('./dishes');
const ordersRoutes = require('./orders');
const paymentRoutes = require('./payment');
const authRoutes = require('./auth');
const { authenticateToken } = require('./auth');

module.exports = (app) => {
  // 认证路由（无需登录）
  app.use('/api/auth', authRoutes);

  // 菜品相关路由（需要登录）
  app.use('/api/dishes', authenticateToken, dishesRoutes);

  // 订单相关路由（需要登录）
  app.use('/api/orders', authenticateToken, ordersRoutes);

  // 支付相关路由（顾客端无需登录）
  app.use('/api/pay', paymentRoutes);
};
