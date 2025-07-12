# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Python-based autonomous agent system that combines Anthropic's Claude computer use tools with MongoDB task management. The agent can execute tasks involving browser automation, JavaScript inspection, network monitoring, and file system operations.

## Architecture

### Core Components

- **`loop.py`** - Main sampling loop using Anthropic's computer use tools
- **`task_runner.py`** - MongoDB-based task queue management with autonomous execution
- **`api_service/`** - FastAPI web service for task management and chat completion
- **`tools/`** - Extended tool collection including computer, bash, network inspection, and MongoDB integration

### Key Design Patterns

- **Async/await throughout** - All tool execution and sampling loops are asynchronous
- **Tool composition** - Tools can access each other via `_tool_collection` attribute injection
- **MongoDB integration** - Tasks are stored in MongoDB with status tracking (pending/running/completed/error)
- **Streaming responses** - API uses Server-Sent Events for real-time tool execution feedback

## Common Commands

### Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the API service
python -m api_service.main

# Run continuous task processing
python -c "import asyncio; from task_runner import TaskRunner; runner = TaskRunner(); asyncio.run(runner.run_continuous())"
```

### Production
```bash
# Start API service for production
uvicorn api_service.main:app --host 0.0.0.0 --port 8000

# MongoDB connection string: mongodb://localhost:27017/
```

## Environment Variables

Required:
- `CURRENT_TASK_ID` - Set automatically by task runner for MongoDB reporting

Optional:
- `ANTHROPIC_MODEL` - Model to use (default: claude-sonnet-4-20250514)
- `API_PROVIDER` - API provider (default: anthropic)

## Tool System

### Available Tools
- `computer` - Screenshot, click, type, scroll operations
- `bash` - Shell command execution
- `str_replace_based_edit_tool` - File editing
- `inspect_js` - JavaScript code execution in browser
- `inspect_network` - Network traffic monitoring
- `mongodb_reporter` - Task result reporting
- `mongodb_query` - Database querying

### Tool Versions
- `computer_use_20241022` - Legacy computer use tools
- `computer_use_20250124` - Current computer use tools with enhanced features

## Task Management

### Task Schema
Tasks in MongoDB (`tilt.tasks` collection):
- `instructions` - Array of instruction strings or single instruction
- `label` - Optional display name  
- `status` - pending/running/completed/error
- `tool_use` - Optional tool-specific configuration
- `created_at`, `started_at`, `completed_at` - Timestamps
- `result`, `error` - Execution results

### Task Processing Flow
1. TaskRunner polls MongoDB for pending tasks
2. Task status updated to "running"
3. Instructions fed to sampling loop with computer use tools
4. Results saved back to MongoDB with completion status
5. Optional pause after completion for inspection

## System Prompt Features

The system prompt includes:
- Ubuntu virtual machine context with GUI applications
- Chrome browser automation with remote debugging
- Network monitoring auto-start when Chrome is detected
- PDF processing via curl + pdftotext
- JSON data capture and preservation requirements
- Screenshot-based verification workflows

## Logging

- Tool execution: `/home/tilt/logs/tools.txt`
- API service: `/home/tilt/logs/api-detailed.log`
- Structured logging with tool call start/success/error tracking

## API Endpoints

### Core
- `POST /api/v1/chat/stream` - Streaming chat completion
- `POST /api/v1/tools/execute` - Direct tool execution

### Task Management
- `GET /api/v1/tasks` - List all tasks
- `GET /api/v1/next-task` - Get next pending task
- `POST /api/v1/tasks` - Create new task
- `POST /api/v1/tasks/{id}/start` - Mark task as running
- `POST /api/v1/tasks/{id}/complete` - Mark task as completed
- `POST /api/v1/tasks/{id}/error` - Mark task as failed

### Utilities
- `POST /api/v1/cleanup-browser` - Clean browser state between tasks
- `GET /api/v1/panels` - Get UI panel preferences
- `POST /api/v1/panels` - Save UI panel preferences

## Special Considerations

- **Network monitoring** auto-starts when Chrome is detected with remote debugging
- **Cross-tool communication** via `_tool_collection` attribute injection
- **Prompt caching** enabled for Anthropic API to reduce costs
- **Image truncation** for long conversations to manage context
- **Browser cleanup** between tasks to prevent state pollution
- **VNC display** management for GUI applications on headless systems