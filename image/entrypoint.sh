#!/bin/bash
set -e

# Start MongoDB service with persistent data directory
echo "Starting MongoDB..."
mkdir -p /data/db
cp ./image/mongod.conf /tmp/mongod.conf
mongod --config /tmp/mongod.conf &
MONGODB_PID=$!

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
for i in {1..30}; do
    if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
        echo "MongoDB is ready!"
        break
    fi
    echo "Waiting for MongoDB... ($i/30)"
    sleep 2
done

# Initialize database and collections
echo "Initializing MongoDB database..."
mongosh < ./image/init_mongodb.js > /dev/null 2>&1

# Reset all tasks and app state to idle
echo "Resetting tasks and app state..."
mongosh < ./image/reset_tasks.js > /dev/null 2>&1

# Copy config files from mounted image directory
echo "Setting up config files..."
cp -r ./image/.config/* ~/.config/ 2>/dev/null || true
# Only chown files we actually copied, not mounted volumes
find ~/.config/ -maxdepth 1 -name "tint2" -exec chown -R tilt:tilt {} \; 2>/dev/null || true

./image/start_all.sh
./image/novnc_startup.sh


# Keep the container running and wait for all services
echo "All services started. Container is ready."
tail -f /dev/null
