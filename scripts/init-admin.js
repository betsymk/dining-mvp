// 初始化管理员账户脚本
const bcrypt = require('bcryptjs');
const pool = require('../server/database');

async function initAdmin() {
  try {
    // 密码：admin123
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const checkQuery = 'SELECT id FROM admin_users WHERE username = $1';
    const checkResult = await pool.query(checkQuery, ['admin']);

    if (checkResult.rows.length > 0) {
      console.log('✅ 管理员账户已存在，跳过创建');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      return;
    }

    const insertQuery = `
      INSERT INTO admin_users (username, password, nickname, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, nickname, role
    `;

    const result = await pool.query(insertQuery, [
      'admin',
      hashedPassword,
      '系统管理员',
      'admin'
    ]);

    console.log('✅ 默认管理员账户创建成功！');
    console.log('   ID:', result.rows[0].id);
    console.log('   用户名:', result.rows[0].username);
    console.log('   昵称:', result.rows[0].nickname);
    console.log('   角色:', result.rows[0].role);
    console.log('   登录密码:', password);
    console.log('\n⚠️  请在生产环境中立即修改默认密码！');
  } catch (error) {
    console.error('❌ 初始化管理员账户失败:', error);
  } finally {
    await pool.end();
  }
}

initAdmin();
