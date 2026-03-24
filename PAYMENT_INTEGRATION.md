# 支付集成配置指南

## 📋 功能概述

为餐饮点餐系统添加了完整的支付集成功能，支持微信支付和支付宝支付，确保顾客可以安全便捷地完成订单支付。

## 💳 支持的支付方式

- ✅ 微信支付（Native/JSAPI）
- ✅ 支付宝支付（PC网站支付/手机网站支付）
- ✅ 模拟支付（开发测试用）

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install wechatpay-alipay-sdk
```

### 2. 配置环境变量

在 `.env` 文件中添加支付相关配置：

```bash
# 微信支付配置
WECHAT_APPID=your_wechat_appid
WECHAT_MCHID=your_wechat_mchid
WECHAT_APIV3_KEY=your_wechat_apiv3_key
WECHAT_SERIAL_NO=your_wechat_serial_no
WECHAT_PRIVATE_KEY_PATH=./certs/wechat_private_key.pem

# 支付宝支付配置
ALIPAY_APPID=your_alipay_appid
ALIPAY_PUBLIC_KEY_PATH=./certs/alipay_public_key.pem
ALIPAY_PRIVATE_KEY_PATH=./certs/alipay_private_key.pem

# 支付回调地址（必须是HTTPS）
PAYMENT_NOTIFY_URL=https://your-domain.com/api/pay/notify
```

### 3. 准备证书文件

创建证书目录并放置相关证书：

```bash
mkdir -p ./certs
# 将微信支付私钥文件放入 ./certs/wechat_private_key.pem
# 将支付宝公钥文件放入 ./certs/alipay_public_key.pem  
# 将支付宝私钥文件放入 ./certs/alipay_private_key.pem
```

### 4. 初始化支付配置

```bash
# 确保数据库有支付相关字段
psql -d dining_mvp -f migrations/add_payment_fields.sql
```

## 🔌 API 接口

### 1. 创建支付订单
```http
POST /api/pay/create-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_123456",
  "amount": 99.90,
  "description": "桌号A01订单",
  "paymentMethod": "wechat" // or "alipay"
}

响应:
{
  "success": true,
  "data": {
    "paymentId": "pay_789012",
    "paymentUrl": "https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?...",
    "qrcode": "https://api.qrserver.com/v1/create-qr-code/?data=..."
  }
}
```

### 2. 查询支付状态
```http
GET /api/pay/status/{paymentId}
Authorization: Bearer <token>

响应:
{
  "success": true,
  "data": {
    "paymentId": "pay_789012",
    "status": "paid", // unpaid, paid, failed, refunded
    "amount": 99.90,
    "paidAt": "2026-03-24T10:30:00.000Z"
  }
}
```

### 3. 支付回调（Webhook）
```http
POST /api/pay/notify
Content-Type: application/json

// 微信支付回调
{
  "event_type": "TRANSACTION.SUCCESS",
  "resource": {
    "algorithm": "AEAD_AES_256_GCM",
    "ciphertext": "...",
    "nonce": "...",
    "associated_data": ""
  }
}

// 支付宝回调
{
  "trade_status": "TRADE_SUCCESS",
  "out_trade_no": "order_123456",
  "total_amount": "99.90"
}
```

### 4. 模拟支付（开发环境）
```http
POST /api/pay/mock
Content-Type: application/json

{
  "orderId": "order_123456",
  "amount": 99.90,
  "paymentMethod": "wechat"
}

响应:
{
  "success": true,
  "message": "模拟支付成功"
}
```

## 🛠️ 微信支付配置详解

### 1. 获取商户信息
- **AppID**: 登录[微信公众平台](https://mp.weixin.qq.com/)获取
- **商户号(MCHID)**: 登录[微信支付商户平台](https://pay.weixin.qq.com/)获取
- **APIv3密钥**: 在商户平台「账户中心」→「API安全」中设置
- **序列号**: 从商户平台下载的证书中获取

### 2. 证书配置
- 下载API证书（apiclient_cert.p12）
- 转换为PEM格式：
  ```bash
  openssl pkcs12 -in apiclient_cert.p12 -out wechat_private_key.pem -nodes
  ```
- 将证书文件放置在 `./certs/wechat_private_key.pem`

### 3. 回调地址配置
- 在微信支付商户平台配置支付回调URL
- URL必须是HTTPS且可公网访问
- 格式：`https://your-domain.com/api/pay/notify`

### 4. 权限配置
- 确保商户号已开通Native支付权限
- 配置IP白名单（如果使用服务器IP限制）

## 🛠️ 支付宝支付配置详解

