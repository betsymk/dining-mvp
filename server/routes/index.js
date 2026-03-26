// 路由主入口
const dishesRoutes = require('./dishes');
const ordersRoutes = require('./orders');
const paymentRoutes = require('./payment');
const authRoutes = require('./auth');
const healthRoutes = require('./health');
const addressesRoutes = require('./addresses');
const settingsRoutes = require('./settings');
const { authenticateToken } = require('./auth');

module.exports = (app) => {
  // 健康检查路由（无需登录）
  app.use('/api/health', healthRoutes);

  // 认证路由（无需登录）
  app.use('/api/auth', authRoutes);

  // 系统设置路由（需要登录）
  app.use('/api/settings', authenticateToken, settingsRoutes);

  // 菜品相关路由（需要登录）
  app.use('/api/dishes', authenticateToken, dishesRoutes);

  // 订单相关路由（需要登录）
  app.use('/api/orders', authenticateToken, ordersRoutes);

  // 地址管理路由（需要登录）
  app.use('/api/addresses', authenticateToken, addressesRoutes);

  // 支付相关路由（顾客端无需登录）
  app.use('/api/pay', paymentRoutes);
};
