#!/bin/bash
set -e

# Start MongoDB service with persistent data directory
echo "Starting MongoDB..."
sudo mkdir -p /data/db
sudo chown -R mongodb:mongodb /data/db
sudo cp ./mongod.conf /tmp/mongod.conf
sudo chown mongodb:mongodb /tmp/mongod.conf
sudo -u mongodb mongod --config /tmp/mongod.conf

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
mongosh < ./init_mongodb.js > /dev/null 2>&1

# Reset all tasks and app state to idle
echo "Resetting tasks and app state..."
mongosh < ./reset_tasks.js > /dev/null 2>&1

./start_all.sh
./novnc_startup.sh


# Keep the container running
tail -f /dev/null
