#!/bin/bash

set -e

# Create logs directory using absolute path
LOGS_DIR="/home/tilt/logs"
mkdir -p "$LOGS_DIR"

cd /home/tilt

export DISPLAY=:${DISPLAY_NUM}
echo "Starting desktop environment..."

# Start Xvfb first and wait for it to be ready
echo "Starting Xvfb..." | tee -a "$LOGS_DIR/startup.log"
./image/xvfb_startup.sh 2>&1 | tee -a "$LOGS_DIR/xvfb.log" &

# Start window manager
echo "Starting window manager..." | tee -a "$LOGS_DIR/startup.log"
./image/mutter_startup.sh 2>&1 | tee -a "$LOGS_DIR/mutter.log" &

# Start tint2 panel
echo "Starting tint2 panel..." | tee -a "$LOGS_DIR/startup.log"
./image/tint2_startup.sh 2>&1 | tee -a "$LOGS_DIR/tint2.log" &

# Wait a moment for desktop components to initialize
sleep 3

# Auto-start Chrome with remote debugging for automation
echo "Starting Chrome with remote debugging..." | tee -a "$LOGS_DIR/startup.log"
DISPLAY=:${DISPLAY_NUM} ${BROWSER_BINARY:-chromium-browser} --no-first-run --incognito --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --user-data-dir=/tmp/chrome_profile --no-sandbox --disable-dev-shm-usage --disable-features=VizDisplayCompositor --disable-dbus 2>&1 | tee -a "$LOGS_DIR/chrome.log" &
CHROME_PID=$!
sleep 2  # Give Chrome time to start

# Start x11vnc (depends on Xvfb being ready)
echo "Starting x11vnc..." | tee -a "$LOGS_DIR/startup.log"
./image/x11vnc_startup.sh 2>&1 | tee -a "$LOGS_DIR/x11vnc.log" &

# Start noVNC (depends on x11vnc)
echo "Starting noVNC..." | tee -a "$LOGS_DIR/startup.log"
./image/novnc_startup.sh 2>&1 | tee -a "$LOGS_DIR/novnc.log" &

# Wait for VNC to be ready
sleep 2

# MongoDB is already started by entrypoint.sh - no need to start again
echo "MongoDB already running from entrypoint.sh..." | tee -a "$LOGS_DIR/startup.log"

# Start Python API service with logging
echo "Starting Python API service..." | tee -a "$LOGS_DIR/startup.log"
cd /home/tilt/image
export PYTHONPATH=/home/tilt/image:$PYTHONPATH
python -m agent.api_service.main 2>&1 | tee -a "$LOGS_DIR/py-api-server.txt" &
API_PID=$!

# Start Next.js app on port 3001 (main interface) with logging
echo "Starting Next.js app..." | tee -a "$LOGS_DIR/startup.log"

# Use dedicated dev mount if in dev mode, otherwise use regular path
if [ "$DEV_MODE" = "true" ] && [ -d "/home/tilt/nextjs-dev" ]; then
    cd /home/tilt/nextjs-dev
    echo "Using dedicated dev mount for better file watching..." | tee -a "$LOGS_DIR/startup.log"
else
    cd /home/tilt/image/nextjs
    if [ "$DEV_MODE" = "true" ]; then
        echo "Using standard nextjs path for development..." | tee -a "$LOGS_DIR/startup.log"
    fi
fi

# Ensure .next directory exists with correct permissions
mkdir -p .next && chown -R tilt:tilt .next 2>/dev/null || true
# Fix permissions for image directory
chown -R tilt:tilt /home/tilt/image/nextjs 2>/dev/null || true

# Install dependencies if node_modules doesn't exist or is empty
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "Installing Next.js dependencies..." | tee -a "$LOGS_DIR/startup.log"
    npm install --legacy-peer-deps 2>&1 | tee -a "$LOGS_DIR/npm-install.txt"
fi

# Check if running in development mode
if [ "$DEV_MODE" = "true" ]; then
    echo "Running Next.js in development mode with hot reloading..." | tee -a "$LOGS_DIR/startup.log"
    # Force file watching with polling for Docker + Windows
    CHOKIDAR_USEPOLLING=true WATCHPACK_POLLING=true npm run dev 2>&1 | tee -a "$LOGS_DIR/nextjs.txt" &
else
    echo "Running Next.js in production mode..." | tee -a "$LOGS_DIR/startup.log"
    npm start 2>&1 | tee -a "$LOGS_DIR/nextjs.txt" &
fi
NEXTJS_PID=$!

echo "All services started. API PID: $API_PID, NextJS PID: $NEXTJS_PID" | tee -a "$LOGS_DIR/startup.log"
echo "Logs available in $LOGS_DIR/" | tee -a "$LOGS_DIR/startup.log"

# Quick MongoDB test for tasks collection
echo "Testing MongoDB tasks collection..." | tee -a "$LOGS_DIR/startup.log"
mongosh --eval "use tilt; print('Task count: ' + db.tasks.countDocuments()); db.tasks.find().limit(3).forEach(doc => print('Task: ' + doc.instructions + ' (Status: ' + doc.status + ')'));" 2>&1 | tee -a "$LOGS_DIR/mongodb-test.txt"

# Function to handle cleanup
cleanup() {
    echo "Shutting down services..." | tee -a "$LOGS_DIR/startup.log"
    kill $MONGO_PID $API_PID $NEXTJS_PID $CHROME_PID 2>/dev/null || true
    # Clean up Chrome processes
    pkill chrome 2>/dev/null || true
    pkill chromium-browser 2>/dev/null || true
    pkill google-chrome 2>/dev/null || true
    # Clean up MongoDB temporary database files
    pkill mongod 2>/dev/null || true
    rm -rf /tmp/mongodb-ephemeral-* 2>/dev/null || true
    exit
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for all background processes
wait
