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

module.exports = pool;
