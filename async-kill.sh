#!/bin/bash
PID=$(sudo lsof -n -i ":3000" | grep LISTEN | awk '{print $2}')
if [ -n "$PID" ]; then
  echo "Killing process $PID on port 3000"
  sudo kill -9 "$PID"
else
  echo "No process found listening on port 3000"
fi

if [ ! -f webui.pid ]; then
  echo "No PID file found. Is the Web UI running?"
elif [ "$(cat webui.pid)" = "$PID" ]; then
  echo "Killed PID $PID matches persisted PID. Removing PID file."
else
  # kill $(cat webui.pid)
  echo "Pesisted PID was $(cat webui.pid) - did not match killed PID $PID"
fi
rm webui.pid
