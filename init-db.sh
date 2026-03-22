#!/bin/bash

# H5点餐系统 - 数据库初始化脚本

echo "=========================================="
echo "  H5点餐系统 - 数据库初始化工具"
echo "=========================================="

# 检查 PostgreSQL 是否安装
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL 未安装，请先安装 PostgreSQL"
    exit 1
fi

# 加载环境变量（如果存在）
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# 默认值
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-dining_mvp}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_PORT=${DB_PORT:-5432}

echo "📊 正在初始化数据库..."
echo "   数据库名称: $DB_NAME"
echo "   用户名: $DB_USER"
echo "   端口: $DB_PORT"
echo ""

# 创建数据库
echo "🔧 创建数据库 $DB_NAME..."
psql -U $DB_USER -p $DB_PORT -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -U $DB_USER -p $DB_PORT -c "CREATE DATABASE $DB_NAME;"

if [ $? -eq 0 ]; then
    echo "✅ 数据库创建成功"
else
    echo "❌ 数据库创建失败"
    exit 1
fi

# 执行初始化脚本
echo "📝 执行 SQL 初始化脚本..."
psql -U $DB_USER -d $DB_NAME -p $DB_PORT -f init.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 数据库初始化成功！"
    echo "=========================================="
    echo ""
    echo "💡 提示："
    echo "   1. 确保 server/database.js 中的数据库配置正确"
    echo "   2. 运行 'npm start' 启动服务器"
    echo "   3. 访问 http://localhost:3000/admin 查看管理后台"
    echo ""
else
    echo "❌ 数据库初始化失败"
    exit 1
fi
