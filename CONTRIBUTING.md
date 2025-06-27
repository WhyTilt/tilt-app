# Contributing to AutomagicIT

Thank you for your interest in contributing to AutomagicIT! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please read it before contributing.

**Key reminder**: This is a technical project focused on computer automation. Political discussions and activism are not welcome here.

## Getting Started

### Prerequisites

- Docker installed and running
- Git for version control
- Python 3.11+ for backend development
- Node.js 18+ for frontend development
- Anthropic API key for testing

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/AutomagicIT/the-automator.git
   cd the-automator
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/original-owner/the-automator.git
   ```

## Development Setup

### Quick Development Environment

```bash
# Build the development container
./build.sh

# Run in development mode
./run.sh --dev
```

### Local Component Development

```bash
# Backend development
pip install -r agent/requirements.txt
python -m agent.api_service.main

# Frontend development
cd nextjs
npm install
npm run dev
```

### Development Tools

The project includes several development aids:

- **Pre-commit hooks**: Automated code formatting and linting
- **Hot reloading**: Both backend and frontend support live reloading
- **Comprehensive logging**: Debug with detailed logs in `/home/computeragent/logs/`

## How to Contribute

### Types of Contributions

We welcome several types of contributions:

1. **🐛 Bug Fixes**: Fix issues and improve stability
2. **✨ New Features**: Add new automation capabilities
3. **🛠️ Tool Development**: Create new tools for the agent system
4. **📚 Documentation**: Improve docs, examples, and guides
5. **🧪 Testing**: Add tests and improve test coverage
6. **🎨 UI/UX**: Enhance the frontend interface

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Open an issue** for major changes to discuss the approach
3. **Start small** with your first contribution
4. **Follow the project architecture** outlined in [CLAUDE.md](CLAUDE.md)

## Coding Standards

### Python Backend

```python
# Follow PEP 8 style guidelines
# Use type hints
# Write docstrings for public functions

async def example_function(param: str) -> ToolResult:
    """
    Brief description of what this function does.
    
    Args:
        param: Description of the parameter
        
    Returns:
        ToolResult with execution details
    """
    pass
```

### TypeScript Frontend

```typescript
// Use TypeScript strictly
// Follow functional programming patterns
// Use descriptive component names

interface ComponentProps {
  title: string;
  onSubmit: (data: string) => void;
}

export const ExampleComponent: React.FC<ComponentProps> = ({ title, onSubmit }) => {
  // Component implementation
};
```

### Tool Development

When creating new tools:

1. **Inherit from BaseAnthropicTool**
2. **Implement required methods**: `__call__` and `to_params`
3. **Add comprehensive error handling**
4. **Include proper logging**
5. **Write tests for your tool**

Example tool structure:
```python
from .base import BaseAnthropicTool, ToolResult

class MyCustomTool(BaseAnthropicTool):
    """Tool for performing custom automation tasks."""
    
    name: str = "my_custom_tool"
    
    async def __call__(self, **kwargs) -> ToolResult:
        try:
            # Tool implementation
            result = self._perform_action(kwargs)
            return ToolResult(output=result)
        except Exception as e:
            return ToolResult(error=str(e))
    
    def to_params(self) -> dict:
        return {
            "name": self.name,
            "description": "Description of what this tool does",
            "input_schema": {
                "type": "object",
                "properties": {
                    # Define parameters
                }
            }
        }
```

## Testing

### Running Tests

```bash
# Python tests
pytest tests/ -v

# Frontend tests
cd nextjs
npm test

# Integration tests with Docker
./build.sh
./run.sh --test
```

### Writing Tests

- **Unit tests** for individual functions and components
- **Integration tests** for tool interactions
- **End-to-end tests** for complete workflows
- **Mock external services** (Anthropic API, etc.)

## Pull Request Process

### Before Submitting

1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following the coding standards

4. **Test thoroughly**:
   ```bash
   pytest tests/
   npm test
   ```

5. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add new automation tool for X"
   ```

### Submitting the PR

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create the pull request** on GitHub

3. **Fill out the PR template** completely

4. **Link related issues** using keywords like "Fixes #123"

### PR Requirements

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New functionality includes tests
- [ ] Documentation is updated if needed
- [ ] PR description clearly explains the changes
- [ ] No merge conflicts with main branch

### Review Process

1. **Automated checks** must pass (CI/CD)
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Approval** and merge by maintainers

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected vs actual behavior**
- **Environment details** (OS, Docker version, etc.)
- **Log outputs** from `/home/computeragent/logs/`
- **Screenshots or videos** if relevant

### Feature Requests

For new features:

- **Describe the use case** and problem it solves
- **Explain the proposed solution**
- **Consider alternative approaches**
- **Discuss implementation complexity**

### Issue Labels

We use labels to categorize issues:

- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation needs
- `good first issue`: Suitable for newcomers
- `help wanted`: Extra attention needed
- `tool`: Related to tool development

## Community Guidelines

### Communication

- **Be respectful** and professional
- **Focus on technical discussions**
- **Provide constructive feedback**
- **Help others learn and grow**

### Recognition

Contributors are recognized through:

- **Contributor listings** in project documentation
- **GitHub contributor graphs**
- **Release notes** mentioning significant contributions
- **Community showcases** of notable work

## Getting Help

- **Documentation**: Start with [CLAUDE.md](CLAUDE.md)
- **Issues**: Search existing issues for solutions
- **Discussions**: Use GitHub Discussions for questions
- **Code**: Review existing implementations for examples

---

**Thank you for contributing to AutomagicIT!** Your efforts help make computer automation more accessible and powerful for everyone.
