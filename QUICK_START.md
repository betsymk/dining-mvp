# 快速开始指南

## 三步启动

### 1. 初始化数据库
```bash
cd dining-mvp
./init-db.sh
```

### 2. 安装依赖（如果还未安装）
```bash
npm install
```

### 3. 启动服务
```bash
npm start
```

或使用快速启动脚本：
```bash
./start.sh
```

## 访问地址

服务启动后访问：

- **顾客端**：http://localhost:3000/client?table=A01
- **管理后台**：http://localhost:3000/admin

## 默认账号

管理后台无需登录，可以直接使用。

## 示例数据

系统已预置：
- 10个菜品（招牌红烧肉、清蒸鲈鱼等）
- 2个示例订单（A01桌已完成，B02桌待处理）

## 测试流程

### 顾客端流程
1. 访问 http://localhost:3000/client?table=A01
2. 点击"开始点餐"
3. 浏览菜单，点击"+"添加菜品到购物车
4. 点击底部购物车图标
5. 确认订单，点击"下单"
6. 查看支付成功，点击"查看订单"
7. 看到订单状态更新

### 管理后台流程
1. 访问 http://localhost:3000/admin
2. 查看统计数据（今日订单、营收）
3. 切换到"订单管理"标签
4. 筛选"新订单"
5. 点击"完成"处理订单
6. 切换到"菜品管理"标签
7. 尝试添加/编辑/删除菜品

## 常用命令

```bash
# 开发模式启动（自动重启）
npm run dev

# 生产模式启动
npm start

# 停止服务
Ctrl + C

# 运行部署检查
./check-deployment.sh

# 重新初始化数据库
./init-db.sh
```

## 端口修改

如需修改端口，编辑 `.env` 文件：
```
PORT=8080
```

或直接运行：
```bash
PORT=8080 npm start
```

## 二维码生成

生成桌号二维码：
```bash
qrencode "http://your-domain.com/client?table=A01" -o table-a01.png
```

## 问题排查

### 数据库连接失败
- 确认PostgreSQL已启动：`sudo service postgresql start`
- 修改 `.env` 文件中的数据库配置
- 重新运行初始化脚本：`./init-db.sh`

### 端口被占用
- 修改 `.env` 文件中的 `PORT` 值
- 或使用其他端口启动：`PORT=3001 npm start`

### 图片无法显示
- 确保图片文件在 `public/images/` 目录下
- 或使用在线图片URL

## 下一步

- 查看完整文档：`README.md`
- 查看项目总结：`PROJECT_SUMMARY.md`
- 运行部署检查：`./check-deployment.sh`

---

祝使用愉快！🎉
