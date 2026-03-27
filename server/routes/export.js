const express = require('express');
const pool = require('../database');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 生成CSV格式的订单数据
function generateCSV(orders) {
  if (orders.length === 0) {
    return '订单ID,桌号,订单类型,总价,状态,创建时间,更新时间\n';
  }
  
  const headers = ['订单ID', '桌号', '订单类型', '总价', '状态', '创建时间', '更新时间'];
  let csv = headers.join(',') + '\n';
  
  orders.forEach(order => {
    // 订单类型转换
    const orderTypeMap = { '0': '到店', '1': '外卖', '2': '预制菜' };
    const orderTypeText = orderTypeMap[order.order_type] || order.order_type;
    
    // 状态转换
    const statusMap = { 'new': '新订单', 'done': '已完成' };
    const statusText = statusMap[order.status] || order.status;
    
    // 转义CSV特殊字符
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
    
    const row = [
      escapeCsv(order.id),
      escapeCsv(order.table_id),
      escapeCsv(orderTypeText),
      escapeCsv(order.total_price),
      escapeCsv(statusText),
      escapeCsv(order.created_at),
      escapeCsv(order.updated_at)
    ];
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

// 导出订单数据为CSV
router.get('/orders/csv', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = `
      SELECT id, table_id, order_type, total_price, status, 
             created_at, updated_at 
      FROM orders 
    `;
    const params = [];
    const conditions = [];
    
    // 日期范围过滤
    if (startDate) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(endDate);
    }
    
    // 状态过滤
    if (status && ['new', 'done'].includes(status)) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    const csvData = generateCSV(result.rows);
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv');
    
    res.send(csvData);
  } catch (err) {
    console.error('导出订单CSV失败:', err);
    res.status(500).json({ error: '导出订单数据失败' });
  }
});

// 获取订单统计信息（用于前端展示）
router.get('/orders/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_price) as total_revenue,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN order_type = '0' THEN 1 END) as dine_in_orders,
        COUNT(CASE WHEN order_type = '1' THEN 1 END) as delivery_orders,
        COUNT(CASE WHEN order_type = '2' THEN 1 END) as prepackaged_orders
      FROM orders
    `;
    const params = [];
    const conditions = [];
    
    if (startDate) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(endDate);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('获取订单统计失败:', err);
    res.status(500).json({ error: '获取订单统计失败' });
  }
});

module.exports = router;