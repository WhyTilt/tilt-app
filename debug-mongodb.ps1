# MongoDB Debug Script for Windows
Write-Host "=== MongoDB Container Debug ==="

# Stop any running containers first
Write-Host "Stopping any existing containers..."
docker stop $(docker ps -q) 2>$null

# Run container with debug access
Write-Host "Starting container with debug shell access..."
$ContainerId = docker run -d `
    -v "${PWD}\db_data:/data/db" `
    -p 27017:27017 `
    whytilt/tilt-app-windows:latest

Write-Host "Container ID: $ContainerId"
Write-Host ""

# Wait a moment for container to start
Start-Sleep -Seconds 2

# Check container logs
Write-Host "=== Container Logs ==="
docker logs $ContainerId
Write-Host ""

# Check db_data permissions on host
Write-Host "=== Host db_data Directory Info ==="
if (Test-Path "db_data") {
    Get-ChildItem "db_data" -Force | Format-Table Name, Mode, LastWriteTime, Length
    Write-Host "Directory owner/permissions:"
    icacls "db_data"
} else {
    Write-Host "db_data directory does not exist"
}
Write-Host ""

# Execute commands inside container to check MongoDB setup
Write-Host "=== Container Debug Commands ==="
Write-Host "Checking MongoDB process:"
docker exec $ContainerId ps aux | Select-String mongodb

Write-Host "Checking /data/db permissions inside container:"
docker exec $ContainerId ls -la /data/db

Write-Host "Checking MongoDB user inside container:"
docker exec $ContainerId id mongodb

Write-Host "Checking if MongoDB can write to /data/db:"
docker exec $ContainerId su mongodb -c "touch /data/db/test-write"
docker exec $ContainerId ls -la /data/db/test-write

Write-Host "MongoDB logs from inside container:"
docker exec $ContainerId cat /var/log/mongodb/mongod.log

# Clean up
Write-Host ""
Write-Host "Stopping debug container..."
docker stop $ContainerId
docker rm $ContainerId

Write-Host "Debug complete!"