# Tilt Desktop Application

A cross-platform desktop wrapper for the Tilt Computer Automation System.

## Features

- **Docker Integration**: Automatically detects and manages Docker containers
- **System Tray**: Background operation with system tray controls
- **Cross-Platform**: Supports Mac (Intel/Apple Silicon), Windows, and Linux
- **Auto-Updates**: Built-in update mechanism
- **Native UI**: Platform-specific look and feel

## Development

### Prerequisites

- Node.js 18+
- Docker Desktop
- Platform-specific development tools:
  - **Mac**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools
  - **Linux**: build-essential

### Setup

```bash
cd desktop
npm install
```

### Development Mode

```bash
npm run dev
```

### Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux
```

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## Architecture

```
desktop/
├── src/
│   ├── main.js          # Main Electron process
│   ├── preload.js       # Preload script for security
│   └── setup.html       # Setup/loading page
├── assets/              # Icons and resources
├── test/
│   ├── e2e/            # End-to-end tests
│   └── unit/           # Unit tests
└── package.json        # Dependencies and build config
```

## Docker Integration

The desktop app integrates with Docker to:

1. **Detect Docker Status**: Checks if Docker Desktop is running
2. **Manage Containers**: Start/stop Tilt containers
3. **Monitor Health**: Display container status in system tray
4. **Auto-Recovery**: Restart containers if they crash

## System Tray

The app runs in the system tray with these features:

- **Double-click**: Open main window
- **Context menu**: Start/stop containers, view status
- **Status indicators**: Visual feedback for container state
- **Quick access**: Launch without opening full window

## Security

- **Context Isolation**: Renderer process is sandboxed
- **No Node Integration**: Web content cannot access Node.js APIs
- **Preload Script**: Controlled API exposure to renderer
- **Auto-Updates**: Signed updates with verification

## Distribution

### GitHub Actions

Automated builds on:
- `push` to `main`/`dev` branches
- `pull_request` creation
- Manual `workflow_dispatch`

### Release Process

1. **Tag Release**: `git tag v1.0.0 && git push --tags`
2. **GitHub Actions**: Automatically builds and creates GitHub release
3. **Artifacts**: Downloads available for Mac (.dmg) and Windows (.exe)

### Code Signing

For production releases, configure:

**Mac**:
```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
```

**Windows**:
```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
```

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY`: Required for Tilt functionality
- `DEV_MODE`: Development mode flag
- `CSC_*`: Code signing certificates

### Build Options

Configure in `package.json` under `build` section:

- **App ID**: Unique identifier for the app
- **Icons**: Platform-specific icon files
- **Targets**: Build outputs (dmg, exe, AppImage)
- **Signing**: Code signing configuration

## Troubleshooting

### Docker Not Found

1. Install Docker Desktop
2. Start Docker Desktop
3. Ensure Docker is in PATH
4. Check Docker daemon is running

### Build Errors

1. **Mac**: Install Xcode Command Line Tools
2. **Windows**: Install Visual Studio Build Tools
3. **Linux**: Install build-essential

### Permission Issues

1. **Mac**: Enable accessibility permissions
2. **Windows**: Run as administrator if needed
3. **Linux**: Check Docker group membership

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests: `npm test && npm run test:e2e`
5. Submit pull request

## License

MIT License - see LICENSE file for details