#!/bin/bash
set -e

# Tilt One-Command Installer
# Usage: curl -sSL install.whytilt.com | bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE="whytilt/tilt:latest"
TILT_CMD_PATH="/usr/local/bin/tilt"
CONFIG_DIR="$HOME/.config/tilt"
ENV_FILE="$CONFIG_DIR/.env"

echo -e "${BLUE}🚀 Installing Tilt - Advanced Computer Automation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Detect OS and architecture
detect_platform() {
    local os arch
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    arch=$(uname -m)
    
    case "$arch" in
        x86_64|amd64)
            arch="amd64"
            ;;
        aarch64|arm64)
            arch="arm64"
            ;;
        *)
            echo -e "${RED}❌ Unsupported architecture: $arch${NC}"
            exit 1
            ;;
    esac
    
    case "$os" in
        linux)
            PLATFORM="linux"
            ;;
        darwin)
            PLATFORM="darwin"
            ;;
        mingw*|msys*|cygwin*)
            PLATFORM="windows"
            ;;
        *)
            echo -e "${RED}❌ Unsupported OS: $os${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Detected platform: $PLATFORM/$arch${NC}"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker not found. Installing Docker...${NC}"
        install_docker
    else
        echo -e "${GREEN}✓ Docker found${NC}"
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker daemon is not running${NC}"
        echo -e "${YELLOW}Please start Docker and run this installer again${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker is running${NC}"
}

# Install Docker based on platform
install_docker() {
    case "$PLATFORM" in
        linux)
            echo -e "${BLUE}Installing Docker on Linux...${NC}"
            curl -fsSL https://get.docker.com | sh
            
            # Add user to docker group
            if [ "$USER" != "root" ]; then
                sudo usermod -aG docker "$USER"
                echo -e "${YELLOW}⚠️  Added $USER to docker group. You may need to log out and back in.${NC}"
            fi
            ;;
        darwin)
            echo -e "${YELLOW}⚠️  Please install Docker Desktop from: https://docs.docker.com/desktop/install/mac-install/${NC}"
            echo -e "${YELLOW}Then restart this installer${NC}"
            exit 1
            ;;
        windows)
            echo -e "${YELLOW}⚠️  Please install Docker Desktop from: https://docs.docker.com/desktop/install/windows-install/${NC}"
            echo -e "${YELLOW}Then restart this installer${NC}"
            exit 1
            ;;
    esac
}

