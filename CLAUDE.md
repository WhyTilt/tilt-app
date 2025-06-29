# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Tilt Computer Automation System

Tilt is an advanced computer automation system built on Anthropic's Computer Use API. It provides automated website testing, UI automation, and task execution with visual feedback through a Docker-containerized environment.

## Core Architecture

**Multi-Container System:**
- **Docker Container**: Ubuntu 22.04 with VNC/X11 virtual desktop
- **Python Backend**: FastAPI server with Anthropic Claude integration
- **Next.js Frontend**: React-based UI with real-time streaming
- **MongoDB**: Task storage and result reporting

**Key Components:**
- `agent/loop.py`: Core AI agent using Claude models
- `agent/tools/`: Extensible tool framework with versioning
- `agent/api_service/`: FastAPI backend for streaming chat
- `nextjs/`: Next.js frontend with feature-based structure
- `agent/task_runner.py`: MongoDB-based task execution

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
cd nextjs && npm run dev    # Port 3001

# Python development  
python -m agent.api_service.main  # Port 8000

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
1. Create tool class inheriting from `BaseAnthropicTool` in `agent/tools/`
2. Implement `__call__()` async method and `to_params()` method
3. Add to appropriate tool group in `agent/tools/groups.py`
4. Register in `agent/tools/__init__.py`

**Existing Tool Categories:**
- **Core**: `computer`, `str_replace_editor`, `bash` - Basic system interaction
- **Web**: `inspect_js`, `inspect_network` - Browser automation (requires Chromium with --remote-debugging-port=9222)
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
- `agent/requirements.txt`: Python dependencies
- `nextjs/package.json`: Node.js dependencies
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

## Design System & Color Palette

Tilt uses a carefully crafted dark theme with specific colors that create an elegant, professional appearance.

### Primary Color Palette
- **Background**: `#18181b` (zinc-900) - Main application background
- **Panel Background**: `#1f1f23` - Floating panels and containers
- **Panel Headers**: `#2a2a2e` (zinc-800) - Panel headers and navigation
- **Borders**: `#3f3f46` (zinc-600) - Panel borders and dividers
- **Text Primary**: `#ffffff` - Main text and headings
- **Text Secondary**: `#a1a1aa` (zinc-400) - Descriptions and labels
- **Text Muted**: `#71717a` (zinc-500) - Timestamps and metadata

### Accent Colors
- **Green**: `#22c55e` (green-500) - Success states, network monitoring indicators
- **Green Light**: `#86efac` (green-300) - Network tab active state, highlights
- **Blue**: `#3b82f6` (blue-500) - JavaScript indicators, primary actions
- **Blue Light**: `#93c5fd` (blue-300) - JavaScript tab active state
- **Red**: `#ef4444` (red-500) - Error states and alerts
- **Yellow/Amber**: `#f59e0b` (amber-500) - Warning states

### Component-Specific Colors
- **Floating Panels**: 
  - Background: `bg-zinc-900` with `border-zinc-600` borders
  - Headers: `bg-zinc-800` with hover states in `hover:bg-zinc-700`
- **Inspector Panel**:
  - Content area: `bg-zinc-900` with proper syntax highlighting
  - Network data: Green accents (`text-green-300`)
  - JavaScript data: Blue accents (`text-blue-300`)
- **Control Buttons**: Semi-transparent `bg-zinc-800/90` with backdrop blur

### Typography
- **Monospace**: Use `font-mono` for code, JSON, and technical data
- **Line Height**: `leading-relaxed` for better readability in code blocks
- **Font Weights**: Regular for content, `font-medium` for labels, `font-semibold` for headings

This color scheme provides excellent contrast, readability, and maintains a modern professional aesthetic that users love.