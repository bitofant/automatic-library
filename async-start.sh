#!/bin/bash
npm run build
nohup npm start &>/dev/null &
echo $! > webui.pid
echo "Web UI started with PID $(cat webui.pid)"
