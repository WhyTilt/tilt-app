# Tilt

[![License](https://img.shields.io/badge/License-Small%20Business%20Source-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![Website](https://img.shields.io/badge/Website-whytilt.com-FF6B35?logo=safari&logoColor=white)](https://whytilt.com)

**Advanced Computer Automation System powered by Claude Sonnet 4**

Tilt is a sophisticated computer automation platform that transforms natural language instructions into automated workflows. Built on Anthropic's Computer Use API, it provides intelligent, AI-driven automation for web testing, UI interaction, and complex task execution through a containerized virtual desktop environment.

⭐️ **Your star powers our automation magic**

## About

Tilt combines the power of large language models with practical computer automation tools to create a comprehensive testing and automation platform. Whether you're automating e-commerce workflows, performing quality assurance testing, or extracting data from complex web applications, Tilt provides the visual feedback and programmatic control you need.

**Key Capabilities:**
- 🖥️ Full desktop automation with visual feedback
- 🌐 Advanced web testing and data extraction
- 📊 Built-in analytics monitoring (Google Analytics, Adobe Analytics)
- 🔄 Task management with MongoDB persistence
- 🛠️ Extensible tool system with custom integrations
- 📱 Real-time streaming interface with Next.js

## Architecture

Tilt is built as a multi-container system with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI    │    │  FastAPI Server  │    │  Docker Desktop │
│   Port 3001     │◄──►│   Port 8000      │◄──►│   Ubuntu 22.04  │
│                 │    │  Claude AI Loop  │    │   X11/VNC       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────┐
                    │      MongoDB        │
                    │  Task Management    │
                    │   Port 27017       │
                    └─────────────────────┘
```

### Core Components

- **Docker Container**: Ubuntu 22.04 with complete X11/VNC virtual desktop
- **Python Backend**: FastAPI server with Claude integration and AI agent loop
- **Next.js Frontend**: React-based UI with real-time streaming and visual feedback
- **MongoDB Database**: Task storage, execution tracking, and result reporting
- **Tool System**: Extensible automation tools with versioning support

## Quick Start

### Prerequisites

- Docker installed and running
- At least 4GB RAM available

### One-Line Install

Tilt supports multiple architectures:
- **AMD64** (Intel/AMD processors)
- **ARM64** (Apple Silicon, ARM processors)

```bash
curl -sSL install.whytilt.com | bash
```

### Manual Install

```bash
# Clone the repository
git clone https://github.com/WhyTilt/tilt-app.git
cd tilt-app

# Build and run with persistent data
./run.sh
```

### Getting Started

1. **Install Tilt** using the one-line installer above
2. **Navigate to the installation directory**:
   ```bash
   cd tilt-app
   ```
3. **Start Tilt**:
   ```bash
   ./run.sh
   ```
4. **Open your browser** to [http://localhost:3001](http://localhost:3001)
5. **Enter your Anthropic API key** when prompted ([Get one here](https://console.anthropic.com/))
6. **Start automating!**


## Features

### 🤖 AI-Powered Automation
- **Natural Language Processing**: Describe your automation needs in plain English
- **Visual Context Understanding**: AI sees and interacts with your screen like a human
- **Multi-Step Workflows**: Complex automation sequences with decision-making capabilities
- **Error Recovery**: Intelligent error handling and retry mechanisms

### 🛠️ Advanced Tool System
- **Computer Control**: Full mouse, keyboard, and application control
- **Web Automation**: Advanced browser interaction with Chromium DevTools integration
- **JavaScript Execution**: Run custom JS code for complex DOM manipulation
- **Network Monitoring**: Capture and analyze HTTP requests and responses
- **Database Integration**: MongoDB reporting and data persistence
- **Custom Tools**: Extensible architecture for adding new capabilities

### 📊 Analytics & Monitoring
- **Real-time Feedback**: Watch automation in real-time with screenshot streams
- **Execution Logging**: Detailed logs of all tool executions and API calls
- **Task Management**: Queue, schedule, and monitor automation tasks
- **Performance Metrics**: Track execution times and success rates
- **Error Reporting**: Comprehensive error tracking and debugging

### 🎯 Use Cases

**E-commerce Testing**
```
✓ Product catalog validation
✓ Checkout flow testing  
✓ Price monitoring
✓ Inventory tracking
✓ A/B test validation
```

**Quality Assurance**
```
✓ Regression testing
✓ Cross-browser compatibility
✓ Performance testing
✓ Accessibility validation
✓ Visual regression detection
```

**Data Extraction**
```
✓ Web scraping with context
✓ API monitoring and testing
✓ Analytics data capture
✓ Competitive intelligence
✓ Content migration
```

## Interface Access

Once running, Tilt provides multiple access points:

- **Frontend**: [http://localhost:3001](http://localhost:3001) - Next.js application server
- **Python API**: [http://localhost:8000](http://localhost:8000) - FastAPI backend server
- **Desktop View**: [http://localhost:6080/vnc.html](http://localhost:6080/vnc.html) - Direct desktop access
- **VNC Client**: `vnc://localhost:5900` - For external VNC clients

## Development

### Local Development Setup

```bash
./build.sh
```

### Adding Custom Tools

1. Create your tool class in `agent/tools/`
2. Inherit from `BaseAnthropicTool`
3. Implement required methods:
   ```python
   async def __call__(self, **kwargs) -> ToolResult:
       # Tool implementation
       pass
   
   def to_params(self) -> dict:
       # Tool parameter definition
       pass
   ```
4. Register in `agent/tools/groups.py`

### Testing

We need some work here :D

## Performance Optimization

- **Resolution**: Use 1024x768 for optimal AI performance
- **Memory**: Minimum 4GB RAM, 8GB recommended for complex workflows
- **Storage**: Persistent data in `user_data/` directory
- **Logging**: Comprehensive logs in `/home/tilt/logs/`

## Troubleshooting

### Common Issues

**Docker Permission Errors**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**API Rate Limits**
- Monitor usage in logs
- Implement delays between requests
- Use prompt caching for efficiency

**Display Issues**
- Check VNC connection on port 5900
- Verify desktop resolution settings
- Review X11 logs in container

## Community & Support

- 🌐 [Website](https://whytilt.com)
- 🤝 [Contributing](CONTRIBUTING.md)
- 📋 [Code of Conduct](CODE_OF_CONDUCT.md)
- 🐛 [Issues](https://github.com/WhyTilt/tilt-app/issues)
- 💬 [Discussions](https://github.com/WhyTilt/tilt-app/discussions)

## Licensing

This project is dual-licensed under a Small Business Source License and a separate commercial license.

- **Free to use** for businesses with fewer than 50 employees and less than $250,000 USD annual revenue
- **Commercial license required** for larger organizations (50+ employees OR $250K+ revenue) - Contact hello@whytilt.com

### License Files

- `LICENSE` - Main license for small businesses and individuals
- `LICENSE-COMMERCIAL.md` - Commercial licensing terms for enterprises
- `LICENSE-MIT.md` - Original MIT license for code derived from Anthropic's project
- `NOTICE.md` - Attribution statement for original source code

