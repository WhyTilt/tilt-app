#!/bin/bash

set -e

# Create logs directory
mkdir -p ./logs

# Start MongoDB service with ephemeral database
echo "Starting MongoDB service with ephemeral database..." | tee -a ./logs/startup.log

# Create temporary database directory that gets cleared on each boot
DB_TEMP_DIR="/tmp/mongodb-ephemeral-$$"
rm -rf "$DB_TEMP_DIR"
mkdir -p "$DB_TEMP_DIR"
echo "Created ephemeral database directory: $DB_TEMP_DIR" | tee -a ./logs/startup.log

# Start MongoDB with temporary database path (using modern MongoDB options)
mongod --dbpath "$DB_TEMP_DIR" --fork --logpath ./logs/mongodb.log

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..." | tee -a ./logs/startup.log
sleep 3

# Initialize database and collections
echo "Initializing MongoDB database and loading tasks..." | tee -a ./logs/startup.log
if [ -f "./init_tasks.json" ]; then
    echo "Found init_tasks.json, loading tasks into database..." | tee -a ./logs/startup.log
    mongosh < ./init_mongodb.js 2>&1 | tee -a ./logs/mongodb-init.txt
else
    echo "Warning: init_tasks.json not found, initializing empty database" | tee -a ./logs/startup.log
    mongosh --eval "use('signet-demo'); db.createCollection('tasks'); db.tasks.createIndex({'status': 1}); db.tasks.createIndex({'created_at': 1}); print('Empty database initialized');" 2>&1 | tee -a ./logs/mongodb-init.txt
fi

# Quick MongoDB test for tasks collection
echo "Testing MongoDB tasks collection..." | tee -a ./logs/startup.log
mongosh --eval "use signet-demo; print('Task count: ' + db.tasks.countDocuments()); db.tasks.find().limit(3).forEach(doc => print('Task: ' + doc.instructions + ' (Status: ' + doc.status + ')'));" 2>&1 | tee -a ./logs/mongodb-test.txt

echo "MongoDB startup and initialization complete!" | tee -a ./logs/startup.log