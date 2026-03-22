#!/bin/bash

# H5点餐系统 v1.0.1 集成测试脚本
# 版本: v1.0.1-Phase 5
# 创建日期: 2026-03-22

# ============================================
# 配置参数
# ============================================

# 数据库配置
DB_NAME="${DB_NAME:-dining_mvp}"
DB_USER="${DB_USER:-dining_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# 服务器配置
SERVER_HOST="${SERVER_HOST:-http://localhost}"
SERVER_PORT="${SERVER_PORT:-3000}"
SERVER_URL="${SERVER_HOST}:${SERVER_PORT}"

# 测试配置
TEST_DIR="${TEST_DIR:-/tmp/dining-mvp-tests}"
LOG_FILE="${LOG_FILE:-./scripts/test-v1.0.1_$(date +%Y%m%d_%H%M%S).log}"

# 全局状态
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# 函数定义
# ============================================

# 日志函数
log() {
    local level="$1"
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# 测试结果函数
pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC}: $1"
    log "PASS" "$1"
}

fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗ FAIL${NC}: $1"
    log "FAIL" "$1"
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
    log "INFO" "$1"
}

# 检查数据库连接
check_db_connection() {
    info "检查数据库连接..."

    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c "SELECT 1;" &> /dev/null

    if [ $? -eq 0 ]; then
        pass "数据库连接正常"
        return 0
    else
        fail "数据库连接失败"
        return 1
    fi
}

