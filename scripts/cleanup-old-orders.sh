#!/bin/bash

# H5点餐系统 - 历史订单清理脚本
# 版本: v1.0.1-Phase 4
# 创建日期: 2026-03-22

# ============================================
# 配置参数
# ============================================

# 数据库配置
DB_NAME="${DB_NAME:-dining_mvp}"
DB_USER="${DB_USER:-dining_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# 归档配置
ARCHIVE_DAYS="${ARCHIVE_DAYS:-30}"  # 归档多少天前的订单
DRY_RUN="${DRY_RUN:-false}"        # 干运行模式（不实际执行）
ARCHIVE_TABLE="${ARCHIVE_TABLE:-orders_archive}"

# 日志配置
LOG_FILE="${LOG_FILE:-./scripts/cleanup_orders_$(date +%Y%m%d_%H%M%S).log}"

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

# 检查数据库连接
check_db_connection() {
    log "INFO" "检查数据库连接..."

    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c "SELECT 1;" &> /dev/null

    if [ $? -eq 0 ]; then
        log "SUCCESS" "数据库连接正常"
        return 0
    else
        log "ERROR" "数据库连接失败"
        return 1
    fi
}

# 创建归档表（如果不存在）
create_archive_table() {
    log "INFO" "检查归档表是否存在..."

    local table_exists=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = '${ARCHIVE_TABLE}'
        );" | tr -d ' ')

    if [ "${table_exists}" = "t" ]; then
        log "INFO" "归档表已存在: ${ARCHIVE_TABLE}"
    else
        log "INFO" "创建归档表: ${ARCHIVE_TABLE}"

        local create_table_sql="
            CREATE TABLE ${ARCHIVE_TABLE} (
                LIKE orders INCLUDING ALL
            );

            CREATE INDEX idx_${ARCHIVE_TABLE}_created_at
            ON ${ARCHIVE_TABLE}(created_at DESC);

            CREATE INDEX idx_${ARCHIVE_TABLE}_status
            ON ${ARCHIVE_TABLE}(status);

            COMMENT ON TABLE ${ARCHIVE_TABLE} IS '历史订单归档表';
        "

        if ${DRY_RUN}; then
            log "DRY-RUN" "将创建归档表: ${ARCHIVE_TABLE}"
            log "DRY-RUN" "SQL: ${create_table_sql}"
        else
            PGPASSWORD="${DB_PASSWORD}" psql \
                -h "${DB_HOST}" \
                -p "${DB_PORT}" \
                -U "${DB_USER}" \
                -d "${DB_NAME}" \
                -c "${create_table_sql}"

            if [ $? -eq 0 ]; then
                log "SUCCESS" "归档表创建成功"
            else
                log "ERROR" "归档表创建失败"
                return 1
            fi
        fi
    fi
}

# 统计需要归档的订单
count_orders_to_archive() {
    log "INFO" "统计需要归档的订单数..."

    local count_sql="
        SELECT COUNT(*) as total
        FROM orders
        WHERE
            status = 'done'
            AND created_at < (CURRENT_DATE - INTERVAL '${ARCHIVE_DAYS} days');
    "

    local total_orders=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "${count_sql}" | tr -d ' ')

    log "INFO" "需要归档的订单数: ${total_orders}"

    echo "${total_orders}"
}

# 归档订单
archive_orders() {
    local total_orders=$1

    if [ ${total_orders} -eq 0 ]; then
        log "INFO" "没有需要归档的订单"
        return 0
    fi

    log "INFO" "开始归档订单..."

    local archive_sql="
        INSERT INTO ${ARCHIVE_TABLE}
        SELECT * FROM orders
        WHERE
            status = 'done'
            AND created_at < (CURRENT_DATE - INTERVAL '${ARCHIVE_DAYS} days')
        ON CONFLICT DO NOTHING;
    "

    if ${DRY_RUN}; then
        log "DRY-RUN" "将归档 ${total_orders} 个订单到 ${ARCHIVE_TABLE}"
        log "DRY-RUN" "SQL: ${archive_sql}"
        return 0
    else
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            -c "${archive_sql}"

        local archive_status=$?

        if [ ${archive_status} -eq 0 ]; then
            log "SUCCESS" "订单归档完成"
            return 0
        else
            log "ERROR" "订单归档失败"
            return 1
        fi
    fi
}

# 删除已归档的订单
delete_archived_orders() {
    local total_orders=$1

    if [ ${total_orders} -eq 0 ]; then
        log "INFO" "没有需要删除的订单"
        return 0
    fi

    log "INFO" "删除已归档的订单..."

    local delete_sql="
        DELETE FROM orders
        WHERE
            status = 'done'
            AND created_at < (CURRENT_DATE - INTERVAL '${ARCHIVE_DAYS} days');
    "

    if ${DRY_RUN}; then
        log "DRY-RUN" "将删除 ${total_orders} 个已归档订单"
        log "DRY-RUN" "SQL: ${delete_sql}"
        return 0
    else
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            -c "${delete_sql}"

        local delete_status=$?

        if [ ${delete_status} -eq 0 ]; then
            log "SUCCESS" "订单删除完成"
            return 0
        else
            log "ERROR" "订单删除失败"
            return 1
        fi
    fi
}

