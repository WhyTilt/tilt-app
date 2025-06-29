#!/bin/bash

# Script to view application logs

LOG_DIR="/tmp/logs"

echo "=== Tilt Log Viewer ==="
echo "Available logs:"
echo "1. API Service (api.log)"
echo "2. NextJS App (nextjs.log)"  
echo "3. Startup Process (startup.log)"
echo "4. Desktop Components (xvfb, x11vnc, novnc, etc.)"
echo "5. All logs (tail -f all)"
echo "6. Recent API activity (last 50 lines)"
echo ""

case "${1:-menu}" in
    api|1)
        echo "=== API Service Logs ==="
        tail -f "$LOG_DIR/api.log" 2>/dev/null || echo "API log not found"
        ;;
    nextjs|2)
        echo "=== NextJS App Logs ==="
        tail -f "$LOG_DIR/nextjs.log" 2>/dev/null || echo "NextJS log not found"
        ;;
    startup|3)
        echo "=== Startup Process Logs ==="
        cat "$LOG_DIR/startup.log" 2>/dev/null || echo "Startup log not found"
        ;;
    desktop|4)
        echo "=== Desktop Component Logs ==="
        echo "--- VNC Server ---"
        tail -10 "$LOG_DIR/x11vnc.log" 2>/dev/null || echo "x11vnc log not found"
        echo "--- noVNC Web Interface ---" 
        tail -10 "$LOG_DIR/novnc.log" 2>/dev/null || echo "noVNC log not found"
        echo "--- Window Manager ---"
        tail -10 "$LOG_DIR/mutter.log" 2>/dev/null || echo "Mutter log not found"
        ;;
    all|5)
        echo "=== All Logs (Live Tail) ==="
        tail -f "$LOG_DIR"/*.log 2>/dev/null || echo "No logs found"
        ;;
    recent|6)
        echo "=== Recent API Activity ==="
        tail -50 "$LOG_DIR/api.log" 2>/dev/null || echo "API log not found"
        ;;
    list|ls)
        echo "=== Available Log Files ==="
        ls -la "$LOG_DIR" 2>/dev/null || echo "Log directory not found"
        ;;
    clear)
        echo "=== Clearing All Logs ==="
        rm -f "$LOG_DIR"/*.log
        echo "Logs cleared."
        ;;
    menu|*)
        echo "Usage: $0 [api|nextjs|startup|desktop|all|recent|list|clear]"
        echo ""
        echo "Examples:"
        echo "  $0 api      # View API logs"
        echo "  $0 all      # Tail all logs"
        echo "  $0 recent   # Show recent API activity"
        echo "  $0 list     # List available log files"
        echo "  $0 clear    # Clear all logs"
        ;;
esac