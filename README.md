# H5餐饮点餐系统 MVP

轻量级餐厅扫码点餐系统，支持顾客H5网页下单、商家后台管理订单。

**最新版本**: v1.3.0 (开发完成，准备发布)
**更新**: 
- ✅ 营业时间设置（已完成）
- ✅ 库存提醒（已完成）
- ✅ 基础营销功能（已完成）
- ✅ 简单数据导出（已完成）

## 功能特性

### 顾客端 H5
- 📱 扫码进入点餐（URL参数带桌号 `?table=A01`）
- 🍽️ 菜单浏览（支持分类筛选：到店/外卖/预制菜）
- 🛒 购物车管理
- 💳 **真实支付集成**（微信支付、支付宝支付）
- 📋 订单状态查询（实时更新）
- 🔔 **实时通知**（订单状态变更推送）

### 商家管理后台
- 🔐 **用户认证**（JWT登录、权限管理）
- 📦 菜品管理（增删改查、上下架）
- 📋 订单管理（新订单/已完成、一键完成）
- 🖨️ **打印支持**（厨房小票、收银小票自动打印）
- 💳 **支付管理**（支付状态监控、退款处理）
- 🔔 **实时通知**（新订单提醒、支付成功通知）
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

# 支付配置（可选，用于真实支付）
# WECHAT_APPID=your_wechat_appid
# WECHAT_MCHID=your_wechat_mchid
# WECHAT_APIV3_KEY=your_wechat_apiv3_key
# ALIPAY_APPID=your_alipay_appid

# 打印机配置（可选，用于自动打印）
# PRINTER_TYPE=escpos
# PRINTER_CONNECTION=network
# PRINTER_IP=192.168.1.100
# PRINTER_PORT=9100
```

**详细配置说明**:
- 支付集成配置请参考 [`PAYMENT_INTEGRATION.md`](PAYMENT_INTEGRATION.md)
- 打印机配置请参考 [`PRINTER_SETUP.md`](PRINTER_SETUP.md)

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
- `POST /api/pay/create-order` - 创建真实支付订单（微信/支付宝）
- `GET /api/pay/status/{paymentId}` - 查询支付状态
- `POST /api/pay/notify` - 支付回调处理

### 打印相关（需认证）🔐
- `POST /api/print/order` - 打印订单（厨房/收银小票）
- `GET /api/print/status` - 获取打印机状态
- `POST /api/print/test` - 打印测试页
- `POST /api/print/config` - 配置打印机

### 实时通知（WebSocket）
- `ws://localhost:3000/ws/notifications` - 实时通知连接
- 自动推送：新订单、支付成功、订单完成
- 支持多设备同步通知

## 项目结构

```
dining-mvp/
├── server/
│   ├── server.js          # 服务器入口
│   ├── database.js        # 数据库连接
│   ├── websocket.js       # WebSocket实时通知
│   ├── payment/           # 支付集成模块
│   │   ├── wechat.js      # 微信支付实现
│   │   ├── alipay.js      # 支付宝支付实现
│   │   └── index.js       # 支付统一接口
│   ├── printer/           # 打印支持模块
│   │   ├── escpos.js      # ESC/POS打印机实现
│   │   ├── cups.js        # CUPS打印机实现
│   │   └── index.js       # 打印统一接口
│   └── routes/
│       ├── index.js       # 路由入口
│       ├── dishes.js      # 菜品路由
│       ├── orders.js      # 订单路由
│       ├── payment.js     # 支付路由
│       └── printer.js     # 打印路由
├── client/                # 顾客端H5页面
├── admin/                 # 管理后台页面
├── certs/                 # 支付证书目录
├── scripts/               # 工具脚本
│   ├── test-printer.js    # 打印机测试脚本
│   └── init-admin.js      # 管理员初始化
├── templates/             # 打印模板
├── migrations/            # 数据库迁移
│   └── add_admin_table.sql
├── init.sql              # 数据库初始化脚本
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

### v1.2.0 (2026-03-25)
- ✅ **用户系统完善**
  - 完整的用户注册/登录流程
  - JWT认证与token刷新
  - 用户个人信息管理
  - 账户安全设置
- ✅ **地址管理功能**
  - 多地址CRUD操作
  - 默认地址设置
  - 地理坐标存储
  - 配送范围验证
- ✅ **外卖订单支持**
  - 外卖/堂食订单区分
  - 配送地址关联
  - 配送费计算
  - 7个配送状态跟踪
- ✅ **事件追踪系统**
  - 用户行为事件捕获
  - API调用监控
  - 业务事件记录
  - 消息队列集成准备
- ✅ **数据库架构扩展**
  - users表完善
  - addresses表创建
  - restaurants表添加
  - orders表扩展支持外卖

### v1.1.0 (2026-03-24)
- ✅ **管理后台登录认证**
  - JWT token 认证系统
  - bcrypt 密码加密
  - 管理员登录/登出
  - 角色权限管理（admin、super_admin）
- ✅ **支付集成**
  - 微信支付（Native/JSAPI）
  - 支付宝支付（PC/手机网站支付）
  - 支付状态回调处理
  - 支付安全验证
- ✅ **打印支持**
  - ESC/POS热敏打印机支持
  - 厨房小票自动打印
  - 收银小票打印
  - 多种连接方式（网络/USB/蓝牙）
- ✅ **实时通知**
  - WebSocket实时推送
  - 新订单提醒
  - 支付成功通知
  - 订单状态变更同步
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
