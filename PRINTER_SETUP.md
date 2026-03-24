# 打印机配置和故障排除指南

## 📋 功能概述

为餐饮点餐系统添加了完整的打印支持功能，支持多种打印机类型，确保订单可以自动打印到厨房和收银台。

## 🖨️ 支持的打印机类型

- ✅ ESC/POS 热敏打印机（USB/网络/蓝牙）
- ✅ Windows 打印机（通过CUPS）
- ✅ 虚拟打印机（PDF生成）
- ✅ 云打印机（Google Cloud Print兼容）

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install escpos printer
```

### 2. 配置环境变量

在 `.env` 文件中添加打印机配置：

```bash
# 打印机配置
PRINTER_TYPE=escpos          # escpos, windows, virtual, cloud
PRINTER_CONNECTION=network   # usb, network, bluetooth, cups
PRINTER_IP=192.168.1.100     # 网络打印机IP地址
PRINTER_PORT=9100            # 网络打印机端口
PRINTER_USB_VID=0x04b8       # USB设备VID（可选）
PRINTER_USB_PID=0x0e15       # USB设备PID（可选）
PRINTER_NAME=Kitchen_Printer # 打印机名称（Windows/CUPS）
PRINTER_PAPER_WIDTH=48       # 纸张宽度（mm），默认48mm
```

### 3. 测试打印机连接

```bash
# 测试网络打印机
node scripts/test-printer.js --type network --ip 192.168.1.100 --port 9100

# 测试USB打印机
node scripts/test-printer.js --type usb --vid 0x04b8 --pid 0x0e15

# 测试CUPS打印机
node scripts/test-printer.js --type cups --name "Kitchen_Printer"
```

## 🔌 API 接口

### 1. 打印订单
```http
POST /api/print/order
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_123456",
  "printerType": "kitchen", // kitchen, receipt, delivery
  "copies": 1
}

响应:
{
  "success": true,
  "message": "订单已发送到厨房打印机",
  "printerStatus": "online"
}
```

### 2. 获取打印机状态
```http
GET /api/print/status
Authorization: Bearer <token>

响应:
{
  "success": true,
  "data": {
    "kitchen": {
      "status": "online",
      "paper": "ok",
      "lastPrint": "2026-03-24T10:30:00.000Z"
    },
    "receipt": {
      "status": "offline",
      "error": "Connection timeout"
    }
  }
}
```

### 3. 打印测试页
```http
POST /api/print/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "printerType": "kitchen"
}

响应:
{
  "success": true,
  "message": "测试页已打印"
}
```

### 4. 配置打印机
```http
POST /api/print/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "printerType": "kitchen",
  "config": {
    "ip": "192.168.1.101",
    "port": 9100,
    "paperWidth": 58
  }
}
```

## 🛠️ ESC/POS 打印机配置详解

### 1. 网络打印机配置
- **连接方式**: TCP/IP
- **默认端口**: 9100
- **配置示例**:
  ```bash
  PRINTER_TYPE=escpos
  PRINTER_CONNECTION=network
  PRINTER_IP=192.168.1.100
  PRINTER_PORT=9100
  ```

### 2. USB打印机配置
- **连接方式**: USB HID
- **需要获取设备VID/PID**:
  ```bash
  # Linux/Mac
  lsusb
  
  # Windows (PowerShell)
  Get-PnpDevice -Class Printer
  ```
- **配置示例**:
  ```bash
  PRINTER_TYPE=escpos
  PRINTER_CONNECTION=usb
  PRINTER_USB_VID=0x04b8
  PRINTER_USB_PID=0x0e15
  ```

### 3. 蓝牙打印机配置
- **连接方式**: Bluetooth RFCOMM
- **需要配对设备**:
  ```bash
  # Linux
  bluetoothctl pair XX:XX:XX:XX:XX:XX
  
  # 获取MAC地址
  hcitool scan
  ```
- **配置示例**:
  ```bash
  PRINTER_TYPE=escpos
  PRINTER_CONNECTION=bluetooth
  PRINTER_MAC=XX:XX:XX:XX:XX:XX
  ```

## 🛠️ Windows/CUPS 打印机配置

### 1. CUPS 配置（Linux/Mac）
- 安装CUPS:
  ```bash
  # Ubuntu/Debian
  sudo apt install cups
  
  # macOS (已内置)
  # 访问 http://localhost:631
  ```
- 添加打印机到CUPS
- 配置打印机名称:
  ```bash
  PRINTER_TYPE=windows
  PRINTER_CONNECTION=cups
  PRINTER_NAME=Kitchen_Printer
  ```

### 2. Windows 打印机配置
- 确保打印机已安装并设置为默认
- 使用打印机共享名称:
  ```bash
  PRINTER_TYPE=windows
  PRINTER_CONNECTION=windows
  PRINTER_NAME=EPSON_TM-T88V
  ```

## 📁 文件结构

```
dining-mvp/
├── server/
│   ├── printer/
│   │   ├── escpos.js         # ESC/POS打印机实现
│   │   ├── cups.js           # CUPS打印机实现
│   │   ├── windows.js        # Windows打印机实现
│   │   └── index.js          # 打印统一接口
│   └── routes/
│       └── printer.js        # 打印路由
├── scripts/
│   └── test-printer.js       # 打印机测试脚本
├── templates/
│   └── receipt-template.js   # 小票模板
└── .env.example              # 环境变量模板（已更新）
```

## 📄 打印模板

### 厨房小票模板
```
================================
           厨房订单
