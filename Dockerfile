# Stage 1: Base OS layer
FROM docker.io/ubuntu:22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV DEBIAN_PRIORITY=high

RUN apt-get update && \
    apt-get -y upgrade && \
    apt-get clean

# Stage 2: System packages layer
FROM base AS system-packages

RUN apt-get update && \
    apt-get -y install \
    # UI Requirements
    xvfb \
    xterm \
    xdotool \
    scrot \
    imagemagick \
    sudo \
    mutter \
    x11vnc \
    gnome-shell-extensions \
    # Python/pyenv reqs
    build-essential \
    libssl-dev  \
    zlib1g-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    curl \
    git \
    libncursesw5-dev \
    xz-utils \
    tk-dev \
    libxml2-dev \
    libxmlsec1-dev \
    libffi-dev \
    liblzma-dev \
    # Network tools
    net-tools \
    netcat \
    # PPA req
    software-properties-common && \
    apt-get clean

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

# Install MongoDB Community Edition
# Import the public key used by the package management system
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create a list file for MongoDB
RUN echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB packages
RUN apt-get update && \
    apt-get install -y mongodb-org && \
    apt-get clean

# Create MongoDB data directory and set permissions
RUN mkdir -p /data/db /var/log/mongodb && \
    chown -R mongodb:mongodb /data/db /var/log/mongodb && \
    chmod 755 /data/db /var/log/mongodb

# Create volume for persistent MongoDB data
VOLUME ["/data/db"]

# Add mongodb user to sudo group for container startup
RUN usermod -aG sudo mongodb && \
    echo "mongodb ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Stage 3: User applications layer
FROM system-packages AS user-apps

RUN add-apt-repository ppa:mozillateam/ppa && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    chromium-browser \
    x11-apps \
    xpdf \
    tint2 \
    pcmanfm \
    unzip && \
    apt-get clean

# Install noVNC
RUN git clone --branch v1.5.0 https://github.com/novnc/noVNC.git /opt/noVNC && \
    git clone --branch v0.12.0 https://github.com/novnc/websockify /opt/noVNC/utils/websockify && \
    ln -s /opt/noVNC/vnc.html /opt/noVNC/index.html

# Stage 4: User setup layer
FROM user-apps AS user-setup

# setup user
ENV USERNAME=computeragent
ENV HOME=/home/$USERNAME
RUN useradd -m -s /bin/bash -d $HOME $USERNAME
RUN echo "${USERNAME} ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Create user directories that will be mounted for persistence
RUN mkdir -p $HOME/{Desktop,Documents,Downloads} && \
    mkdir -p $HOME/.config/{gtk-3.0,gtk-2.0,libreoffice,pulse} && \
    mkdir -p $HOME/.local $HOME/.cache $HOME/.mozilla && \
    chown -R $USERNAME:$USERNAME $HOME

USER computeragent
WORKDIR $HOME

# Stage 5: Python environment layer
FROM user-setup AS python-env

# setup python
RUN git clone https://github.com/pyenv/pyenv.git ~/.pyenv && \
    cd ~/.pyenv && src/configure && make -C src && cd .. && \
    echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc && \
    echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc && \
    echo 'eval "$(pyenv init -)"' >> ~/.bashrc
ENV PYENV_ROOT="$HOME/.pyenv"
ENV PATH="$PYENV_ROOT/bin:$PATH"
ENV PYENV_VERSION_MAJOR=3
ENV PYENV_VERSION_MINOR=11
ENV PYENV_VERSION_PATCH=6
ENV PYENV_VERSION=$PYENV_VERSION_MAJOR.$PYENV_VERSION_MINOR.$PYENV_VERSION_PATCH
RUN eval "$(pyenv init -)" && \
    pyenv install $PYENV_VERSION && \
    pyenv global $PYENV_VERSION && \
    pyenv rehash

ENV PATH="$HOME/.pyenv/shims:$HOME/.pyenv/bin:$PATH"

# Stage 6: Pip and base packages layer
FROM python-env AS pip-setup

RUN python -m pip install --upgrade pip==23.1.2 setuptools==58.0.4 wheel==0.40.0 && \
    python -m pip config set global.disable-pip-version-check true

# Stage 7: Python dependencies layer
FROM pip-setup AS python-deps

# only reinstall if requirements.txt changes
COPY --chown=$USERNAME:$USERNAME agent/requirements.txt $HOME/agent/requirements.txt
RUN python -m pip install -r $HOME/agent/requirements.txt

# Stage 8: Node.js dependencies layer
FROM python-deps AS nodejs-deps

# Install Next.js dependencies
COPY --chown=$USERNAME:$USERNAME nextjs/package*.json $HOME/nextjs/
WORKDIR $HOME/nextjs
RUN npm install --legacy-peer-deps

# Stage 9: Application layer (final)
FROM nodejs-deps AS app

# setup desktop env & app
COPY --chown=$USERNAME:$USERNAME image/ $HOME
COPY --chown=$USERNAME:$USERNAME agent/ $HOME/agent/
COPY --chown=$USERNAME:$USERNAME nextjs/ $HOME/nextjs/

# Build Next.js app (conditionally)
WORKDIR $HOME/nextjs
# Set build-time environment variables
ENV NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Add build argument for development mode
ARG DEV_MODE=false
RUN if [ "$DEV_MODE" = "false" ]; then \
        npm run build; \
    else \
        echo "Skipping build in development mode"; \
        mkdir -p .next && chown -R $USERNAME:$USERNAME .next; \
    fi

WORKDIR $HOME

ARG DISPLAY_NUM=1
ARG HEIGHT=768
ARG WIDTH=1024
ENV DISPLAY_NUM=$DISPLAY_NUM
ENV HEIGHT=$HEIGHT
ENV WIDTH=$WIDTH

# Expose ports
EXPOSE 8080 8501 6080 27017

ENTRYPOINT [ "./entrypoint.sh" ]