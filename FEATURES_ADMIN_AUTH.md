# 管理后台登录认证功能

## 📋 功能概述

为餐饮点餐系统的管理后台添加了完整的登录认证功能，确保只有授权的管理员才能访问管理后台。

## 🔐 核心功能

### 1. 用户认证系统
- ✅ JWT token 认证
- ✅ bcrypt 密码加密
- ✅ 管理员登录/登出
- ✅ Token 自动验证
- ✅ 角色权限管理（admin、super_admin）

### 2. 管理员管理
- ✅ 创建管理员账户
- ✅ 修改管理员密码
- ✅ 管理员列表查询
- ✅ 角色权限控制

### 3. 安全特性
- ✅ 密码加密存储（bcrypt）
- ✅ Token 过期机制（24小时）
- ✅ API 路由保护
- ✅ 前端自动登录检查
- ✅ Token 失效自动跳转

### 4. 默认账户
```
用户名: admin
密码: admin123
角色: admin

⚠️  请在生产环境中立即修改默认密码！
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install jsonwebtoken bcryptjs
```

### 2. 初始化数据库

```bash
# 创建管理员表
psql -d dining_mvp -f migrations/add_admin_table.sql

# 或者运行初始化脚本
node scripts/init-admin.js
```

### 3. 配置环境变量

在 `.env` 文件中添加：

```bash
# JWT密钥（必须修改为强密码）
JWT_SECRET=your_strong_secret_key_here
```

### 4. 启动服务

```bash
npm start
```

### 5. 访问管理后台

- 登录页面: `http://localhost:3000/admin/login.html`
- 管理后台: `http://localhost:3000/admin/index.html`

## 📁 文件结构

```
dining-mvp/
├── server/
│   ├── routes/
│   │   └── auth.js              # 认证路由
│   └── routes/
│       └── index.js             # 路由入口（已更新）
├── admin/
│   ├── login.html               # 登录页面 ✨新增
│   ├── index.html               # 管理后台（已更新，含认证）✨
│   └── index_old.html           # 旧版管理后台（备份）
├── migrations/
│   └── add_admin_table.sql      # 数据库迁移脚本 ✨新增
├── scripts/
│   └── init-admin.js            # 管理员初始化脚本 ✨新增
└── .env.example                 # 环境变量模板（已更新）
```

## 🔌 API 接口

### 认证相关

#### 1. 管理员登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

响应:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "nickname": "系统管理员",
      "role": "admin"
    }
  }
}
```

#### 2. 验证Token
```http
POST /api/auth/verify
Authorization: Bearer <token>

响应:
{
  "success": true,
  "data": {
    "user": {...},
    "valid": true
  }
}
```

#### 3. 登出
```http
POST /api/auth/logout
Authorization: Bearer <token>

响应:
{
  "success": true,
  "message": "登出成功"
}
```

#### 4. 创建管理员（需要super_admin权限）
```http
POST /api/auth/create-admin
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newadmin",
  "password": "password123",
  "nickname": "新管理员",
  "role": "admin"
}
```

#### 5. 修改密码
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "admin123",
  "newPassword": "newpassword456"
}
```

#### 6. 管理员列表（需要admin权限）
```http
GET /api/auth/list
Authorization: Bearer <token>

响应:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "nickname": "系统管理员",
      "role": "admin",
      "last_login": "2026-03-22T00:00:00.000Z",
      "created_at": "2026-03-22T00:00:00.000Z"
    }
  ]
}
```

## 🛡️ 认证中间件

### authenticateToken
验证JWT token，所有管理后台API都需要此中间件。

```javascript
const { authenticateToken } = require('./auth');

app.use('/api/dishes', authenticateToken, dishesRoutes);
app.use('/api/orders', authenticateToken, ordersRoutes);
```

### checkRole
检查用户角色，需要特定权限的API使用此中间件。

```javascript
const { checkRole } = require('./auth');

// 只有admin及以上可以访问
app.get('/api/auth/list', authenticateToken, checkRole('admin'), handler);
```

## 🔧 使用说明

### 登录流程

1. 访问 `http://localhost:3000/admin/login.html`
2. 输入用户名和密码
3. 提交登录表单
4. 登录成功后，token保存在localStorage
5. 自动跳转到管理后台
6. 所有API请求自动带上Authorization header

### 新功能操作说明

#### 支付管理操作
- **查看支付状态**: 在订单详情页面查看支付状态（未支付/已支付/支付失败）
- **处理退款**: 通过支付管理页面发起退款请求（需要super_admin权限）
- **配置支付参数**: 在系统设置中配置微信/支付宝参数（需要super_admin权限）

#### 打印管理操作
- **打印订单**: 在订单列表或详情页面点击"打印"按钮
- **测试打印机**: 在系统设置中点击"打印测试页"验证打印机连接
- **配置打印机**: 在系统设置中配置打印机类型、连接方式和参数
- **查看打印机状态**: 实时监控打印机在线状态和纸张情况

