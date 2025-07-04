const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const si = require('systeminformation');
const Docker = require('node-docker-api').Docker;

// Keep a global reference of the window object
let mainWindow;
let tray;
let docker;
let tiltContainerId;

const isDev = process.argv.includes('--dev');

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Load the Tilt web interface
  const tiltUrl = isDev ? 'http://localhost:3001' : 'http://localhost:3001';
  
  mainWindow.loadURL(tiltUrl).catch(() => {
    // If Tilt isn't running, show a loading/setup page
    mainWindow.loadFile(path.join(__dirname, 'setup.html'));
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Tilt', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Start Containers', 
      click: startTiltContainers,
      id: 'start-containers'
    },
    { 
      label: 'Stop Containers', 
      click: stopTiltContainers,
      id: 'stop-containers',
      enabled: false
    },
    { type: 'separator' },
    { 
      label: 'Container Status', 
      enabled: false,
      id: 'container-status'
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setToolTip('Tilt Computer Automation');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
}

async function checkDockerStatus() {
  try {
    docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const info = await docker.info();
    return { available: true, info };
  } catch (error) {
    try {
      // Try Windows named pipe
      docker = new Docker({ socketPath: '\\\\.\\pipe\\docker_engine' });
      const info = await docker.info();
      return { available: true, info };
    } catch (winError) {
      return { available: false, error: error.message };
    }
  }
}

async function startTiltContainers() {
  try {
    const dockerStatus = await checkDockerStatus();
    
    if (!dockerStatus.available) {
      dialog.showErrorBox('Docker Not Available', 
        'Docker Desktop is not running. Please start Docker Desktop first.');
      return;
    }

    // Check if Tilt container already exists
    const containers = await docker.container.list({ all: true });
    const tiltContainer = containers.find(container => 
      container.data.Image.includes('tilt') || 
      container.data.Names.some(name => name.includes('tilt'))
    );

    if (tiltContainer) {
      if (tiltContainer.data.State === 'running') {
        dialog.showInfoBox('Tilt Already Running', 'Tilt containers are already running.');
        return;
      } else {
        // Start existing container
        await tiltContainer.start();
        tiltContainerId = tiltContainer.id;
      }
    } else {
      // Run new container (this would need the full docker run command from run.sh)
      // For now, we'll show a message to run manually
      dialog.showInfoBox('Manual Start Required', 
        'Please run "./run.sh" in the Tilt directory to start containers.');
      return;
    }

    updateTrayMenu(true);
    
    // Wait a bit then try to load the web interface
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.loadURL('http://localhost:3001');
      }
    }, 5000);

  } catch (error) {
    dialog.showErrorBox('Error Starting Containers', error.message);
  }
}

async function stopTiltContainers() {
  try {
    if (tiltContainerId) {
      const container = docker.container.get(tiltContainerId);
      await container.stop();
      tiltContainerId = null;
    }
    
    updateTrayMenu(false);
    
  } catch (error) {
    dialog.showErrorBox('Error Stopping Containers', error.message);
  }
}

function updateTrayMenu(containersRunning) {
  const menu = tray.getContextMenu();
  menu.getMenuItemById('start-containers').enabled = !containersRunning;
  menu.getMenuItemById('stop-containers').enabled = containersRunning;
  menu.getMenuItemById('container-status').label = 
    containersRunning ? 'Status: Running' : 'Status: Stopped';
  
  tray.setContextMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  createWindow();
  createTray();
  
  // Check Docker status on startup
  const dockerStatus = await checkDockerStatus();
  if (!dockerStatus.available) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Docker Not Available',
      message: 'Docker Desktop is not running. Some features may not work.',
      detail: 'Please install and start Docker Desktop to use Tilt.'
    });
  }
  
  // Setup auto-updater
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running in system tray
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  // Optional: Stop containers on quit
  if (tiltContainerId) {
    try {
      const container = docker.container.get(tiltContainerId);
      await container.stop();
    } catch (error) {
      console.error('Error stopping containers on quit:', error);
    }
  }
});

// IPC handlers
ipcMain.handle('get-docker-status', checkDockerStatus);
ipcMain.handle('start-containers', startTiltContainers);
ipcMain.handle('stop-containers', stopTiltContainers);

// Auto-updater events
autoUpdater.on('update-available', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: 'A new version of Tilt is available. It will be downloaded in the background.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. The application will restart to apply the update.',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});