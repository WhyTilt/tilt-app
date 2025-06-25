#!/bin/bash
echo "starting vnc"

# Wait for X display to be ready
echo "Waiting for X display $DISPLAY to be ready..."
timeout=30
while [ $timeout -gt 0 ]; do
    if xdpyinfo -display $DISPLAY >/dev/null 2>&1; then
        echo "X display $DISPLAY is ready"
        break
    fi
    echo "Waiting for X display... ($((31-timeout))/30)"
    sleep 1
    ((timeout--))
done

if [ $timeout -eq 0 ]; then
    echo "X display $DISPLAY failed to become ready within 30 seconds" >&2
    exit 1
fi

(x11vnc -display $DISPLAY \
    -forever \
    -shared \
    -wait 50 \
    -rfbport 5900 \
    -nopw \
    2>/tmp/x11vnc_stderr.log) &

x11vnc_pid=$!

# Wait for x11vnc to start
timeout=10
while [ $timeout -gt 0 ]; do
    if netstat -tuln 2>/dev/null | grep -q ":5900 " || ss -tuln 2>/dev/null | grep -q ":5900 "; then
        echo "x11vnc started successfully on port 5900"
        break
    fi
    sleep 1
    ((timeout--))
done

if [ $timeout -eq 0 ]; then
    echo "x11vnc failed to start, stderr output:" >&2
    cat /tmp/x11vnc_stderr.log >&2
    exit 1
fi

: > /tmp/x11vnc_stderr.log

# Monitor x11vnc process in the background
(
    while true; do
        if ! kill -0 $x11vnc_pid 2>/dev/null; then
            echo "x11vnc process crashed, restarting..." >&2
            if [ -f /tmp/x11vnc_stderr.log ]; then
                echo "x11vnc stderr output:" >&2
                cat /tmp/x11vnc_stderr.log >&2
                rm /tmp/x11vnc_stderr.log
            fi
            exec "$0"
        fi
        sleep 5
    done
) &
