// WebSocket实时通知服务
const WebSocket = require('ws');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.connections = new Map(); // userId -> WebSocket connection
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
    
    console.log('WebSocket server initialized');
  }

  handleConnection(ws, req) {
    // 从请求中提取用户信息（通常通过查询参数或headers）
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }
    
    try {
      // 这里应该是实际的JWT验证逻辑
      // 为简化，我们假设token就是userId
      const userId = token; // 实际应用中应该验证JWT并提取userId
      
      // 存储连接
      this.connections.set(userId, ws);
      
      console.log(`WebSocket connected for user: ${userId}`);
      
      // 发送连接确认
      ws.send(JSON.stringify({
        event: 'connected',
        data: { message: 'Connected to notification service' }
      }));
      
      // 处理断开连接
      ws.on('close', () => {
        this.connections.delete(userId);
        console.log(`WebSocket disconnected for user: ${userId}`);
      });
      
      // 处理错误
      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        this.connections.delete(userId);
      });
      
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(4003, 'Authentication failed');
    }
  }

  broadcastNotification(event, data, userIds = null) {
    if (!userIds) {
      // 广播给所有连接的用户
      this.connections.forEach((ws, userId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event, data }));
        }
      });
    } else {
      // 广播给指定用户
      userIds.forEach(userId => {
        const ws = this.connections.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event, data }));
        }
      });
    }
  }

  sendNotification(userId, event, data) {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }
}

module.exports = WebSocketService;