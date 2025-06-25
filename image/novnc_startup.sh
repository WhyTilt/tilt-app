#!/bin/bash
echo "starting noVNC"

# Wait for x11vnc to be ready
echo "Waiting for x11vnc to be ready on port 5900..."
timeout=30
while [ $timeout -gt 0 ]; do
    if netstat -tuln 2>/dev/null | grep -q ":5900 " || ss -tuln 2>/dev/null | grep -q ":5900 "; then
        echo "x11vnc is ready on port 5900"
        break
    fi
    echo "Waiting for x11vnc... ($((31-timeout))/30)"
    sleep 1
    ((timeout--))
done

if [ $timeout -eq 0 ]; then
    echo "x11vnc failed to start within 30 seconds" >&2
    exit 1
fi

# Start noVNC with explicit websocket settings
/opt/noVNC/utils/novnc_proxy \
    --vnc localhost:5900 \
    --listen 6080 \
    --web /opt/noVNC \
    > /tmp/novnc.log 2>&1 &

# Wait for noVNC to start
timeout=10
while [ $timeout -gt 0 ]; do
    if netstat -tuln | grep -q ":6080 "; then
        break
    fi
    sleep 1
    ((timeout--))
done

echo "noVNC started successfully"