================================
桌号: A01
订单号: #123456
时间: 2026-03-24 10:30:00
--------------------------------
宫保鸡丁 x1    ¥38.00
麻婆豆腐 x2    ¥24.00
米饭 x2        ¥4.00
--------------------------------
备注: 不要辣椒
================================
```

### 收银小票模板
```
================================
         餐厅名称
         收银小票
================================
桌号: A01
订单号: #123456
时间: 2026-03-24 10:30:00
--------------------------------
宫保鸡丁        ¥38.00
麻婆豆腐 x2     ¥48.00
米饭 x2         ¥8.00
--------------------------------
小计:           ¥94.00
优惠:           ¥4.00
总计:           ¥90.00
--------------------------------
支付方式: 微信支付
支付状态: 已支付
================================
感谢惠顾，欢迎再次光临！
================================
```

## 🧪 测试指南

### 1. 连接测试
- 使用 `test-printer.js` 脚本测试连接
- 检查网络连通性：`ping 192.168.1.100`
- 检查端口开放：`telnet 192.168.1.100 9100`

### 2. 功能测试
- 打印测试页验证基本功能
- 打印实际订单验证格式
- 测试多份打印功能

### 3. 异常测试
- 断开打印机电源测试错误处理
- 移除纸张测试缺纸检测
- 网络断开测试重连机制

## 🔧 故障排除

### 1. 打印机无法连接
**症状**: 连接超时或拒绝连接
**排查步骤**:
1. 检查打印机电源是否开启
2. 检查网络连接（ping测试）
3. 检查端口是否正确（通常9100）
4. 检查防火墙设置
5. 重启打印机和服务器

### 2. 打印内容乱码
**症状**: 打印出乱码字符
**排查步骤**:
1. 检查打印机编码设置（通常GBK/GB2312）
2. 检查Node.js字符串编码
3. 更新ESC/POS驱动库
4. 尝试不同的字体设置

### 3. 打印机无响应
**症状**: 发送打印命令但无输出
**排查步骤**:
1. 检查打印机是否处于错误状态（红灯）
2. 检查纸张是否安装正确
3. 清除打印机缓冲区
4. 重启打印服务

### 4. 缺纸检测失效
**症状**: 纸张用完但系统未检测到
**排查步骤**:
1. 检查打印机是否支持缺纸检测
2. 更新打印机固件
3. 在代码中添加手动确认逻辑
4. 设置定时检查机制

### 5. USB打印机权限问题
**症状**: USB设备访问被拒绝
**解决方法**:
```bash
# Linux - 添加用户到dialout组
sudo usermod -a -G dialout $USER

# 或者设置udev规则
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", MODE="0666"' | sudo tee /etc/udev/rules.d/99-escpos.rules
sudo udevadm control --reload-rules
```

## 📊 打印机状态监控

### 状态码说明
| 状态 | 说明 |
|------|------|
| online | 打印机在线且正常 |
| offline | 打印机离线 |
| paper_low | 纸张不足 |
| paper_out | 纸张用完 |
| error | 打印机错误 |
| unknown | 状态未知 |

### 自动重试机制
- 连接失败时自动重试（最多3次）
- 间隔时间：1秒、3秒、5秒
- 重试成功后继续打印队列

## 🔒 安全建议

### 1. 网络打印机安全
- 限制打印机访问IP范围
- 更改默认管理员密码
- 禁用不必要的网络服务

### 2. 敏感信息保护
- 不在小票上打印完整信用卡号
- 顾客电话号码部分隐藏
- 添加隐私政策声明

### 3. 日志记录
- 记录打印操作日志
- 监控异常打印行为
- 定期清理打印日志

## 🔄 从旧版本升级

如果已部署旧版本，按以下步骤升级：

```bash
# 1. 拉取最新代码
git pull origin master

# 2. 安装新依赖
npm install escpos printer

# 3. 更新环境变量
# 在.env中添加打印机相关配置

# 4. 配置打印机硬件
# 连接并测试打印机

# 5. 重启服务
pm2 restart dining-mvp
```

## 📈 性能优化

### 1. 打印队列管理
- 实现异步打印队列
- 避免阻塞主线程
- 支持优先级打印

### 2. 内存优化
- 及时释放打印对象
- 复用打印机连接
- 监控内存使用情况

### 3. 网络优化
- 使用连接池
- 设置合理的超时时间
- 实现断线重连

## 📝 后续优化建议

### 1. 短期（1-2周）
- [ ] 添加打印机分组管理
- [ ] 实现打印预览功能
- [ ] 添加打印统计报表
- [ ] 优化移动端打印体验

### 2. 中期（1个月）
- [ ] 集成更多打印机品牌
- [ ] 实现远程打印机管理
- [ ] 添加打印模板编辑器
- [ ] 优化多语言支持

### 3. 长期（3个月）
- [ ] 实现智能打印路由
- [ ] 集成云打印服务
- [ ] 添加打印质量监控
- [ ] 实现打印数据分析

## 📞 技术支持

如有问题，请通过以下方式联系：
- GitHub Issues: https://github.com/betsymk/dining-mvp/issues
- 文档: README.md, PRINTER_SETUP.md

## 📄 许可证

ISC

---

**版本**: v1.1.0
**更新日期**: 2026-03-24
**作者**: AI Agent Developer