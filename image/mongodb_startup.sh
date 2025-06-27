#!/bin/bash

set -e

# Create logs directory
mkdir -p ./logs

# Start MongoDB service with persistent database
echo "Starting MongoDB service with persistent database..." | tee -a ./logs/startup.log

# Use persistent data directory mounted from host
DB_PERSISTENT_DIR="/data/db"
echo "Using persistent database directory: $DB_PERSISTENT_DIR" | tee -a ./logs/startup.log

# Start MongoDB with persistent database path
mongod --dbpath "$DB_PERSISTENT_DIR" --fork --logpath ./logs/mongodb.log

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..." | tee -a ./logs/startup.log
sleep 3

# Initialize database and collections  
echo "Initializing MongoDB database with persistent storage..." | tee -a ./logs/startup.log
mongosh < ./init_mongodb.js 2>&1 | tee -a ./logs/mongodb-init.txt

# Reset all tasks and app state to idle
echo "Resetting tasks and app state to idle..." | tee -a ./logs/startup.log
mongosh < ./reset_tasks.js 2>&1 | tee -a ./logs/mongodb-reset.txt

# Quick MongoDB test for tasks collection
echo "Testing MongoDB tasks collection..." | tee -a ./logs/startup.log
mongosh --eval "use automator; print('Task count: ' + db.tasks.countDocuments()); db.tasks.find().limit(3).forEach(doc => print('Task: ' + doc.instructions + ' (Status: ' + doc.status + ')'));" 2>&1 | tee -a ./logs/mongodb-test.txt

echo "MongoDB startup and initialization complete!" | tee -a ./logs/startup.log