### 1. 获取应用信息
- **AppID**: 登录[支付宝开放平台](https://open.alipay.com/)创建应用获取
- **公钥/私钥**: 在应用「开发设置」中生成RSA2密钥对

### 2. 密钥配置
- **支付宝公钥**: 从支付宝开放平台复制
- **应用私钥**: 自己生成的私钥
- 将两个密钥分别保存为：
  - `./certs/alipay_public_key.pem`
  - `./certs/alipay_private_key.pem`

### 3. 应用配置
- 在支付宝开放平台配置应用网关
- 配置授权回调地址
- 开通PC网站支付和手机网站支付产品

### 4. 签名算法
- 使用RSA2签名算法
- 字符集使用UTF-8
- 时间戳格式：yyyy-MM-dd HH:mm:ss

## 📁 文件结构

```
dining-mvp/
├── server/
│   ├── payment/
│   │   ├── wechat.js          # 微信支付实现
│   │   ├── alipay.js          # 支付宝支付实现
│   │   └── index.js           # 支付统一接口
│   └── routes/
│       └── payment.js         # 支付路由
├── certs/                     # 证书目录
│   ├── wechat_private_key.pem # 微信支付私钥
│   ├── alipay_public_key.pem  # 支付宝公钥
│   └── alipay_private_key.pem # 支付宝私钥
├── migrations/
│   └── add_payment_fields.sql # 支付字段迁移
└── .env.example               # 环境变量模板（已更新）
```

## 🗄️ 数据库表结构更新

### orders 表新增字段

```sql
-- 添加支付相关字段
ALTER TABLE orders 
ADD COLUMN payment_id VARCHAR(100),        -- 支付平台订单ID
ADD COLUMN payment_method VARCHAR(20),     -- 支付方式 (wechat|alipay)
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid', -- 支付状态
ADD COLUMN paid_at TIMESTAMP;              -- 支付完成时间
```

### payments 表（支付记录）

```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    payment_id VARCHAR(100) UNIQUE,        -- 支付平台订单ID
    payment_method VARCHAR(20),            -- 支付方式
    amount DECIMAL(10,2),                  -- 支付金额
    status VARCHAR(20) DEFAULT 'pending',  -- pending|success|failed|refunded
    transaction_id VARCHAR(100),           -- 交易ID
    callback_data JSONB,                   -- 回调原始数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 测试指南

### 1. 微信支付测试
- 使用微信支付沙箱环境
- 配置沙箱商户信息
- 测试支付流程和回调

### 2. 支付宝支付测试
- 使用支付宝沙箱环境
- 配置沙箱应用信息
- 使用沙箱买家账号测试

### 3. 本地开发测试
- 使用模拟支付接口 `/api/pay/mock`
- 手动触发支付状态变更
- 测试异常情况处理

## 🔒 安全建议

### 1. 证书安全
- 私钥文件设置适当权限：`chmod 600 ./certs/*.pem`
- 不要将证书提交到版本控制
- 使用环境变量或密钥管理服务

### 2. 回调验证
- 验证回调签名
- 验证订单金额一致性
- 防止重复回调处理

### 3. HTTPS强制
- 生产环境必须使用HTTPS
- 配置HSTS头
- 使用有效的SSL证书

### 4. 敏感信息保护
- 不要在日志中记录敏感信息
- 加密存储支付相关数据
- 定期轮换API密钥

## 🐛 常见问题

### 1. 微信支付返回"签名错误"
**原因**: APIv3密钥或证书配置错误
**解决**: 检查APIv3密钥、证书路径和序列号

### 2. 支付宝支付返回"验签失败"
**原因**: 公私钥配置错误或签名参数问题
**解决**: 检查密钥文件、签名算法和参数排序

### 3. 支付回调未触发
**原因**: 回调URL不可访问或配置错误
**解决**: 
- 确保URL可公网访问
- 检查HTTPS证书有效性
- 在支付平台正确配置回调地址

### 4. 本地开发无法测试真实支付
**解决**: 
- 使用沙箱环境
- 使用模拟支付接口
- 配置内网穿透工具（如ngrok）

## 🔄 从旧版本升级

如果已部署旧版本，按以下步骤升级：

```bash
# 1. 拉取最新代码
git pull origin master

# 2. 安装新依赖
npm install wechatpay-alipay-sdk

# 3. 更新环境变量
# 在.env中添加支付相关配置

# 4. 准备证书文件
# 将证书文件放入 ./certs/ 目录

# 5. 运行数据库迁移
psql -d dining_mvp -f migrations/add_payment_fields.sql

# 6. 重启服务
pm2 restart dining-mvp
```

## 📊 支付状态流程

```
订单创建 → 未支付(unpaid) → 发起支付 → 支付中(pending) 
    ↓                             ↓
支付失败(failed) ← 支付回调 ← 支付成功(success)
    ↓
退款(refunded)
```

## 📝 后续优化建议

### 1. 短期（1-2周）
- [ ] 添加退款功能
- [ ] 实现支付超时自动取消
- [ ] 添加支付统计报表
- [ ] 优化移动端支付体验

### 2. 中期（1个月）
- [ ] 集成更多支付方式（银联、Apple Pay等）
- [ ] 实现分账功能
- [ ] 添加支付风控
- [ ] 优化支付成功率监控

### 3. 长期（3个月）
- [ ] 实现国际化支付
- [ ] 集成跨境支付
- [ ] 添加支付数据分析
- [ ] 实现智能支付路由

## 📞 技术支持

如有问题，请通过以下方式联系：
- GitHub Issues: https://github.com/betsymk/dining-mvp/issues
- 文档: README.md, PAYMENT_INTEGRATION.md

## 📄 许可证

ISC

---

**版本**: v1.1.0
**更新日期**: 2026-03-24
**作者**: AI Agent Developer