#### 实时通知操作
- **接收通知**: 管理后台自动接收新订单、支付成功等实时通知
- **通知设置**: 在个人设置中配置通知偏好（声音提醒、弹窗等）
- **多设备同步**: 同一账号在多个设备上登录时，通知会同步推送

### 权限控制说明
- **普通管理员(admin)**: 可以处理日常订单、打印小票、查看支付状态
- **超级管理员(super_admin)**: 额外拥有支付配置、退款处理、打印机高级配置权限

### API 调用示例

```javascript
const token = localStorage.getItem('adminToken');

fetch('/api/dishes', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### Token 失效处理

当token过期或无效时：
- 返回401状态码
- 前端自动清除localStorage
- 跳转到登录页面

## 🔒 安全建议

### 1. 修改默认密码
生产环境中必须修改默认管理员密码。

```bash
# 方法1：通过API修改
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"admin123","newPassword":"your_secure_password"}'

# 方法2：直接修改数据库
node scripts/init-admin.js
```

### 2. 设置强JWT密钥
```bash
# .env文件
JWT_SECRET=$(openssl rand -base64 32)
```

### 3. Token 过期时间
默认24小时，可根据需求调整：
```javascript
const JWT_EXPIRES_IN = '7d'; // 7天
```

### 4. HTTPS配置
生产环境必须使用HTTPS：
```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

## 📊 数据库表结构

### admin_users 表

```sql
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,        -- 用户名
    password VARCHAR(255) NOT NULL,              -- bcrypt加密密码
    nickname VARCHAR(50),                        -- 昵称
    role VARCHAR(20) DEFAULT 'admin',            -- 角色: admin, super_admin
    last_login TIMESTAMP,                        -- 最后登录时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 权限说明

### 角色定义

| 角色 | 说明 | 权限 |
|------|------|------|
| admin | 普通管理员 | 菜品管理、订单管理、查看统计、修改密码 |
| super_admin | 超级管理员 | 所有admin权限 + 创建新管理员、查看管理员列表 |

### API 权限矩阵

| API接口 | admin | super_admin |
|---------|-------|-------------|
| /api/auth/login | ✅ | ✅ |
| /api/auth/verify | ✅ | ✅ |
| /api/auth/logout | ✅ | ✅ |
| /api/auth/change-password | ✅ | ✅ |
| /api/auth/list | ✅ | ✅ |
| /api/auth/create-admin | ❌ | ✅ |
| /api/dishes/* | ✅ | ✅ |
| /api/orders/* | ✅ | ✅ |
| /api/pay/* | ✅ | ✅ |
| /api/print/* | ✅ | ✅ |
| /api/websocket/* | ✅ | ✅ |

## 🐛 常见问题

### 1. 登录后直接跳转回登录页
**原因**: Token无效或过期
**解决**: 清除localStorage，重新登录

### 2. API返回401错误
**原因**: 未携带token或token无效
**解决**: 检查localStorage中的token是否存在且有效

### 3. 创建管理员失败
**原因**: 用户名已存在或权限不足
**解决**: 确保用户名唯一，当前用户有super_admin权限

### 4. 修改密码失败
**原因**: 旧密码错误或新密码格式不正确
**解决**: 确认旧密码正确，新密码长度至少6位

## 🔄 从旧版本升级

如果已部署旧版本，按以下步骤升级：

```bash
# 1. 拉取最新代码
git pull origin master

# 2. 安装新依赖
npm install jsonwebtoken bcryptjs

# 3. 更新环境变量
# 在.env中添加: JWT_SECRET=your_secret_key

# 4. 运行数据库迁移
psql -d dining_mvp -f migrations/add_admin_table.sql

# 5. 初始化管理员
node scripts/init-admin.js

# 6. 重启服务
pm2 restart dining-mvp
```

## 📝 后续优化建议

### 1. 短期（1-2周）
- [ ] 添加管理员操作日志
- [ ] 实现token刷新机制
- [ ] 添加图形验证码
- [ ] 实现登录失败次数限制

### 2. 中期（1个月）
- [ ] 实现OAuth2登录（微信、支付宝）
- [ ] 添加多因素认证（MFA）
- [ ] 实现权限细粒度控制
- [ ] 添加审计日志

### 3. 长期（3个月）
- [ ] 实现单点登录（SSO）
- [ ] 添加账号锁定功能
- [ ] 实现IP白名单
- [ ] 集成安全告警系统

## 📞 技术支持

如有问题，请通过以下方式联系：
- GitHub Issues: https://github.com/betsymk/dining-mvp/issues
- 文档: README.md

## 📄 许可证

ISC

---

**版本**: v1.1.0
**更新日期**: 2026-03-22
**作者**: AI Agent Developer
