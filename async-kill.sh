#!/bin/bash
if [ ! -f webui.pid ]; then
    echo "No PID file found. Is the Web UI running?"
    exit 1
fi
kill $(cat webui.pid)
echo "Web UI with PID $(cat webui.pid) has been stopped"
rm webui.pid
