// 路由主入口
const dishesRoutes = require('./dishes');
const ordersRoutes = require('./orders');
const paymentRoutes = require('./payment');

module.exports = (app) => {
  // 菜品相关路由
  app.use('/api/dishes', dishesRoutes);

  // 订单相关路由
  app.use('/api/orders', ordersRoutes);

  // 支付相关路由
  app.use('/api/pay', paymentRoutes);
};
