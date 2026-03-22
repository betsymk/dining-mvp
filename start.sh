#!/bin/bash
cd /root/.openclaw/workspace/dining-mvp

# 停止旧进程
if [ -f app.pid ]; then
    kill $(cat app.pid) 2>/dev/null
fi
if [ -f tunnel.pid ]; then
    kill $(cat tunnel.pid) 2>/dev/null
fi
sleep 2

# 启动应用
nohup npm start > dining-mvp.log 2>&1 &
echo $! > app.pid

# 启动隧道
nohup cloudflared tunnel --url http://localhost:3000 > tunnel.log 2>&1 &
echo $! > tunnel.pid

sleep 5
echo "服务已启动"
echo "应用PID: $(cat app.pid)"
echo "隧道PID: $(cat tunnel.pid)"
echo "访问链接: $(cat tunnel.log | grep -o 'https://.*\.trycloudflare\.com' | head -1)"
