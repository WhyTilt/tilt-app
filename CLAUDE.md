# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# AutomagicIT Computer Automation System

AutomagicIT is an advanced computer automation system built on Anthropic's Computer Use API. It provides automated website testing, UI automation, and task execution with visual feedback through a Docker-containerized environment.

## Core Architecture

**Multi-Container System:**
- **Docker Container**: Ubuntu 22.04 with VNC/X11 virtual desktop
- **Python Backend**: FastAPI server with Anthropic Claude integration
- **Next.js Frontend**: React-based UI with real-time streaming
- **MongoDB**: Task storage and result reporting

**Key Components:**
- `computer_using_agent/loop.py`: Core AI agent using Claude models
- `computer_using_agent/tools/`: Extensible tool framework with versioning
- `computer_using_agent/api_service/`: FastAPI backend for streaming chat
- `computer_using_agent/chat/`: Next.js frontend with feature-based structure
- `computer_using_agent/task_runner.py`: MongoDB-based task execution

## Development Commands

**Docker Operations:**
```bash
./build.sh                    # Build optimized Docker image
./run.sh                      # Run with persistent data
./run.sh --tasks             # Run in tasks mode
```

**Local Development:**
```bash
# Frontend development
cd computer_using_agent/chat && npm run dev    # Port 3001

# Python development  
python -m computer_using_agent.api_service.main  # Port 8000

# Testing
pytest tests/                 # Python tests
npm test                      # Frontend tests (in chat/ directory)
```

## Tool System Architecture

The system uses a versioned tool framework where tools are grouped by API version:

```python
TOOL_GROUPS_BY_VERSION = {
    "computer_use_20241022": [ComputerTool, EditTool, BashTool, ...],
    "computer_use_20250124": [Updated tools],
    "computer_use_20250429": [Latest tools]
}
```

**Adding New Tools:**
1. Create tool class inheriting from `BaseAnthropicTool` in `computer_using_agent/tools/`
2. Implement `__call__()` async method and `to_params()` method
3. Add to appropriate tool group in `computer_using_agent/tools/groups.py`
4. Register in `computer_using_agent/tools/__init__.py`

**Existing Tool Categories:**
- **Core**: `computer`, `str_replace_editor`, `bash` - Basic system interaction
- **Web**: `inspect_js`, `inspect_network` - Browser automation (requires Chrome with --remote-debugging-port=9222)
- **Database**: `mongodb_reporter`, `mongodb_query` - Task result storage
- **Testing**: `assert` - Result validation

## Environment & Configuration

**Required Environment Variables:**
- `ANTHROPIC_API_KEY`: Claude API access
- `MONGODB_URI`: Database connection string  
- `API_PROVIDER`: anthropic/bedrock/vertex (default: anthropic)
- `ANTHROPIC_MODEL`: Model selection (default: claude-sonnet-4-20250514)

**Port Configuration:**
- 3001: Next.js frontend (dev)
- 8000: FastAPI backend
- 8080: Combined interface (production)
- 5900: VNC server
- 6080: noVNC web client
- 27017: MongoDB

**Key Configuration Files:**
- `computer_using_agent/requirements.txt`: Python dependencies
- `computer_using_agent/chat/package.json`: Node.js dependencies
- `Dockerfile`: Multi-stage container build with caching
- `image/init_tasks.json`: Default task definitions

## Frontend Architecture (Next.js)

Uses feature-based folder structure (no generic "components" folder):

```
src/app/
├── bottom-panel/           # Panel components
│   ├── task-runner-panel/  # Task execution UI  
│   ├── instruction-panel/  # User input
│   └── inspector-panel/    # Tool results
├── screenshots/            # Visual feedback
├── modals/                # Dialog components
└── api/v1/                # API routes
```

**State Management:** React Context with separate contexts for tasks, app state, and task runner.

## Task System

**Task Model (MongoDB):**
```python
{
    "_id": ObjectId,
    "instructions": str,         # Natural language instructions
    "js_expression": str,        # Legacy JavaScript support  
    "tool_use": dict,           # Tool-specific parameters
    "status": "pending|running|completed|error",
    "result": dict,             # Execution results
    "metadata": dict            # Additional data
}
```

**Variable Substitution:** Tasks support parameterization with `{URL}`, `{MONGODB_URI}`, etc.

## Debugging & Logging

**Log Files:** `/home/computeragent/logs/`
- `api-detailed.log`: Complete API and tool execution logs
- `py-api-server.txt`: Server startup and HTTP request logs
- `tools.txt`: Dedicated tool execution logging

**Tool Result Format:** All tools return `ToolResult` objects with standardized `output`, `error`, and optional `base64_image` fields.

## Development Guidelines

1. **GIT**: Start from `dev` branch, create feature/bugfix branches, commit frequently
2. **GITHUB**: Use issues for features/bugs, move to "In Development" when starting work
3. **CODING**: Small atomic changes, composition over inheritance, functional over imperative
4. **REFLECT**: Verify work runs correctly before marking complete
5. **Frontend**: Feature-based folders, break components into self-contained files
6. **FUNCTIONAL PROGRAMMING**: Prefer ternary operators, functional patterns, and simple expressions over nested conditionals and complex if/else statements

## GitHub Project Management

**Move issues between columns:**

**Move to Todo:**
```bash
gh project item-edit --project-id PVT_kwHODNICkM4A7fzF --id ITEM_ID --field-id PVTSSF_lAHODNICkM4A7fzFzgvxw9g --single-select-option-id ca348567
```

**Move to In Development:**
```bash
gh project item-edit --project-id PVT_kwHODNICkM4A7fzF --id ITEM_ID --field-id PVTSSF_lAHODNICkM4A7fzFzgvxw9g --single-select-option-id e04a4fe7
```

**Move to In Test:**
```bash
gh project item-edit --project-id PVT_kwHODNICkM4A7fzF --id ITEM_ID --field-id PVTSSF_lAHODNICkM4A7fzFzgvxw9g --single-select-option-id 60f4302e
```

**Move to Completed:**
```bash
gh project item-edit --project-id PVT_kwHODNICkM4A7fzF --id ITEM_ID --field-id PVTSSF_lAHODNICkM4A7fzFzgvxw9g --single-select-option-id d7545599
```

**Get Item ID for an issue:**
```bash
gh project item-list 1 --owner itsmarktellez --format json | jq -r '.items[] | select(.content.number == ISSUE_NUMBER) | .id'
```