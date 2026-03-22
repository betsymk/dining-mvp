#!/bin/bash

echo "=========================================="
echo "  H5点餐系统 - 部署检查工具"
echo "=========================================="
echo ""

# 检查 Node.js
echo "📦 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js 已安装: $NODE_VERSION"

    if [ "$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')" -lt 14 ]; then
        echo "⚠️  警告: Node.js 版本建议 14+"
    fi
else
    echo "❌ Node.js 未安装，请先安装 Node.js"
    echo "   访问: https://nodejs.org/"
    exit 1
fi

echo ""

# 检查 npm
echo "📦 检查 npm..."
if command -v npm &> /dev/null; then
    echo "✅ npm 已安装: $(npm --version)"
else
    echo "❌ npm 未安装"
    exit 1
fi

echo ""

# 检查 PostgreSQL
echo "🐘 检查 PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL 已安装: $(psql --version | awk '{print $3}')"
else
    echo "❌ PostgreSQL 未安装，请先安装 PostgreSQL"
    echo "   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   CentOS/RHEL: sudo yum install postgresql-server"
    exit 1
fi

echo ""

# 检查项目依赖
echo "📦 检查项目依赖..."
if [ -d "node_modules" ]; then
    echo "✅ 依赖已安装"
else
    echo "⚠️  依赖未安装，运行: npm install"
fi

echo ""

# 检查环境变量文件
echo "⚙️  检查环境配置..."
if [ -f ".env" ]; then
    echo "✅ .env 文件存在"
    source .env
else
    echo "⚠️  .env 文件不存在，使用默认配置"
fi

echo ""

# 检查数据库连接
echo "🔗 检查数据库连接..."
if [ -n "$DB_NAME" ]; then
    DB_NAME_VAR=$DB_NAME
else
    DB_NAME_VAR="dining_mvp"
fi

if PGPASSWORD=${DB_PASSWORD:-postgres} psql -U ${DB_USER:-postgres} -d $DB_NAME_VAR -c '\q' 2>/dev/null; then
    echo "✅ 数据库连接成功: $DB_NAME_VAR"
else
    echo "⚠️  数据库连接失败，请运行初始化脚本: ./init-db.sh"
fi

echo ""

# 检查文件结构
echo "📁 检查项目文件结构..."
REQUIRED_FILES=(
    "package.json"
    "server/server.js"
    "server/database.js"
    "init.sql"
    "client/index.html"
    "client/menu.html"
    "client/cart.html"
    "client/order.html"
    "admin/index.html"
)

ALL_EXISTS=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file 缺失"
        ALL_EXISTS=false
    fi
done

if [ "$ALL_EXISTS" = true ]; then
    echo ""
    echo "✅ 所有必需文件存在"
else
    echo ""
    echo "❌ 部分文件缺失，请检查项目是否完整"
fi

echo ""
echo "=========================================="
echo "  检查完成！"
echo "=========================================="
echo ""
echo "💡 接下来的步骤："
echo "   1. 如果数据库未初始化，运行: ./init-db.sh"
echo "   2. 如果依赖未安装，运行: npm install"
echo "   3. 启动服务: npm start"
echo ""
echo "   顾客端访问: http://localhost:3000/client?table=A01"
echo "   管理后台访问: http://localhost:3000/admin"
echo ""
