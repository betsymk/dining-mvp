/**
 * 事件追踪中间件
 * 用于捕获用户行为和业务事件
 */

const { v4: uuidv4 } = require('uuid');

class EventTracker {
  constructor() {
    this.eventQueue = [];
  }

  /**
   * 记录事件到队列
   * @param {Object} event - 事件对象
   */
  trackEvent(event) {
    const baseEvent = {
      event_id: uuidv4(),
      event_timestamp: new Date().toISOString(),
      session_id: event.session_id || this.generateSessionId(),
      source: 'server',
      properties: event.properties || {},
      context: event.context || {}
    };

    const fullEvent = { ...baseEvent, ...event };
    
    // 添加到队列，后续批量处理
    this.eventQueue.push(fullEvent);
    
    // TODO: 实现批量发送到消息队列
    this.processEvents();
    
    return fullEvent.event_id;
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 处理事件队列（批量发送）
   */
  async processEvents() {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // TODO: 发送到Kafka或其他消息队列
      await this.sendToMessageQueue(eventsToProcess);
    } catch (error) {
      console.error('Failed to process events:', error);
      // TODO: 实现重试机制和错误处理
    }
  }

  /**
   * 发送到消息队列
   */
  async sendToMessageQueue(events) {
    // 模拟消息队列发送
    console.log(`Sending ${events.length} events to message queue`);
    
    // 在实际实现中，这里会连接到Kafka/RabbitMQ等
    // await kafkaProducer.send(events);
  }

  /**
   * 记录API调用事件
   */
  trackApiCall(req, res, additionalProperties = {}) {
    const event = {
      event_type: 'api_call',
      user_id: req.user?.id || null,
      properties: {
        method: req.method,
        path: req.path,
        status_code: res.statusCode,
        response_time: Date.now() - req.startTime,
        ...additionalProperties
      },
      context: {
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        referer: req.get('Referer')
      }
    };

    return this.trackEvent(event);
  }

  /**
   * 记录业务事件
   */
  trackBusinessEvent(eventType, userId, properties = {}, context = {}) {
    const event = {
      event_type: eventType,
      user_id: userId,
      properties,
      context
    };

    return this.trackEvent(event);
  }
}

// 创建全局实例
const eventTracker = new EventTracker();

// Express中间件
const eventTrackingMiddleware = (req, res, next) => {
  req.startTime = Date.now();
  req.eventTracker = eventTracker;
  
  // 在响应结束时记录API调用
  const originalSend = res.send;
  res.send = function(body) {
    eventTracker.trackApiCall(req, res);
    return originalSend.call(this, body);
  };
  
  next();
};

module.exports = {
  EventTracker,
  eventTrackingMiddleware,
  eventTracker
};