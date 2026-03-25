# 数据架构设计文档

## 统一事件数据模型

### 核心概念
- **事件驱动架构**: 所有业务操作都记录为事件
- **统一事件格式**: 标准化的事件结构便于分析
- **实时+批处理**: 支持两种数据处理模式

### 事件数据模型

```json
{
  "event_id": "uuid",
  "event_type": "string", // 事件类型
  "event_timestamp": "timestamp", // 事件时间戳
  "user_id": "string", // 用户标识（可选）
  "session_id": "string", // 会话标识
  "source": "string", // 事件来源
  "properties": {
    // 事件特定属性
  },
  "context": {
    // 上下文信息
    "ip_address": "string",
    "user_agent": "string",
    "device_info": "object"
  }
}
```

### 主要事件类型

#### 1. 用户行为事件
- `page_view`: 页面浏览
- `button_click`: 按钮点击  
- `search_query`: 搜索查询
- `cart_add`: 添加到购物车
- `cart_remove`: 从购物车移除

#### 2. 业务交易事件
- `order_created`: 订单创建
- `order_updated`: 订单状态更新
- `payment_completed`: 支付完成
- `dish_viewed`: 菜品查看
- `dish_ordered`: 菜品下单

#### 3. 系统事件
- `system_error`: 系统错误
- `api_call`: API调用
- `performance_metric`: 性能指标

## 数据仓库设计

### 分层架构
1. **原始层 (Raw Layer)**: 原始事件数据，不变性保证
2. **清洗层 (Clean Layer)**: 数据清洗和标准化
3. **聚合层 (Aggregated Layer)**: 预计算的聚合数据
4. **应用层 (Application Layer)**: BI和推荐专用视图

### 表结构设计

#### 原始事件表 (raw_events)
```sql
CREATE TABLE raw_events (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(50),
    event_timestamp TIMESTAMP,
    user_id VARCHAR(50),
    session_id VARCHAR(50),
    source VARCHAR(50),
    properties JSONB,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 用户维度表 (dim_users)
```sql
CREATE TABLE dim_users (
    user_id VARCHAR(50) PRIMARY KEY,
    phone VARCHAR(20),
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    total_orders INTEGER,
    total_spent DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 菜品维度表 (dim_dishes)
```sql
CREATE TABLE dim_dishes (
    dish_id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2),
    category INTEGER,
    status INTEGER,
    total_ordered INTEGER,
    avg_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 订单事实表 (fact_orders)
```sql
CREATE TABLE fact_orders (
    order_id INTEGER PRIMARY KEY,
    user_id VARCHAR(50),
    table_id VARCHAR(20),
    order_type INTEGER,
    total_price DECIMAL(10,2),
    item_count INTEGER,
    order_date DATE,
    order_hour INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 订单明细事实表 (fact_order_items)
```sql
CREATE TABLE fact_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER,
    dish_id INTEGER,
    quantity INTEGER,
    price DECIMAL(10,2),
    order_date DATE,
    created_at TIMESTAMP
);
```

## ETL管道设计

### 实时处理管道
1. **数据采集**: 前端埋点 + 后端日志
2. **消息队列**: Kafka接收实时事件
3. **流处理**: Flink/Spark Streaming处理
4. **数据存储**: 写入数据仓库

### 批处理管道  
1. **定时调度**: Airflow每日/每小时调度
2. **数据抽取**: 从主数据库抽取增量数据
3. **数据转换**: 清洗、聚合、计算指标
4. **数据加载**: 更新数据仓库

### 数据质量监控
- **完整性检查**: 必填字段验证
- **一致性检查**: 数据逻辑验证  
- **准确性检查**: 业务规则验证
- **及时性检查**: 数据延迟监控