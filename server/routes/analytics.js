const express = require('express');
const pool = require('../database');

const router = express.Router();

// 销售数据分析API
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    
    // 默认时间范围：最近30天
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const start = startDate || defaultStartDate.toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    let query;
    const params = [start, end];
    
    // 根据分组方式构建查询
    if (groupBy === 'week') {
      query = `
        SELECT 
          DATE_TRUNC('week', date) as period,
          SUM(total_orders) as total_orders,
          SUM(total_revenue) as total_revenue,
          AVG(avg_order_value) as avg_order_value,
          SUM(dine_in_orders) as dine_in_orders,
          SUM(delivery_orders) as delivery_orders,
          SUM(prepackaged_orders) as prepackaged_orders
        FROM daily_sales_summary 
        WHERE date >= $1 AND date <= $2
        GROUP BY DATE_TRUNC('week', date)
        ORDER BY period DESC
      `;
    } else if (groupBy === 'month') {
      query = `
        SELECT 
          DATE_TRUNC('month', date) as period,
          SUM(total_orders) as total_orders,
          SUM(total_revenue) as total_revenue,
          AVG(avg_order_value) as avg_order_value,
          SUM(dine_in_orders) as dine_in_orders,
          SUM(delivery_orders) as delivery_orders,
          SUM(prepackaged_orders) as prepackaged_orders
        FROM daily_sales_summary 
        WHERE date >= $1 AND date <= $2
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY period DESC
      `;
    } else {
      // 默认按天分组
      query = `
        SELECT 
          date as period,
          total_orders,
          total_revenue,
          avg_order_value,
          dine_in_orders,
          delivery_orders,
          prepackaged_orders
        FROM daily_sales_summary 
        WHERE date >= $1 AND date <= $2
        ORDER BY date DESC
      `;
    }
    
    const result = await pool.query(query, params);
    
    // 计算增长率等衍生指标
    const salesData = result.rows.map((row, index, arr) => {
      let growthRate = null;
      if (index < arr.length - 1) {
        const currentRevenue = parseFloat(row.total_revenue);
        const previousRevenue = parseFloat(arr[index + 1].total_revenue);
        if (previousRevenue > 0) {
          growthRate = ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2);
        }
      }
      
      return {
        ...row,
        revenue_growth_rate: growthRate,
        period: row.period.toISOString().split('T')[0]
      };
    });
    
    res.json({ success: true, data: salesData });
  } catch (err) {
    console.error('获取销售数据失败:', err);
    res.status(500).json({ error: '获取销售数据失败' });
  }
});

// 客户数据分析API
router.get('/customers', async (req, res) => {
  try {
    const { activityStatus, limit } = req.query;
    const limitValue = Math.min(parseInt(limit) || 20, 100);
    
    let query = `
      SELECT 
        customer_identifier,
        total_visits,
        total_spent,
        avg_visit_frequency_days,
        last_visit_date,
        CASE 
          WHEN last_visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN 'active'
          WHEN last_visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'recent'
          ELSE 'inactive'
        END as activity_status
      FROM customer_insights
      WHERE last_visit_date IS NOT NULL
    `;
    const params = [];
    
    if (activityStatus) {
      if (activityStatus === 'active') {
        query += ` AND last_visit_date >= CURRENT_DATE - INTERVAL '7 days'`;
      } else if (activityStatus === 'recent') {
        query += ` AND last_visit_date >= CURRENT_DATE - INTERVAL '30 days' AND last_visit_date < CURRENT_DATE - INTERVAL '7 days'`;
      } else if (activityStatus === 'inactive') {
        query += ` AND last_visit_date < CURRENT_DATE - INTERVAL '30 days'`;
      }
    }
    
    query += ` ORDER BY total_spent DESC LIMIT $${params.length + 1}`;
    params.push(limitValue);
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('获取客户数据失败:', err);
    res.status(500).json({ error: '获取客户数据失败' });
  }
});

// 运营指标API
router.get('/operations', async (req, res) => {
  try {
    const { metricName, startDate, endDate } = req.query;
    
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const start = startDate || defaultStartDate.toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    let query = `
      SELECT 
        metric_date,
        metric_name,
        metric_value,
        metric_unit
      FROM operational_metrics
      WHERE metric_date >= $1 AND metric_date <= $2
    `;
    const params = [start, end];
    
    if (metricName) {
      query += ` AND metric_name = $${params.length + 1}`;
      params.push(metricName);
    }
    
    query += ` ORDER BY metric_date DESC`;
    
    const result = await pool.query(query, params);
    
    // 按指标名称分组整理数据
    const metricsByType = {};
    result.rows.forEach(row => {
      if (!metricsByType[row.metric_name]) {
        metricsByType[row.metric_name] = [];
      }
      metricsByType[row.metric_name].push({
        date: row.metric_date.toISOString().split('T')[0],
        value: parseFloat(row.metric_value),
        unit: row.metric_unit
      });
    });
    
    res.json({ success: true, data: metricsByType });
  } catch (err) {
    console.error('获取运营指标失败:', err);
    res.status(500).json({ error: '获取运营指标失败' });
  }
});

// 获取关键业务指标摘要
router.get('/summary', async (req, res) => {
  try {
    // 获取今日销售数据
    const today = new Date().toISOString().split('T')[0];
    const todayQuery = `
      SELECT 
        COALESCE(total_orders, 0) as today_orders,
        COALESCE(total_revenue, 0) as today_revenue,
        COALESCE(avg_order_value, 0) as today_avg_order_value
      FROM daily_sales_summary 
      WHERE date = $1
    `;
    const todayResult = await pool.query(todayQuery, [today]);
    const todayData = todayResult.rows[0] || { today_orders: 0, today_revenue: 0, today_avg_order_value: 0 };
    
    // 获取昨日销售数据用于对比
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayQuery = `
      SELECT 
        COALESCE(total_revenue, 0) as yesterday_revenue
      FROM daily_sales_summary 
      WHERE date = $1
    `;
    const yesterdayResult = await pool.query(yesterdayQuery, [yesterdayStr]);
    const yesterdayData = yesterdayResult.rows[0] || { yesterday_revenue: 0 };
    
    // 计算今日增长率
    const todayGrowth = yesterdayData.yesterday_revenue > 0 
      ? ((todayData.today_revenue - yesterdayData.yesterday_revenue) / yesterdayData.yesterday_revenue * 100).toFixed(2)
      : null;
    
    // 获取活跃客户数（最近7天有访问的客户）
    const activeCustomersQuery = `
      SELECT COUNT(*) as active_customers
      FROM customer_insights
      WHERE last_visit_date >= CURRENT_DATE - INTERVAL '7 days'
    `;
    const activeCustomersResult = await pool.query(activeCustomersQuery);
    const activeCustomers = parseInt(activeCustomersResult.rows[0].active_customers) || 0;
    
    // 获取待处理订单数
    const pendingOrdersQuery = `
      SELECT COUNT(*) as pending_orders
      FROM orders
      WHERE status = 'new'
    `;
    const pendingOrdersResult = await pool.query(pendingOrdersQuery);
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].pending_orders) || 0;
    
    const summary = {
      ...todayData,
      today_growth_rate: todayGrowth,
      active_customers: activeCustomers,
      pending_orders: pendingOrders,
      updated_at: new Date().toISOString()
    };
    
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('获取数据摘要失败:', err);
    res.status(500).json({ error: '获取数据摘要失败' });
  }
});

module.exports = router;