# H5餐饮点餐系统 MVP

轻量级餐厅扫码点餐系统，支持顾客H5网页下单、商家后台管理订单。

**最新版本**: v1.1.0
**更新**: 添加管理后台登录认证功能 ✨

## 功能特性

### 顾客端 H5
- 📱 扫码进入点餐（URL参数带桌号 `?table=A01`）
- 🍽️ 菜单浏览（支持分类筛选：到店/外卖/预制菜）
- 🛒 购物车管理
- 💳 模拟支付
- 📋 订单状态查询

### 商家管理后台
- 🔐 **用户认证**（JWT登录、权限管理）
- 📦 菜品管理（增删改查、上下架）
- 📋 订单管理（新订单/已完成、一键完成）
- 📊 数据统计（今日单量、营收）

## 技术栈

- **后端**: Node.js + Express
- **数据库**: PostgreSQL
- **前端**: 原生 HTML/CSS/JavaScript

## 快速开始

### 1. 环境要求

- Node.js >= 14
- PostgreSQL >= 12

### 2. 安装依赖

```bash
npm install
```

### 3. 数据库配置

```bash
# 创建数据库
createdb dining_mvp

# 执行初始化脚本
psql -d dining_mvp -f init.sql
```

### 4. 环境变量配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填写数据库配置
# DB_USER=your_db_user
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_NAME=dining_mvp

# JWT认证配置（必须修改为强密码）
JWT_SECRET=your_strong_secret_key_here
```

### 5. 初始化管理员账户

```bash
# 创建管理员表
psql -d dining_mvp -f migrations/add_admin_table.sql

# 或使用初始化脚本
node scripts/init-admin.js
```

**默认管理员账户**:
- 用户名: `admin`
- 密码: `admin123`
- ⚠️ 请在生产环境中立即修改默认密码

### 6. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务启动后访问：
- 顾客端: `http://localhost:3000/client?table=A01`
- 管理端: `http://localhost:3000/admin/login.html`（登录页面）

## 数据库结构

### dishes 表（菜品）
```sql
- id: 序列主键
- name: 菜品名称
- price: 价格
- description: 描述
- image_url: 图片URL
- category: 分类 (0=到店 1=外卖 2=预制菜)
- status: 状态 (0=下架 1=上架)
- created_at: 创建时间
```

### orders 表（订单）
```sql
- id: 序列主键
- table_id: 桌号
- items: 订单明细 (JSONB格式)
- total_price: 总价
- status: 状态 (new|done)
- customer_phone: 顾客电话
- order_type: 订单类型 (0=到店 1=外卖 2=预制菜)
- created_at: 创建时间
- updated_at: 更新时间
```

**数据约束** (v1.0.1新增):
- 总价必须 > 0
- 状态只能是 'new' 或 'done'
- 订单项不能为空 (JSONB数组长度 > 0)
- 订单类型只能是 0、1 或 2

**⚠️ 安全提示**: 所有管理后台API（菜品、订单）都需要JWT token认证。

### admin_users 表（管理员）
```sql
- id: 序列主键
- username: 用户名（唯一）
- password: 密码（bcrypt加密）
- nickname: 昵称
- role: 角色 (admin|super_admin)
- last_login: 最后登录时间
- created_at: 创建时间
- updated_at: 更新时间
```

## API 接口

### 认证相关 🔐
- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/verify` - 验证token
- `POST /api/auth/logout` - 管理员登出
- `POST /api/auth/change-password` - 修改密码
- `POST /api/auth/create-admin` - 创建管理员（需要super_admin权限）
- `GET /api/auth/list` - 管理员列表（需要admin权限）

### 菜品相关（需认证）🔐
- `GET /api/dishes` - 获取菜品列表
- `GET /api/dishes/:id` - 获取菜品详情
- `POST /api/dishes` - 创建菜品
- `PUT /api/dishes/:id` - 更新菜品
- `DELETE /api/dishes/:id` - 删除菜品（软删除）

### 订单相关（需认证）🔐
- `GET /api/orders` - 获取订单列表
- `GET /api/orders/:id` - 获取订单详情
- `GET /api/orders/stats/today` - 今日订单统计
- `POST /api/orders` - 创建订单
- `PUT /api/orders/:id/status` - 更新订单状态
- `PUT /api/orders/:id/complete` - 完成订单

### 支付相关
- `POST /api/pay/mock` - 模拟支付

## 项目结构

```
dining-mvp/
├── server/
│   ├── server.js          # 服务器入口
│   ├── database.js        # 数据库连接
│   └── routes/
│       ├── index.js       # 路由入口
│       ├── dishes.js      # 菜品路由
│       ├── orders.js      # 订单路由
│       └── payment.js     # 支付路由
├── client/                # 顾客端H5页面
├── admin/                 # 管理后台页面
├── init.sql              # 数据库数据库初始化脚本
├── package.json          # 项目配置
└── README.md             # 项目说明
```

## 部署

### 使用 PM2 部署（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/server.js --name dining-mvp

# 查看状态
pm2 status

# 查看日志
pm2 logs dining-mvp
```

### 使用 Cloudflare Tunnel 外网访问

```bash
# 安装 cloudflared
sudo apt install cloudflared

# 创建隧道
cloudflared tunnel create dining-mvp

# 配置并启动
cloudflared tunnel run
```

## 安全提示

⚠️ **重要**: 本项目为 MVP 版本，生产环境部署前请务必：
1. ✅ 修改所有环境变量配置
2. ✅ 修改默认管理员密码
3. ✅ 配置JWT密钥（JWT_SECRET）
4. ✅ 配置 HTTPS
5. ✅ 添加用户认证和授权（已实现）
6. ✅ 实施输入验证和防 SQL 注入
7. ✅ 添加日志记录和监控

## 版本历史

### v1.1.0 (2026-03-22)
- ✅ **管理后台登录认证**
  - JWT token 认证系统
  - bcrypt 密码加密
  - 管理员登录/登出
  - 角色权限管理（admin、super_admin）
- ✅ 安全性提升
  - API路由保护
  - Token自动验证
  - 权限分级管理
- ✅ 管理员账户管理
  - 创建管理员账户
  - 修改密码
  - 管理员列表查询

### v1.0.0 (2026-03-22)
- ✅ MVP 基础功能
- ✅ 顾客端点餐流程
- ✅ 管理后台订单管理
- ✅ 数据库初始化脚本

### v1.0.2 (规划中)
- 🔧 修复数据库相关 bug
- 🔧 优化查询性能
- 🔧 增强错误处理

## 许可证

ISC

## 作者

OpenClaw Agent Team
6-03-22)
- ✅ MVP 基础功能
- ✅ 顾客端点餐流程
- ✅ 管理后台订单管理
- ✅ 数据库初始化脚本

### v1.0.2 (规划中)
- 🔧 修复数据库相关 bug
- 🔧 优化查询性能
- 🔧 增强错误处理

## 许可证

ISC

## 作者

OpenClaw Agent Team
(2026-03-22)
- ✅ MVP 基础功能
- ✅ 顾客端点餐流程
- ✅ 管理后台订单管理
- ✅ 数据库初始化脚本

### v1.0.2 (规划中)
- 🔧 修复数据库相关 bug
- 🔧 优化查询性能
- 🔧 增强错误处理

## 许可证

ISC

## 作者

OpenClaw Agent Team
