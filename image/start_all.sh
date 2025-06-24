#!/bin/bash

set -e

# Create logs directory using absolute path
LOGS_DIR="/home/computeragent/logs"


cd /home/computeragent

export DISPLAY=:${DISPLAY_NUM}
echo "Starting desktop environment..."

./xvfb_startup.sh 2>&1 | tee -a "$LOGS_DIR/xvfb.log" &
./tint2_startup.sh 2>&1 | tee -a "$LOGS_DIR/tint2.log" &
./mutter_startup.sh 2>&1 | tee -a "$LOGS_DIR/mutter.log" &
./x11vnc_startup.sh 2>&1 | tee -a "$LOGS_DIR/x11vnc.log" &
./novnc_startup.sh 2>&1 | tee -a "$LOGS_DIR/novnc.log" &

# Wait a moment for desktop to initialize
sleep 2

# MongoDB is already started by entrypoint.sh - no need to start again
echo "MongoDB already running from entrypoint.sh..." | tee -a "$LOGS_DIR/startup.log"

# Start Python API service with logging
echo "Starting Python API service..." | tee -a "$LOGS_DIR/startup.log"
cd /home/computeragent
export PYTHONPATH=/home/computeragent:$PYTHONPATH
python -m computer_using_agent.api_service.main 2>&1 | tee -a "$LOGS_DIR/py-api-server.txt" &
API_PID=$!

# Start Next.js app on port 8080 (main interface) with logging
echo "Starting Next.js app..." | tee -a "$LOGS_DIR/startup.log"
cd /home/computeragent/computer_using_agent/chat
PORT=8080 npm start 2>&1 | tee -a "$LOGS_DIR/nextjs.txt" &
NEXTJS_PID=$!

echo "All services started. MongoDB PID: $MONGO_PID, API PID: $API_PID, NextJS PID: $NEXTJS_PID" | tee -a "$LOGS_DIR/startup.log"
echo "Logs available in $LOGS_DIR/" | tee -a "$LOGS_DIR/startup.log"

# Quick MongoDB test for tasks collection
echo "Testing MongoDB tasks collection..." | tee -a "$LOGS_DIR/startup.log"
mongosh --eval "use signet-demo; print('Task count: ' + db.tasks.countDocuments()); db.tasks.find().limit(3).forEach(doc => print('Task: ' + doc.instructions + ' (Status: ' + doc.status + ')'));" 2>&1 | tee -a "$LOGS_DIR/mongodb-test.txt"

# Function to handle cleanup
cleanup() {
    echo "Shutting down services..." | tee -a "$LOGS_DIR/startup.log"
    kill $MONGO_PID $API_PID $NEXTJS_PID 2>/dev/null || true
    # Clean up MongoDB temporary database files
    pkill mongod 2>/dev/null || true
    rm -rf /tmp/mongodb-ephemeral-* 2>/dev/null || true
    exit
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for all background processes
wait
