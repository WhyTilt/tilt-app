# Tilt

[![License](https://img.shields.io/badge/License-Small%20Business%20Source-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![AI](https://img.shields.io/badge/AI-Claude%20Sonnet%204-FF6B35?logo=anthropic&logoColor=white)](https://www.anthropic.com)
[![Website](https://img.shields.io/badge/Website-whytilt.com-FF6B35?logo=safari&logoColor=white)](https://whytilt.com)
[![X](https://img.shields.io/badge/X-@whytilt-1DA1F2?logo=x&logoColor=white)](https://x.com/whytilt)
[![YouTube](https://img.shields.io/badge/YouTube-tilt-FF0000?logo=youtube&logoColor=white)](https://youtube.com/@tilt)

**Advanced Computer Automation System powered by Claude Sonnet 4**

AutomagicIT is a sophisticated computer automation platform that transforms natural language instructions into automated workflows. Built on Anthropic's Computer Use API, it provides intelligent, AI-driven automation for web testing, UI interaction, and complex task execution through a containerized virtual desktop environment.

⭐️ **Your star powers our automation magic**

<!-- ## 💖 Support AutomagicIT

Help us continue developing cutting-edge automation tools! Your support enables us to:
- 🚀 Add new AI models and providers
- 🛠️ Build advanced automation capabilities  
- 📚 Create comprehensive documentation and tutorials
- 🐛 Provide faster bug fixes and feature development

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-EA4AAA?logo=github&logoColor=white)](https://github.com/sponsors/AutomagicIT)

**Why GitHub Sponsors?**
- ✅ Integrated with GitHub (adds credibility)
- ✅ Easy for developers already on GitHub
- ✅ Supports one-time and recurring payments
- ✅ Multiple tiers: $5, $25, $50+ monthly options
- ✅ Show your support directly on your GitHub profile -->

## About

AutomagicIT combines the power of large language models with practical computer automation tools to create a comprehensive testing and automation platform. Whether you're automating e-commerce workflows, performing quality assurance testing, or extracting data from complex web applications, AutomagicIT provides the visual feedback and programmatic control you need.

**Key Capabilities:**
- 🖥️ Full desktop automation with visual feedback
- 🌐 Advanced web testing and data extraction
- 📊 Built-in analytics monitoring (Google Analytics, Adobe Analytics)
- 🔄 Task management with MongoDB persistence
- 🛠️ Extensible tool system with custom integrations
- 📱 Real-time streaming interface with Next.js

## Architecture

AutomagicIT is built as a multi-container system with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI    │    │  FastAPI Server  │    │  Docker Desktop │
│   Port 3001     │◄──►│   Port 8000      │◄──►│   Ubuntu 22.04  │
│   Port 8080     │    │  Claude AI Loop  │    │   X11/VNC       │
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
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Fast Start

```bash
# Clone the repository
git clone https://github.com/AutomagicIT/the-automator.git
cd the-automator

# Set your API key
export ANTHROPIC_API_KEY=your_api_key_here

# Build and run with persistent data
./run.sh
```

Open your browser to [http://localhost:3001](http://localhost:3001) and start automating!


## Features

### 🤖 AI-Powered Automation
- **Natural Language Processing**: Describe your automation needs in plain English
- **Visual Context Understanding**: AI sees and interacts with your screen like a human
- **Multi-Step Workflows**: Complex automation sequences with decision-making capabilities
- **Error Recovery**: Intelligent error handling and retry mechanisms

### 🛠️ Advanced Tool System
- **Computer Control**: Full mouse, keyboard, and application control
- **Web Automation**: Advanced browser interaction with Chrome DevTools integration
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

Once running, AutomagicIT provides multiple access points:

- **Frontend**: [http://localhost:3001](http://localhost:3001) - Next.js application server
- **Main Interface**: [http://localhost:8080](http://localhost:8080) - Combined Next.js frontend with desktop view
- **Python API**: [http://localhost:8000](http://localhost:8000) - FastAPI backend server
- **Desktop View**: [http://localhost:6080/vnc.html](http://localhost:6080/vnc.html) - Direct desktop access
- **VNC Client**: `vnc://localhost:5900` - For external VNC clients

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Required |
| `API_PROVIDER` | API provider (anthropic/bedrock/vertex) | anthropic |
| `ANTHROPIC_MODEL` | Claude model to use | claude-sonnet-4-20250514 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017 |
| `WIDTH` | Desktop resolution width | 1024 |
| `HEIGHT` | Desktop resolution height | 768 |


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
- **Logging**: Comprehensive logs in `/home/computeragent/logs/`

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

- 🌐 [Website](https://automagicit.com)
- 📺 [YouTube](https://youtube.com/@automagicit)
- 🐦 [X (Twitter)](https://x.com/_automagicit)
- 🤝 [Contributing](CONTRIBUTING.md)
- 📋 [Code of Conduct](CODE_OF_CONDUCT.md)
- 🐛 [Issues](https://github.com/AutomagicIT/the-automator/issues)
- 💬 [Discussions](https://github.com/AutomagicIT/the-automator/discussions)

## Licensing

This project is dual-licensed under a Small Business Source License and a separate commercial license.

- **Free to use** for businesses with fewer than 50 employees and less than $250,000 USD annual revenue
- **Commercial license required** for larger organizations (50+ employees OR $250K+ revenue) - Contact sales@automagicit.com

### License Files

- `LICENSE` - Main license for small businesses and individuals
- `LICENSE-COMMERCIAL.md` - Commercial licensing terms for enterprises
- `LICENSE-MIT.md` - Original MIT license for code derived from Anthropic's project
- `NOTICE.md` - Attribution statement for original source code

# the-automator
