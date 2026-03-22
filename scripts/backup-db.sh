#!/bin/bash

# H5点餐系统 - 数据库备份脚本
# 版本: v1.0.1-Phase 4
# 创建日期: 2026-03-22

# ============================================
# 配置参数
# ============================================

# 数据库配置（从环境变量读取，如有默认值则使用默认）
DB_NAME="${DB_NAME:-dining_mvp}"
DB_USER="${DB_USER:-dining_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# 备份目录配置
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# 备份文件命名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
COMPRESSED_BACKUP="${BACKUP_PATH}.gz"

# 日志文件
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

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

# 创建备份目录
create_backup_dir() {
    if [ ! -d "${BACKUP_DIR}" ]; then
        log "INFO" "创建备份目录: ${BACKUP_DIR}"
        mkdir -p "${BACKUP_DIR}"
        if [ $? -ne 0 ]; then
            log "ERROR" "无法创建备份目录"
            exit 1
        fi
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log "INFO" "清理 ${RETENTION_DAYS} 天前的旧备份..."

    # 查找并删除旧的备份文件
    local deleted_count=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)

    # 清理旧的日志文件
    find "${BACKUP_DIR}" -name "backup_*.log" -type f -mtime +${RETENTION_DAYS} -delete > /dev/null 2>&1

    if [ $deleted_count -gt 0 ]; then
        log "INFO" "已删除 ${deleted_count} 个旧备份文件"
    else
        log "INFO" "没有需要清理的旧备份文件"
    fi
}

# 执行数据库备份
perform_backup() {
    log "INFO" "开始备份数据库: ${DB_NAME}"
    log "INFO" "备份文件: ${COMPRESSED_BACKUP}"

    # 检查pg_dump是否存在
    if ! command -v pg_dump &> /dev/null; then
        log "ERROR" "pg_dump 命令未找到，请安装 PostgreSQL 客户端工具"
        exit 1
    fi

    # 执行备份并压缩
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --no-owner \
        --no-acl \
        --format=plain \
        --inserts \
        --column-inserts \
        2>&1 | tee >(cat > "${BACKUP_PATH}") | gzip > "${COMPRESSED_BACKUP}"

    local backup_status=$?

    if [ ${backup_status} -eq 0 ]; then
        # 删除未压缩的SQL文件
        rm -f "${BACKUP_PATH}"

        # 获取备份文件大小
        local file_size=$(du -h "${COMPRESSED_BACKUP}" | cut -f1)

        log "SUCCESS" "数据库备份完成！"
        log "INFO" "备份文件: ${COMPRESSED_BACKUP}"
        log "INFO" "文件大小: ${file_size}"

        return 0
    else
        log "ERROR" "数据库备份失败！状态码: ${backup_status}"

        # 清理失败的备份文件
        rm -f "${BACKUP_PATH}"
        rm -f "${COMPRESSED_BACKUP}"

        return 1
    fi
}

# 验证备份文件
verify_backup() {
    log "INFO" "验证备份文件..."

    if [ ! -f "${COMPRESSED_BACKUP}" ]; then
        log "ERROR" "备份文件不存在"
        return 1
    fi

    # 验证gzip文件是否有效
    if gzip -t "${COMPRESSED_BACKUP}" 2>/dev/null; then
        log "SUCCESS" "备份文件验证通过"

        # 检查备份内容是否包含必要的表
        local table_count=$(gzip -dc "${COMPRESSED_BACKUP}" | grep -c "CREATE TABLE" || echo "0")
        log "INFO" "备份中包含 ${table_count} 个表"

        return 0
    else
        log "ERROR" "备份文件验证失败"
        return 1
    fi
}

# 显示备份统计
show_statistics() {
    log "INFO" "=== 备份统计 ==="

    local total_backups=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f | wc -l)
    local total_size=$(du -sh "${BACKUP_DIR}/${DB_NAME}_*.sql.gz" 2>/dev/null | awk '{sum+=$1} END {print sum}' | sed 's/M//')
    local latest_backup=$(ls -lt "${BACKUP_DIR}/${DB_NAME}_*.sql.gz" 2>/dev/null | head -n1 | awk '{print $NF}' | xargs -I{} basename {})

    log "INFO" "总备份数: ${total_backups}"
    log "INFO" "总大小: ${total_size}M"
    log "INFO" "最新备份: ${latest_backup}"

    log "INFO" "最近的备份文件:"
    ls -lh "${BACKUP_DIR}/${DB_NAME}_*.sql.gz" 2>/dev/null | tail -n5 | awk '{print "  " $9 " (" $5 ")"}'
}

# 显示帮助信息
show_help() {
    cat << EOF
用法: $0 [选项]

H5点餐系统数据库备份脚本

选项:
    -h, --help          显示此帮助信息
    -c, --cleanup-only  仅清理旧备份，不执行新备份
    -v, --verify-only  仅验证最新的备份文件
    -s, --stats        显示备份统计信息

环境变量:
    DB_NAME            数据库名称 (默认: dining_mvp)
    DB_USER            数据库用户 (默认: dining_user)
    DB_PASSWORD        数据库密码
    DB_HOST            数据库主机 (默认: localhost)
    DB_PORT            数据库端口 (默认: 5432)
    BACKUP_DIR         备份目录 (默认: ./backups)
    RETENTION_DAYS     保留天数 (默认: 7)

示例:
    $0                      # 执行完整备份流程
    $0 -c                   # 仅清理旧备份
    $0 -v                   # 仅验证最新备份
    $0 -s                   # 显示备份统计

EOF
}

# ============================================
# 主程序
# ============================================

main() {
    # 解析命令行参数
    local cleanup_only=false
    local verify_only=false
    local stats_only=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--cleanup-only)
                cleanup_only=true
                shift
                ;;
            -v|--verify-only)
                verify_only=true
                shift
                ;;
            -s|--stats)
                stats_only=true
                shift
                ;;
            *)
                log "ERROR" "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 创建日志目录
    create_backup_dir

    log "INFO" "=== H5点餐系统数据库备份 ==="
    log "INFO" "数据库: ${DB_NAME}"
    log "INFO" "主机: ${DB_HOST}:${DB_PORT}"
    log "INFO" "备份目录: ${BACKUP_DIR}"
    log "INFO" "保留天数: ${RETENTION_DAYS}"

    # 统计模式
    if ${stats_only}; then
        show_statistics
        exit 0
    fi

    # 验证模式
    if ${verify_only}; then
        local latest_backup=$(ls -t "${BACKUP_DIR}/${DB_NAME}_*.sql.gz" 2>/dev/null | head -n1)
        if [ -z "${latest_backup}" ]; then
            log "ERROR" "没有找到备份文件"
            exit 1
        fi
        COMPRESSED_BACKUP="${latest_backup}"
        verify_backup
        exit $?
    fi

    # 清理模式
    if ${cleanup_only}; then
        cleanup_old_backups
        exit 0
    fi

    # 执行完整备份流程
    perform_backup
    local backup_status=$?

    if [ ${backup_status} -eq 0 ]; then
        verify_backup
        local verify_status=$?

        if [ ${verify_status} -eq 0 ]; then
            cleanup_old_backups
            show_statistics
            log "SUCCESS" "备份流程完成！"
            exit 0
        else
            log "ERROR" "备份验证失败"
            exit 1
        fi
    else
        log "ERROR" "备份失败"
        exit 1
    fi
}

# 运行主程序
main "$@"
