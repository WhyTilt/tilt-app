# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Tilt Computer Automation System

Tilt is an advanced computer automation system built on Anthropic's Computer Use API. It provides automated website testing, UI automation, and task execution with visual feedback through a Docker-containerized environment.

## Core Architecture

**Docker-Based System:**
- **Docker Container**: Ubuntu 22.04 with VNC/X11 virtual desktop environment
- **Python Backend**: FastAPI server with Anthropic Claude integration (`image/agent/`)
- **Next.js Frontend**: React-based UI with real-time streaming (`image/nextjs/`)
- **MongoDB**: Task storage and result reporting (runs in container)

**Key Components:**
- `image/agent/loop.py`: Core AI agent using Claude models and agentic sampling loop
- `image/agent/tools/`: Extensible tool framework with versioning system
- `image/agent/api_service/`: FastAPI backend for streaming chat API
- `image/nextjs/src/app/`: Next.js frontend with feature-based structure
- `image/agent/task_runner.py`: MongoDB-based task execution system

## Development Commands

**Docker Operations:**
```bash
./build.sh                    # Build optimized Docker image (production mode)
./build.sh true               # Build in development mode
./run.sh                      # Run with persistent data (production mode)
./run.sh --dev                # Run in development mode
```

**Local Development (outside container):**
```bash
# Frontend development (if extracted from image/)
cd image/nextjs && npm install && npm run dev    # Port 3001

# Python development (if extracted from image/)
cd image && python -m agent.api_service.main     # Port 8000

# Code Quality
ruff check                    # Python linting 
ruff format                   # Python formatting
cd image/nextjs && npm run lint    # Next.js linting

# No tests currently exist in the codebase
```

**Note:** The main source code currently resides in the `image/` directory. The build process copies code from root-level `agent/` and `nextjs/` directories to `image/` for containerization, but those root directories appear to have been removed in the current state.

## Tool System Architecture

The system uses a versioned tool framework where tools are grouped by Anthropic Computer Use API version:

```python
TOOL_GROUPS_BY_VERSION = {
    "computer_use_20241022": [ComputerTool20241022, EditTool20241022, BashTool20241022, ...],
    "computer_use_20250124": [ComputerTool20250124, EditTool20250124, BashTool20250124, ...],
    "computer_use_20250429": [ComputerTool20250124, EditTool20250429, BashTool20250124, ...]
}
```

**Available Tool Categories:**
- **Core**: `computer`, `str_replace_editor`, `bash` - Basic system interaction
- **Web**: `inspect_js`, `inspect_network` - Browser automation (requires Chrome with --remote-debugging-port=9222)
- **Database**: `mongodb_reporter`, `mongodb_query` - Task result storage and retrieval
- **Testing**: `assert` - Result validation and assertions

**Adding New Tools:**
1. Create tool class inheriting from `BaseAnthropicTool` in `image/agent/tools/`
2. Implement required `__call__()` async method and `to_params()` method
3. Add to appropriate tool group in `image/agent/tools/groups.py`
4. Register in `image/agent/tools/__init__.py`

## Environment & Configuration


**Port Configuration:**
- 3001: Next.js frontend
- 8000: FastAPI backend
- 5900: VNC server (for direct VNC client access)
- 6080: noVNC web client
- 27017: MongoDB

**Key Configuration Files:**
- `image/agent/requirements.txt`: Python dependencies
- `image/nextjs/package.json`: Node.js dependencies
- `Dockerfile`: Multi-stage container build with optimization
- `pyproject.toml` & `ruff.toml`: Python tooling configuration

## Frontend Architecture (Next.js)

The Next.js app uses a feature-based folder structure in `image/nextjs/src/app/`:

```
src/app/
├── api/v1/                 # API route handlers
│   ├── chat/stream/        # Streaming chat endpoint
│   ├── health/             # Health check
│   └── panels/             # Panel data endpoints
├── bottom-panel/           # Main panel system
│   ├── action-panel/       # Action execution UI
│   ├── inspector-panel/    # Tool results and data inspection
│   ├── instruction-panel/  # User input interface
│   ├── log-panel/          # System logging
│   ├── task-runner-panel/  # Task execution management
│   └── thinking-panel/     # AI thinking display
├── screenshots/            # Screenshot viewing and management
├── modals/                 # Dialog components
├── task-runner/            # Task execution context
├── task/                   # Task management context
└── panel-preferences/      # UI preferences
```

**State Management:** React Context with separate contexts for tasks, app state, task runner, and panel preferences.

**Key Dependencies:**
- Next.js 14.2.3 with React 18
- Tailwind CSS for styling
- Lucide React for icons
- Axios for API calls

## Task System

Tasks are stored in MongoDB with the following structure:
```python
{
    "_id": ObjectId,
    "instructions": str,         # Natural language instructions
    "js_expression": str,        # Legacy JavaScript support (optional)
    "tool_use": dict,           # Tool-specific parameters
    "status": "pending|running|completed|error",
    "result": dict,             # Execution results
    "metadata": dict            # Additional task metadata
}
```

## Debugging & Logging

**Log Files:** `/home/tilt/logs/` (when running in container)
- `api-detailed.log`: Complete API and tool execution logs
- `py-api-server.txt`: Server startup and HTTP request logs
- `tools.txt`: Dedicated tool execution logging

**Tool Result Format:** All tools return `ToolResult` objects with standardized `output`, `error`, and optional `base64_image` fields.

## Container Access Points

When running the container:
- **Frontend**: [http://localhost:3001](http://localhost:3001) - Main Tilt application
- **API**: [http://localhost:8000](http://localhost:8000) - FastAPI backend
- **VNC Web**: [http://localhost:6080](http://localhost:6080) - noVNC web interface
- **VNC Direct**: `vnc://localhost:5900` - Direct VNC client access

## Data Persistence

The system uses volume mounts for persistence:
- `./user_data/`: User files, browser data, application configs
- `./db_data/`: MongoDB data persistence
- `./logs/`: Application and tool execution logs

## Development Workflow

1. **Local Development**: Work in `image/` directory for immediate testing
2. **Container Development**: Use `./run.sh --dev` for development mode
3. **Production Build**: Use `./run.sh` for optimized builds
4. **Code Quality**: Run `ruff check` and `ruff format` before commits
5. **Container Rebuild**: Use `./build.sh` when dependencies change