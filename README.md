# Tilt

## Production Setup Guide

### Prerequisites

1. **Docker Desktop** - Download and install from [docker.com](https://docker.com)
2. **Git** - Download from [git-scm.com](https://git-scm.com) (for Windows)

### Windows Setup

1. **Clone the repository**
   ```powershell
   git clone https://github.com/WhyTilt/tilt-app.git
   cd tilt-app
   ```

2. **Run Tilt**
   ```powershell
   .\run.ps1
   ```

3. **Access the application**
   - Open your browser to: http://localhost:3001
   - Backend API: http://localhost:8000
   - VNC Web Interface: http://localhost:6080

### Linux Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/WhyTilt/tilt-app.git
   cd tilt-app
   ```

2. **Run Tilt**
   ```bash
   ./run.sh
   ```

3. **Access the application**
   - Open your browser to: http://localhost:3001
   - Backend API: http://localhost:8000
   - VNC Web Interface: http://localhost:6080

### What happens when you run?

- Docker automatically pulls the production image
- Creates local directories for data persistence
- Starts the containerized environment
- Your data persists between restarts in the `user_data/` folder

### Adding Custom Tools

1. Navigate to `image/agent/tools/` in your cloned repository
2. Add your custom tool files
3. Restart the container - your tools will be automatically loaded

### Stopping Tilt

Press `Ctrl+C` in the terminal where you ran the script.
