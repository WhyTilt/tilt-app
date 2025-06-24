#!/bin/bash
set -e

# Start MongoDB service with ephemeral data directory
echo "Starting MongoDB..."
sudo mkdir -p /tmp/ephemeral-mongodb-db
sudo chown -R mongodb:mongodb /tmp/ephemeral-mongodb-db
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
echo "Initializing MongoDB database and loading tasks..."
if [ -f "./init_tasks.json" ]; then
    echo "Found init_tasks.json, loading tasks into database..."
    mongosh < ./init_mongodb.js
else
    echo "Warning: init_tasks.json not found, initializing empty database"
    mongosh --eval "use('signet-demo'); db.createCollection('tasks'); db.tasks.createIndex({'status': 1}); db.tasks.createIndex({'created_at': 1}); print('Empty database initialized');"
fi

./start_all.sh
./novnc_startup.sh

python http_server.py > /tmp/server_logs.txt 2>&1 &

STREAMLIT_SERVER_PORT=8501 python -m streamlit run computer_using_agent/streamlit.py > /tmp/streamlit_stdout.log &

echo "✨ Computer Use Demo is ready!"
echo "➡️  Open http://localhost:8080 in your browser to begin"

# Keep the container running
tail -f /dev/null