# 显示统计信息
show_statistics() {
    log "INFO" "=== 订单统计信息 ==="

    # 订单表中各状态的订单数
    local orders_stats=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "
            SELECT
                status,
                COUNT(*) as count,
                MAX(created_at) as latest
            FROM orders
            GROUP BY status
            ORDER BY status;
        ")

    log "INFO" "订单表统计 (orders):"
    echo "${orders_stats}" | while read -r status count latest; do
        if [ -n "${status}" ]; then
            log "INFO" "  ${status}: ${count} 个订单 (最新: ${latest})"
        fi
    done

    # 归档表统计
    local archive_exists=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t \
        -c "SELECT 1 FROM information_schema.tables WHERE table_name = '${ARCHIVE_TABLE}';" | tr -d ' ')

    if [ "${archive_exists}" = "1" ]; then
        local archive_stats=$(PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            -t \
            -c "
                SELECT
                    COUNT(*) as total,
                    MIN(created_at) as earliest,
                    MAX(created_at) as latest
                FROM ${ARCHIVE_TABLE};
            ")

        local archive_total=$(echo "${archive_stats}" | head -n1 | awk '{print $1}')
        local archive_earliest=$(echo "${archive_stats}" | head -n1 | awk '{print $2}')
        local archive_latest=$(echo "${archive_stats}" | head -n1 | awk '{print $3}')

        log "INFO" "归档表统计 (${ARCHIVE_TABLE}):"
        log "INFO" "  总计: ${archive_total} 个订单"
        log "INFO" "  最早: ${archive_earliest}"
        log "INFO" "  最新: ${archive_latest}"
    else
        log "INFO" "归档表不存在: ${ARCHIVE_TABLE}"
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
用法: $0 [选项]

H5点餐系统历史订单清理脚本

选项:
    -h, --help              显示此帮助信息
    -n, --dry-run           干运行模式（不实际执行）
    -d, --days <天数>       归档多少天前的订单 (默认: 30)
    -s, --stats             仅显示统计信息
    -c, --create-archive    仅创建归档表

环境变量:
    DB_NAME                数据库名称 (默认: dining_mvp)
    DB_USER                数据库用户 (默认: dining_user)
    DB_PASSWORD            数据库密码
    DB_HOST                数据库主机 (默认: localhost)
    DB_PORT                数据库端口 (默认: 5432)
    ARCHIVE_DAYS           归档天数 (默认: 30)
    ARCHIVE_TABLE          归档表名 (默认: orders_archive)
    LOG_FILE               日志文件

示例:
    $0                      # 执行完整的归档和清理流程
    $0 -n                   # 干运行模式，显示将要执行的操作
    $0 -d 60                # 归档60天前的订单
    $0 -s                   # 仅显示统计信息
    $0 -c                   # 仅创建归档表

说明:
    - 此脚本会归档已完成（status = 'done'）的订单到 orders_archive 表
    - 归档条件：订单完成时间超过指定的天数
    - 归档成功后会从 orders 表中删除已归档的订单
    - 建议先使用 --dry-run 测试，再实际执行
    - 建议在执行前先备份数据库

EOF
}

# ============================================
# 主程序
# ============================================

main() {
    # 解析命令行参数
    local stats_only=false
    local create_archive_only=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -d|--days)
                ARCHIVE_DAYS="$2"
                shift 2
                ;;
            -s|--stats)
                stats_only=true
                shift
                ;;
            -c|--create-archive)
                create_archive_only=true
                shift
                ;;
            *)
                log "ERROR" "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    log "INFO" "=== H5点餐系统历史订单清理 ==="
    log "INFO" "数据库: ${DB_NAME}"
    log "INFO" "主机: ${DB_HOST}:${DB_PORT}"
    log "INFO" "归档天数: ${ARCHIVE_DAYS}"
    log "INFO" "归档表: ${ARCHIVE_TABLE}"
    if ${DRY_RUN}; then
        log "WARN" "干运行模式 - 不会实际执行任何操作"
    fi

    # 检查数据库连接
    check_db_connection
    if [ $? -ne 0 ]; then
        exit 1
    fi

    # 仅显示统计
    if ${stats_only}; then
        show_statistics
        exit 0
    fi

    # 仅创建归档表
    if ${create_archive_only}; then
        create_archive_table
        exit $?
    fi

    # 执行完整流程
    log "INFO" "开始执行归档流程..."

    # 1. 创建归档表
    create_archive_table
    if [ $? -ne 0 ]; then
        exit 1
    fi

    # 2. 显示归档前统计
    log "INFO" "=== 归档前统计 ==="
    show_statistics

    # 3. 统计需要归档的订单
    local total_orders=$(count_orders_to_archive)

    # 4. 归档订单
    archive_orders "${total_orders}"
    if [ $? -ne 0 ]; then
        exit 1
    fi

    # 5. 删除已归档的订单
    delete_archived_orders "${total_orders}"
    if [ $? -ne 0 ]; then
        log "ERROR" "归档成功，但删除失败，请手动检查"
        exit 1
    fi

    # 6. 显示归档后统计
    log "INFO" "=== 归档后统计 ==="
    show_statistics

    log "SUCCESS" "归档流程完成！"
    log "INFO" "日志文件: ${LOG_FILE}"
}

# 运行主程序
main "$@"
