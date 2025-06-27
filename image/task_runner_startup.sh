#!/bin/bash

# Task Runner Startup Script
# This script starts the continuous task processing daemon

set -e

LOGS_DIR="/home/computeragent/logs"
mkdir -p "$LOGS_DIR"

echo "Starting Task Runner daemon..." | tee -a "$LOGS_DIR/startup.log"

cd /home/computeragent

# Set up environment variables
export PYTHONPATH=/home/computeragent:$PYTHONPATH
export MONGODB_URI="mongodb://localhost:27017/automator"

# Check if MongoDB is running
echo "Checking MongoDB connection..." | tee -a "$LOGS_DIR/task-runner.log"
for i in {1..10}; do
    if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
        echo "MongoDB connection confirmed!" | tee -a "$LOGS_DIR/task-runner.log"
        break
    fi
    echo "Waiting for MongoDB... ($i/10)" | tee -a "$LOGS_DIR/task-runner.log"
    sleep 2
done

# Start the task runner daemon
echo "Starting continuous task processing..." | tee -a "$LOGS_DIR/task-runner.log"

python -c "
import asyncio
import os
import logging
from agent.task_runner import TaskRunner

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('task_runner_daemon')

async def main():
    mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/automator')
    logger.info(f'Starting TaskRunner with MongoDB URI: {mongodb_uri}')
    
    runner = TaskRunner(mongodb_uri)
    
    try:
        # Run continuous task processing
        await runner.run_continuous()
    except KeyboardInterrupt:
        logger.info('Task runner interrupted by user')
    except Exception as e:
        logger.error(f'Task runner error: {e}')
    finally:
        runner.stop()
        logger.info('Task runner stopped')

if __name__ == '__main__':
    asyncio.run(main())
" 2>&1 | tee -a "$LOGS_DIR/task-runner.log" &

TASK_RUNNER_PID=$!
echo "Task Runner started with PID: $TASK_RUNNER_PID" | tee -a "$LOGS_DIR/startup.log"

# Return the PID for the calling script
echo $TASK_RUNNER_PID