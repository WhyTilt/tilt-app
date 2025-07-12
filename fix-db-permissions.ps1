# Fix MongoDB permissions on Windows
Write-Host "=== Fixing MongoDB Database Permissions ==="

# Stop any running containers
Write-Host "Stopping any existing containers..."
docker stop $(docker ps -q) 2>$null

# Remove and recreate db_data with proper permissions
Write-Host "Recreating db_data directory..."
if (Test-Path "db_data") {
    Remove-Item "db_data" -Recurse -Force
}
New-Item -ItemType Directory -Path "db_data" | Out-Null

# Run a temporary container to fix permissions
Write-Host "Starting temporary container to fix permissions..."
docker run --rm `
    -v "${PWD}\db_data:/data/db" `
    whytilt/tilt-app-windows:latest `
    bash -c "chown -R mongodb:mongodb /data/db && chmod -R 755 /data/db && ls -la /data/db"

Write-Host "✅ Database permissions fixed!"
Write-Host ""
Write-Host "Now you can run:"
Write-Host "  .\run-prod.ps1"