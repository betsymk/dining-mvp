const express = require('express');
const pool = require('../database');

const router = express.Router();

// 获取所有设置
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value, description FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      // 尝试解析JSON，如果失败则返回原始字符串
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch (e) {
        settings[row.setting_key] = row.setting_value;
      }
    });
    res.json(settings);
  } catch (err) {
    console.error('获取设置失败:', err);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 更新设置
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // 验证输入
    if (value === undefined) {
      return res.status(400).json({ error: '缺少value参数' });
    }
    
    // 转换为字符串存储
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    const result = await pool.query(
      'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2 RETURNING *',
      [stringValue, key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '设置项不存在' });
    }
    
    res.json({ success: true, message: '设置更新成功' });
  } catch (err) {
    console.error('更新设置失败:', err);
    res.status(500).json({ error: '更新设置失败' });
  }
});

// 检查当前是否在营业时间内
router.get('/business-status', async (req, res) => {
  try {
    // 获取营业时间设置
    const settingsResult = await pool.query(
      'SELECT setting_key, setting_value FROM settings WHERE setting_key IN ($1, $2)',
      ['business_hours', 'is_business_enabled']
    );
    
    const settings = {};
    settingsResult.rows.forEach(row => {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch (e) {
        settings[row.setting_key] = row.setting_value;
      }
    });
    
    // 如果未启用营业时间控制，始终返回营业中
    if (settings.is_business_enabled !== true && settings.is_business_enabled !== 'true') {
      return res.json({ 
        isBusinessHours: true, 
        message: '营业中', 
        hours: settings.business_hours || [] 
      });
    }
    
    // 检查当前时间是否在营业时间内
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM格式
    
    let isBusinessHours = false;
    const businessHours = Array.isArray(settings.business_hours) ? settings.business_hours : [];
    
    for (const period of businessHours) {
      if (period.start && period.end) {
        if (currentTime >= period.start && currentTime <= period.end) {
          isBusinessHours = true;
          break;
        }
      }
    }
    
    res.json({ 
      isBusinessHours, 
      message: isBusinessHours ? '营业中' : '休息中', 
      hours: businessHours,
      currentTime 
    });
  } catch (err) {
    console.error('检查营业状态失败:', err);
    // 出错时默认返回营业中，避免影响正常使用
    res.json({ 
      isBusinessHours: true, 
      message: '营业中', 
      hours: [], 
      currentTime: new Date().toTimeString().substring(0, 5)
    });
  }
});

module.exports = router;