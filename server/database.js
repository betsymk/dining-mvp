// 数据库连接配置
const { Pool } = require('pg');

// 检查必要的环境变量
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ 缺少必要的环境变量:', missingVars.join(', '));
  console.error('请复制 .env.example 为 .env 并填写数据库配置');
  console.error('示例: cp .env.example .env && 编辑 .env 文件');
  process.exit(1);
}

// 配置连接池 - 请从环境变量读取配置
// 参考 .env.example 文件配置数据库连接信息
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 测试数据库连接
pool.on('connect', () => {
  console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接错误:', err);
});

// ============================================
// 查询性能监控
// ============================================

// 包装pool.query方法，添加慢查询日志
const originalQuery = pool.query.bind(pool);
pool.query = function(text, params, callback) {
  const startTime = Date.now();

  // 支持callback和Promise两种调用方式
  if (typeof params === 'function') {
    callback = params;
    params = undefined;
  }

  const logQuery = () => {
    const duration = Date.now() - startTime;
    const formattedParams = params ? JSON.stringify(params, null, 2).substring(0, 200) : 'N/A';
    const queryText = text.substring(0, 200);

    // 记录慢查询（> 1秒）
    if (duration > 1000) {
      console.error('⚠️  慢查询警告:');
      console.error(`   SQL: ${queryText}`);
      console.error(`   参数: ${formattedParams}`);
      console.error(`   执行时间: ${duration}ms`);
      console.error('');
    } else if (duration > 500) {
      // 记录较慢查询（> 500ms）作为警告
      console.warn(`⚡ 查询耗时: ${duration}ms`);
      console.warn(`   SQL: ${queryText}`);
      console.warn('');
    } else {
      // 可选：记录所有查询（调试用）
      // console.log(`✓ 查询耗时: ${duration}ms`);
    }
  };

  try {
    const promise = originalQuery(text, params, callback);

    // 如果是Promise，添加处理
    if (promise && typeof promise.then === 'function') {
      return promise
        .then(result => {
          logQuery();
          return result;
        })
        .catch(error => {
          logQuery();
          throw error;
        });
    }

    return promise;
  } catch (error) {
    logQuery();
    throw error;
  }
};

// ============================================
// 连接池健康检查
// ============================================

/**
 * 测试数据库连接是否正常
 * @returns {Promise<boolean>} 连接状态
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as now');
      console.log('🔍 数据库连接测试成功:', result.rows[0].now);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error.message);
    return false;
  }
}

/**
 * 定期健康检查（每30秒）
 */
async function startHealthCheck() {
  console.log('🔄 启动数据库健康检查（每30秒）');

  setInterval(async () => {
    const isHealthy = await testConnection();
    if (!isHealthy) {
      console.warn('⚠️  数据库连接异常，尝试重新连接...');
    }
  }, 30000);
}

/**
 * 获取连接池状态
 * @returns {Object} 连接池状态信息
 */
function getPoolStatus() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

// 启动健康检查（可选，由应用控制）
// startHealthCheck();

module.exports = {
  pool,
  testConnection,
  startHealthCheck,
  getPoolStatus,
};

// 保持向后兼容
module.exports = pool;
module.exports.pool = pool;
module.exports.testConnection = testConnection;
module.exports.startHealthCheck = startHealthCheck;
module.exports.getPoolStatus = getPoolStatus;