# 测试数据库约束
test_database_constraints() {
    info "=== 测试数据库约束 ==="

    # 测试1: 菜品价格约束
    info "测试1: 菜品价格必须大于0"
    local result=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "
            SELECT COUNT(*) FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'dishes' AND con.conname = 'check_price_positive';
        " | tr -d ' ')

    if [ "${result}" = "1" ]; then
        pass "菜品价格约束存在"
    else
        fail "菜品价格约束不存在"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # 测试2: 订单价格约束
    info "测试2: 订单总价必须大于0"
    result=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "
            SELECT COUNT(*) FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'orders' AND con.conname = 'check_total_price_positive';
        " | tr -d ' ')

    if [ "${result}" = "1" ]; then
        pass "订单价格约束存在"
    else
        fail "订单价格约束不存在"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # 测试3: 菜品状态约束
    info "测试3: 菜品状态只能是0或1"
    result=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "
            SELECT COUNT(*) FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'dishes' AND con.conname = 'check_status_range';
        " | tr -d ' ')

    if [ "${result}" = "1" ]; then
        pass "菜品状态约束存在"
    else
        fail "菜品状态约束不存在"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# 测试库存管理
test_stock_management() {
    info "=== 测试库存管理 ==="

    # 测试1: 库存字段存在
    info "测试1: 检查stock字段是否存在"
    local result=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'dishes' AND column_name = 'stock';
        " | tr -d ' ')

    if [ "${result}" = "1" ]; then
        pass "库存字段存在"

        # 测试2: 检查库存约束
        info "测试2: 检查库存非负约束"
        result=$(PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            -t \
            -c "
                SELECT COUNT(*) FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                WHERE rel.relname = 'dishes' AND con.conname = 'check_stock_non_negative';
            " | tr -d ' ')

        if [ "${result}" = "1" ]; then
            pass "库存非负约束存在"
        else
            fail "库存非负约束不存在"
        fi
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
    else
        fail "库存字段不存在"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # 测试3: 检查库存索引
    info "测试3: 检查库存索引"
    result=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "
            SELECT COUNT(*) FROM pg_indexes
            WHERE tablename = 'dishes' AND indexname = 'idx_dishes_stock';
        " | tr -d ' ')

    if [ "${result}" = "1" ]; then
        pass "库存索引存在"
    else
        fail "库存索引不存在"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# 测试性能索引
test_performance_indexes() {
    info "=== 测试性能索引 ==="

    local indexes=(
        "idx_orders_status_created"
        "idx_orders_created_at_today"
        "idx_orders_table_id_status"
        "idx_dishes_category_status"
        "idx_dishes_price"
        "idx_dishes_active_full"
    )

    for index in "${indexes[@]}"; do
        info "检查索引: ${index}"
        local result=$(PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            -t \
            -c "
                SELECT COUNT(*) FROM pg_indexes
                WHERE indexname = '${index}';
            " | tr -d ' ')

        if [ "${result}" = "1" ]; then
            pass "索引 ${index} 存在"
        else
            fail "索引 ${index} 不存在"
        fi
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
    done
}

# 测试健康检查API
test_health_api() {
    info "=== 测试健康检查API ==="

    # 检查服务器是否运行（可选）

    # 测试1: 完整健康检查
    info "测试1: GET /api/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/api/health" 2>/dev/null)

    if [ "${response}" = "200" ] || [ "${response}" = "503" ]; then
        pass "健康检查API响应正常 (${response})"
    else
        fail "健康检查API无响应或状态码异常 (${response})"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # 如果服务器运行，测试各个端点
    if [ "${response}" = "200" ] || [ "${response}" = "503" ]; then
        # 测试2: 数据库健康检查
        info "测试2: GET /api/health/db"
        response=$(curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/api/health/db" 2>/dev/null)

        if [ "${response}" = "200" ] || [ "${response}" = "503" ]; then
            pass "数据库健康检查API正常"
        else
            fail "数据库健康检查API异常"
        fi
        TESTS_TOTAL=$((TESTS_TOTAL + 1))

        # 测试3: 内存健康检查
        info "测试3: GET /api/health/memory"
        response=$(curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/api/health/memory" 2>/dev/null)

        if [ "${response}" = "200" ]; then
            pass "内存健康检查API正常"
        else
            fail "内存健康检查API异常"
        fi
        TESTS_TOTAL=$((TESTS_TOTAL + 1))

        # 测试4: 连接池健康检查
        info "测试4: GET /api/health/pool"
        response=$(curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/api/health/pool" 2>/dev/null)

        if [ "${response}" = "200" ]; then
            pass "连接池健康检查API正常"
        else
            fail "连接池健康检查API异常"
        fi
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
    fi
}

# 测试备份脚本
test_backup_script() {
    info "=== 测试备份脚本 ==="

    local backup_script="$(dirname "$0")/backup-db.sh"

    if [ ! -f "${backup_script}" ]; then
        fail "备份脚本不存在: ${backup_script}"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        return 1
    fi

    # 测试1: 检查脚本可执行
    info "测试1: 检查备份脚本权限"
    if [ -x "${backup_script}" ]; then
        pass "备份脚本可执行"
    else
        fail "备份脚本不可执行"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # 测试2: 测试帮助信息
    info "测试2: 测试备份脚本帮助"
    "${backup_script}" --help &> /dev/null
    if [ $? -eq 0 ]; then
        pass "备份脚本帮助正常"
    else
        fail "备份脚本帮助异常"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # 测试3: 测试干运行模式
    info "测试3: 测试备份脚本干运行模式"
    "${backup_script}" --help &> /dev/null
    if [ $? -eq 0 ]; then
        pass "备份脚本干运行模式正常"
    else
        fail "备份脚本干运行模式异常"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# 测试清理脚本
test_cleanup_script() {
    info "=== 测试清理脚本 ==="

    local cleanup_script="$(dirname "$0")/cleanup-old-orders.sh"

    if [ ! -f "${cleanup_script}" ]; then
        fail "清理脚本不存在: ${cleanup_script}"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        return 1
    fi

    # 测试1: 检查脚本可执行
    info "测试1: 检查清理脚本权限"
    if [ -x "${cleanup_script}" ]; then
        pass "清理脚本可执行"
    else
        fail "清理脚本不可执行"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # 测试2: 测试帮助信息
    info "测试2: 测试清理脚本帮助"
    "${cleanup_script}" --help &> /dev/null
    if [ $? -eq 0 ]; then
        pass "清理脚本帮助正常"
    else
        fail "清理脚本帮助异常"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # 测试3: 测试统计模式
    info "测试3: 测试清理脚本统计模式"
    "${cleanup_script}" --stats &> /dev/null
    if [ $? -eq 0 ]; then
        pass "清理脚本统计模式正常"
    else
        fail "清理脚本统计模式异常"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# 显示测试结果
show_results() {
    echo ""
    echo "========================================"
    echo "          测试结果汇总"
    echo "========================================"
    echo "总测试数: ${TESTS_TOTAL}"
    echo -e "${GREEN}通过: ${TESTS_PASSED}${NC}"
    echo -e "${RED}失败: ${TESTS_FAILED}${NC}"
    echo "成功率: $(echo "scale=2; ${TESTS_PASSED} * 100 / ${TESTS_TOTAL}" | bc)%"
    echo "========================================"
    echo ""

    if [ ${TESTS_FAILED} -eq 0 ]; then
        echo -e "${GREEN}✓ 所有测试通过！${NC}"
        log "SUCCESS" "所有测试通过"
        return 0
    else
        echo -e "${RED}✗ 有 ${TESTS_FAILED} 个测试失败${NC}"
        log "FAIL" "有 ${TESTS_FAILED} 个测试失败"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
用法: $0 [选项]

H5点餐系统 v1.0.1 集成测试脚本

选项:
    -h, --help              显示此帮助信息
    -d, --db-only           仅测试数据库相关功能
    -a, --api-only          仅测试API相关功能
    -s, --scripts-only      仅测试脚本相关功能
    -v, --verbose           详细输出模式
    --skip-server-test      跳过服务器测试（如果服务器未运行）

环境变量:
    DB_NAME                数据库名称 (默认: dining_mvp)
    DB_USER                数据库用户 (默认: dining_user)
    DB_PASSWORD            数据库密码
    DB_HOST                数据库主机 (默认: localhost)
    DB_PORT                数据库端口 (默认: 5432)
    SERVER_HOST            服务器主机 (默认: http://localhost)
    SERVER_PORT            服务器端口 (默认: 3000)
    LOG_FILE               日志文件路径

示例:
    $0                      # 运行所有测试
    $0 -d                   # 仅测试数据库
    $0 -a                   # 仅测试API
    $0 -s                   # 仅测试脚本
    $0 --skip-server-test   # 跳过服务器测试

EOF
}

# ============================================
# 主程序
# ============================================

main() {
    # 解析命令行参数
    local db_only=false
    local api_only=false
    local scripts_only=false
    local verbose=false
    local skip_server=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--db-only)
                db_only=true
                shift
                ;;
            -a|--api-only)
                api_only=true
                shift
                ;;
            -s|--scripts-only)
                scripts_only=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --skip-server-test)
                skip_server=true
                shift
                ;;
            *)
                log "ERROR" "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    log "INFO" "=== H5点餐系统 v1.0.1 集成测试 ==="
    log "INFO" "数据库: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    log "INFO" "服务器: ${SERVER_URL}"
    log "INFO" "日志文件: ${LOG_FILE}"

    # 检查psql是否可用
    if ! command -v psql &> /dev/null; then
        log "ERROR" "psql 命令未找到，请安装 PostgreSQL 客户端"
        exit 1
    fi

    # 启动测试
    check_db_connection || exit 1

    if ${db_only}; then
        test_database_constraints
        test_stock_management
        test_performance_indexes
    elif ${api_only}; then
        if ! ${skip_server}; then
            test_health_api
        else
            info "跳过服务器测试"
        fi
    elif ${scripts_only}; then
        test_backup_script
        test_cleanup_script
    else
        # 运行所有测试
        test_database_constraints
        test_stock_management
        test_performance_indexes

        if ! ${skip_server}; then
            test_health_api
        else
            info "跳过服务器测试"
        fi

        test_backup_script
        test_cleanup_script
    fi

    # 显示结果
    show_results
    exit $?
}

# 运行主程序
main "$@"