# Get Anthropic API key
get_api_key() {
    mkdir -p "$CONFIG_DIR"
    
    if [ -f "$ENV_FILE" ] && grep -q "ANTHROPIC_API_KEY=" "$ENV_FILE"; then
        local existing_key
        existing_key=$(grep "ANTHROPIC_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        if [ -n "$existing_key" ] && [ "$existing_key" != "your_api_key_here" ]; then
            echo -e "${GREEN}✓ Found existing API key${NC}"
            return
        fi
    fi
    
    echo -e "${BLUE}🔑 Anthropic API Key Setup${NC}"
    echo -e "${YELLOW}You need an Anthropic API key to use Tilt.${NC}"
    echo -e "${YELLOW}Get one at: https://console.anthropic.com/${NC}"
    echo ""
    
    while true; do
        echo -n "Enter your Anthropic API key: "
        read -r api_key
        
        if [ -z "$api_key" ]; then
            echo -e "${RED}❌ API key cannot be empty${NC}"
            continue
        fi
        
        if [[ ! "$api_key" =~ ^sk-ant-api03- ]]; then
            echo -e "${YELLOW}⚠️  This doesn't look like a valid Anthropic API key (should start with sk-ant-api03-)${NC}"
            echo -n "Continue anyway? (y/N): "
            read -r confirm
            if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                continue
            fi
        fi
        
        break
    done
    
    echo "ANTHROPIC_API_KEY=$api_key" > "$ENV_FILE"
    echo -e "${GREEN}✓ API key saved${NC}"
}

# Pull Docker image
pull_image() {
    echo -e "${BLUE}📦 Pulling Tilt Docker image...${NC}"
    if docker pull "$DOCKER_IMAGE"; then
        echo -e "${GREEN}✓ Image pulled successfully${NC}"
    else
        echo -e "${RED}❌ Failed to pull Docker image${NC}"
        exit 1
    fi
}

# Create tilt command wrapper
create_command() {
    echo -e "${BLUE}🔧 Creating tilt command...${NC}"
    
    # Check if we need sudo for /usr/local/bin
    if [ -w "/usr/local/bin" ]; then
        SUDO_CMD=""
    else
        SUDO_CMD="sudo"
    fi
    
    $SUDO_CMD tee "$TILT_CMD_PATH" > /dev/null << 'EOF'
#!/bin/bash

# Tilt Command Wrapper
# This script runs the Tilt Docker container with proper configuration

set -e

DOCKER_IMAGE="whytilt/tilt:latest"
CONFIG_DIR="$HOME/.config/tilt"
ENV_FILE="$CONFIG_DIR/.env"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Create data directories
mkdir -p "$HOME/.tilt/user_data"
mkdir -p "$HOME/.tilt/logs"
mkdir -p "$HOME/.tilt/db_data"

# Function to run Tilt
run_tilt() {
    docker run --rm -it \
        -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
        -e DEV_MODE=false \
        -v /etc/timezone:/etc/timezone:ro \
        -v /etc/localtime:/etc/localtime:ro \
        -e TZ=$(cat /etc/timezone 2>/dev/null || echo "UTC") \
        -v "$HOME/.anthropic:/home/tilt/.anthropic" \
        -v "$HOME/.tilt/user_data:/home/tilt/user_data" \
        -v "$HOME/.tilt/user_data/.mozilla:/home/tilt/.mozilla" \
        -v "$HOME/.tilt/user_data/.config/gtk-3.0:/home/tilt/.config/gtk-3.0" \
        -v "$HOME/.tilt/user_data/.config/gtk-2.0:/home/tilt/.config/gtk-2.0" \
        -v "$HOME/.tilt/user_data/.config/libreoffice:/home/tilt/.config/libreoffice" \
        -v "$HOME/.tilt/user_data/.config/pulse:/home/tilt/.config/pulse" \
        -v "$HOME/.tilt/user_data/.local:/home/tilt/.local" \
        -v "$HOME/.tilt/user_data/.cache:/home/tilt/.cache" \
        -v "$HOME/.tilt/user_data/Desktop:/home/tilt/Desktop" \
        -v "$HOME/.tilt/user_data/Documents:/home/tilt/Documents" \
        -v "$HOME/.tilt/user_data/Downloads:/home/tilt/Downloads" \
        -v "$HOME/.tilt/logs:/home/tilt/logs" \
        -v "$HOME/.tilt/db_data:/data/db" \
        -p 5900:5900 \
        -p 3001:3001 \
        -p 6080:6080 \
        -p 8000:8000 \
        "$DOCKER_IMAGE"
}

# Function to update Tilt
update_tilt() {
    echo "🔄 Updating Tilt..."
    docker pull "$DOCKER_IMAGE"
    echo "✅ Tilt updated successfully"
}

# Function to stop Tilt
stop_tilt() {
    echo "🛑 Stopping Tilt containers..."
    docker ps -q --filter ancestor="$DOCKER_IMAGE" | xargs -r docker stop
    echo "✅ Tilt stopped"
}

# Function to show help
show_help() {
    cat << HELP
Tilt - Advanced Computer Automation

Usage:
  tilt [start]     Start Tilt (default command)
  tilt stop        Stop all Tilt containers
  tilt update      Update Tilt to the latest version
  tilt logs        View Tilt logs
  tilt help        Show this help message

Access Tilt:
  Frontend:    http://localhost:3001
  API:         http://localhost:8000
  Desktop:     http://localhost:6080/vnc.html
  VNC:         vnc://localhost:5900

Data Storage:
  User Data:   ~/.tilt/user_data/
  Logs:        ~/.tilt/logs/
  Database:    ~/.tilt/db_data/

For more information, visit: https://whytilt.com
HELP
}

# Parse command
case "${1:-start}" in
    start|"")
        if [ -z "$ANTHROPIC_API_KEY" ]; then
            echo "❌ ANTHROPIC_API_KEY not found. Please run the installer again or set it manually:"
            echo "   export ANTHROPIC_API_KEY=your_key_here"
            exit 1
        fi
        echo "🚀 Starting Tilt..."
        echo "📱 Open http://localhost:3001 in your browser"
        run_tilt
        ;;
    stop)
        stop_tilt
        ;;
    update)
        update_tilt
        ;;
    logs)
        if [ -d "$HOME/.tilt/logs" ]; then
            echo "📋 Recent logs:"
            find "$HOME/.tilt/logs" -name "*.log" -o -name "*.txt" | head -5 | xargs tail -20
        else
            echo "No logs found. Start Tilt first."
        fi
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
EOF

    $SUDO_CMD chmod +x "$TILT_CMD_PATH"
    echo -e "${GREEN}✓ Command created at $TILT_CMD_PATH${NC}"
}

# Test installation
test_installation() {
    echo -e "${BLUE}🧪 Testing installation...${NC}"
    
    if command -v tilt &> /dev/null; then
        echo -e "${GREEN}✓ tilt command is available${NC}"
    else
        echo -e "${RED}❌ tilt command not found in PATH${NC}"
        echo -e "${YELLOW}You may need to restart your terminal or add /usr/local/bin to your PATH${NC}"
    fi
}

# Main installation flow
main() {
    detect_platform
    check_docker
    get_api_key
    pull_image
    create_command
    test_installation
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 Tilt installation completed successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}🚀 Quick Start:${NC}"
    echo -e "   ${YELLOW}tilt${NC}                 # Start Tilt"
    echo -e "   ${YELLOW}tilt stop${NC}            # Stop Tilt"
    echo -e "   ${YELLOW}tilt update${NC}          # Update Tilt"
    echo -e "   ${YELLOW}tilt help${NC}            # Show help"
    echo ""
    echo -e "${BLUE}🌐 Access URLs:${NC}"
    echo -e "   Frontend:    ${YELLOW}http://localhost:3001${NC}"
    echo -e "   API:         ${YELLOW}http://localhost:8000${NC}"
    echo -e "   Desktop:     ${YELLOW}http://localhost:6080/vnc.html${NC}"
    echo ""
    echo -e "${BLUE}📚 Documentation: ${YELLOW}https://whytilt.com${NC}"
    echo ""
    echo -e "${GREEN}Happy automating! 🤖${NC}"
}

# Run main function
main "$@"