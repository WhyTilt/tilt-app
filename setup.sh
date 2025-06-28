#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS and architecture
OS=$(uname -s)
ARCH=$(uname -m)

echo -e "${GREEN}Tilt Setup Script${NC}"
echo "Detected OS: $OS ($ARCH)"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Docker on macOS
install_docker_mac() {
    echo -e "${YELLOW}Installing Docker Desktop for Mac...${NC}"
    
    if [[ "$ARCH" == "arm64" ]]; then
        # Apple Silicon
        curl -L "https://desktop.docker.com/mac/main/arm64/Docker.dmg" -o Docker.dmg
    else
        # Intel Mac
        curl -L "https://desktop.docker.com/mac/main/amd64/Docker.dmg" -o Docker.dmg
    fi
    
    # Mount and install
    hdiutil attach Docker.dmg
    cp -R /Volumes/Docker/Docker.app /Applications/
    hdiutil detach /Volumes/Docker
    rm Docker.dmg
    
    echo -e "${GREEN}Docker Desktop installed. Please start Docker Desktop manually and wait for it to finish starting.${NC}"
    echo -e "${YELLOW}Press any key when Docker Desktop is running...${NC}"
    read -n 1 -s
}

# Function to install Docker on Linux
install_docker_linux() {
    echo -e "${YELLOW}Installing Docker on Linux...${NC}"
    
    # Update package index
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    # Start Docker service
    sudo systemctl start docker
    sudo systemctl enable docker
    
    echo -e "${GREEN}Docker installed successfully!${NC}"
    echo -e "${YELLOW}You may need to log out and back in for Docker group permissions to take effect.${NC}"
}

# Function to install Git on macOS
install_git_mac() {
    echo -e "${YELLOW}Installing Git on macOS...${NC}"
    
    if command_exists brew; then
        brew install git
    else
        echo -e "${YELLOW}Homebrew not found. Installing Homebrew first...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        brew install git
    fi
    
    echo -e "${GREEN}Git installed successfully!${NC}"
}

# Function to install Git on Linux
install_git_linux() {
    echo -e "${YELLOW}Installing Git on Linux...${NC}"
    sudo apt-get update
    sudo apt-get install -y git
    echo -e "${GREEN}Git installed successfully!${NC}"
}

# Check and install Docker
echo -e "\n${YELLOW}Checking for Docker...${NC}"
if command_exists docker; then
    echo -e "${GREEN}Docker is already installed.${NC}"
    docker --version
else
    echo -e "${RED}Docker not found.${NC}"
    case "$OS" in
        Darwin)
            install_docker_mac
            ;;
        Linux)
            install_docker_linux
            ;;
        *)
            echo -e "${RED}Unsupported operating system: $OS${NC}"
            exit 1
            ;;
    esac
fi

# Check and install Git
echo -e "\n${YELLOW}Checking for Git...${NC}"
if command_exists git; then
    echo -e "${GREEN}Git is already installed.${NC}"
    git --version
else
    echo -e "${RED}Git not found.${NC}"
    case "$OS" in
        Darwin)
            install_git_mac
            ;;
        Linux)
            install_git_linux
            ;;
        *)
            echo -e "${RED}Unsupported operating system: $OS${NC}"
            exit 1
            ;;
    esac
fi

# Verify Docker is running
echo -e "\n${YELLOW}Verifying Docker is running...${NC}"
if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}Docker is running successfully!${NC}"
else
    echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Run the application
echo -e "\n${GREEN}Setup complete! Starting Tilt...${NC}"
./run.sh