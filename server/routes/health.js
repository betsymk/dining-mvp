// 健康检查API路由
const express = require('express');
const router = express.Router();
const { testConnection, getPoolStatus, pool } = require('../database');

/**
 * GET /api/health
 * 系统健康检查接口
 *
 * 响应格式:
 * {
 *   "status": "ok" | "degraded" | "error",
 *   "timestamp": "2026-03-22T00:00:00.000Z",
 *   "uptime": 123456,
 *   "version": "1.0.1",
 *   "checks": {
 *     "database": "healthy" | "unhealthy",
 *     "memory": {
 *       "heapUsed": "45 MB",
 *       "heapTotal": "70 MB",
 *       "external": "10 MB",
 *       "rss": "150 MB"
 *     },
 *     "pool": {
 *       "totalCount": 20,
 *       "idleCount": 10,
 *       "waitingCount": 0
 *     }
 *   }
 * }
 */
router.get('/', async (req, res) => {
  try {
    // 1. 检查数据库连接
    const dbHealthy = await testConnection();

    // 2. 获取内存使用情况
    const memoryUsage = process.memoryUsage();
    const memory = {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    };

    // 3. 获取连接池状态
    const poolStatus = getPoolStatus();

    // 4. 计算系统运行时间
    const uptime = process.uptime();

    // 5. 判断整体健康状态
    let status = 'ok';
    if (!dbHealthy) {
      status = 'error';
    } else if (memoryUsage.heapUsed > memoryUsage.heapTotal * 0.9) {
      status = 'degraded';
    } else if (poolStatus.waitingCount > 5) {
      status = 'degraded';
    }

    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      version: '1.0.1',
      hostname: require('os').hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      checks: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        memory,
        pool: poolStatus,
      },
    };

    // 根据健康状态返回不同的HTTP状态码
    const statusCode = status === 'ok' ? 200 : (status === 'degraded' ? 200 : 503);

    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('健康检查失败:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /api/health/db
 * 仅检查数据库连接
 */
router.get('/db', async (req, res) => {
  try {
    const isHealthy = await testConnection();

    if (isHealthy) {
      // 测试查询性能
      const start = Date.now();
      await pool.query('SELECT 1');
      const duration = Date.now() - start;

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        latency: `${duration}ms`,
        pool: getPoolStatus(),
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /api/health/memory
 * 仅检查内存使用
 */
router.get('/memory', (req, res) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapUsedPercentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%',
    },
    processUptime: Math.floor(process.uptime()),
    processUptimeFormatted: formatUptime(process.uptime()),
  });
});

/**
 * GET /api/health/pool
 * 仅检查连接池状态
 */
router.get('/pool', (req, res) => {
  const poolStatus = getPoolStatus();

  res.json({
    timestamp: new Date().toISOString(),
    pool: poolStatus,
    utilization: {
      idlePercentage: poolStatus.totalCount > 0
        ? ((poolStatus.idleCount / poolStatus.totalCount) * 100).toFixed(2) + '%'
        : '0%',
      waitingCount: poolStatus.waitingCount,
    },
  });
});

/**
 * 格式化运行时间
 * @param {number} seconds - 运行秒数
 * @returns {string} 格式化后的时间
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分钟 ${secs}秒`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟 ${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分钟 ${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

module.exports = router;
