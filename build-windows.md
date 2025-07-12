# Windows Build Instructions

## For End Users: Just Run (No Building Required)

```powershell
.\run-prod.ps1
```

This pulls the pre-built image from Docker Hub and runs it. **No building required!**

## For Developers: Build and Release Windows Version

### 1. Build Production Image
```powershell
cd build
.\build.ps1 prod
```

### 2. Release to Docker Hub
```powershell
.\release.ps1
```

This tags your local `tilt-app-x86:latest` as `whytilt/tilt-app-windows:latest` and pushes it to Docker Hub.

### 3. Optional: Build Development Image
```powershell
.\build.ps1 dev
```

## Running Containers

**Production:**
```powershell
.\run-prod.ps1
```

**Development:**
```powershell
.\run-dev.ps1
```

## Why PowerShell Instead of Batch Files

PowerShell provides:
- Reliable directory navigation
- Proper error handling  
- Clean variable expansion
- Object-oriented scripting
- Better debugging

All Windows .bat files have been replaced with .ps1 equivalents for consistency and reliability.