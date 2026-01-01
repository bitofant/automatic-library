#!/bin/bash
npm run build
nohup node dist/index.js &>/dev/null &
echo $! > webui.pid
echo "Web UI started with PID $(cat webui.pid)"
