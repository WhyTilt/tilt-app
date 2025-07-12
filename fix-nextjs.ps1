# Fix Next.js startup issues in Windows container
Write-Host "=== Fixing Next.js Issues ==="

# Get the running container ID
$ContainerId = docker ps --filter "publish=3001" --format "{{.ID}}" | Select-Object -First 1

if (-not $ContainerId) {
    Write-Host "❌ No container running. Starting fresh container..."
    .\run.ps1
    Start-Sleep 10
    $ContainerId = docker ps --filter "publish=3001" --format "{{.ID}}" | Select-Object -First 1
}

Write-Host "Container ID: $ContainerId"

# Check if Next.js .next build directory exists
Write-Host "Checking if Next.js was built properly..."
$nextExists = docker exec $ContainerId bash -c "test -d /home/tilt/image/nextjs/.next && echo 'exists' || echo 'missing'"

if ($nextExists -eq "missing") {
    Write-Host "❌ Next.js build missing. Building inside container..."
    docker exec $ContainerId bash -c "cd /home/tilt/image/nextjs && npm run build"
}

# Kill any existing Next.js processes
Write-Host "Killing any stuck Next.js processes..."
docker exec $ContainerId bash -c "pkill -f 'next' || true"
docker exec $ContainerId bash -c "pkill -f 'node.*3001' || true"

# Check DEV_MODE and start appropriate server
$devMode = docker exec $ContainerId bash -c "echo `$DEV_MODE"
Write-Host "DEV_MODE: $devMode"

if ($devMode -eq "true") {
    Write-Host "Starting Next.js in development mode..."
    docker exec -d $ContainerId bash -c "cd /home/tilt/image/nextjs && PORT=3001 npm run dev > /home/tilt/logs/nextjs.log 2>&1"
} else {
    Write-Host "Starting Next.js in production mode..."
    docker exec -d $ContainerId bash -c "cd /home/tilt/image/nextjs && PORT=3001 npm run start > /home/tilt/logs/nextjs.log 2>&1"
}

# Wait and check if it started
Write-Host "Waiting for Next.js to start..."
Start-Sleep 5

# Show Next.js logs
Write-Host "=== Next.js Logs ==="
docker exec $ContainerId bash -c "tail -20 /home/tilt/logs/nextjs.log 2>/dev/null || echo 'No logs yet'"

# Test connection
Write-Host "Testing connection..."
Start-Sleep 2
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 5
    Write-Host "✅ Next.js is now responding on port 3001"
} catch {
    Write-Host "❌ Still not working. Check the logs above for errors."
    Write-Host "Manual troubleshoot: docker exec -it $ContainerId bash"
    Write-Host "Then: cd /home/tilt/image/nextjs && npm run start"
}

Write-Host "=== Fix Complete ==="