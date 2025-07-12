# Debug Next.js in Windows Container
Write-Host "=== Next.js Debug Script ==="

# Get the running container ID
$ContainerId = docker ps --filter "publish=3001" --format "{{.ID}}" | Select-Object -First 1

if (-not $ContainerId) {
    Write-Host "❌ No container running on port 3001"
    Write-Host "Start container first with: .\run.ps1"
    exit 1
}

Write-Host "Container ID: $ContainerId"
Write-Host ""

Write-Host "=== Checking Next.js Process ==="
docker exec $ContainerId bash -c "ps aux | grep node"
Write-Host ""

Write-Host "=== Checking Next.js Process (alternative) ==="
docker exec $ContainerId bash -c "ps aux | grep next"
Write-Host ""

Write-Host "=== Checking Port 3001 Inside Container ==="
docker exec $ContainerId bash -c "netstat -tlnp | grep 3001"
Write-Host ""

Write-Host "=== Checking All Node Processes ==="
docker exec $ContainerId bash -c "ps aux | grep -E 'node|npm'"
Write-Host ""

Write-Host "=== Checking Port 3001 From Host ==="
netstat -an | findstr 3001
Write-Host ""

Write-Host "=== Testing Direct Connection ==="
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 5
    Write-Host "✅ Next.js is responding on port 3001"
    Write-Host "Status: $($response.StatusCode)"
} catch {
    Write-Host "❌ Next.js not responding on port 3001"
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

Write-Host "=== Checking Next.js Logs ==="
docker exec $ContainerId bash -c "cat /home/tilt/logs/nextjs.log 2>/dev/null || echo 'No Next.js log file found'"
Write-Host ""

Write-Host "=== Checking Next.js Directory ==="
docker exec $ContainerId bash -c "ls -la /home/tilt/image/nextjs/"
Write-Host ""

Write-Host "=== Checking Built Next.js Files ==="
docker exec $ContainerId bash -c "ls -la /home/tilt/image/nextjs/.next/ 2>/dev/null || echo 'No .next directory found'"
Write-Host ""

Write-Host "=== Checking Next.js Package.json Scripts ==="
docker exec $ContainerId bash -c "cat /home/tilt/image/nextjs/package.json | grep -A 5 -B 1 scripts"
Write-Host ""

Write-Host "=== Checking Container Environment ==="
docker exec $ContainerId bash -c "echo 'DEV_MODE=' && echo `$DEV_MODE"
Write-Host ""

Write-Host "=== Manual Next.js Start Test ==="
Write-Host "Attempting to manually start Next.js..."
docker exec $ContainerId bash -c "cd /home/tilt/image/nextjs && npm run start 2>&1 | head -10"

Write-Host ""
Write-Host "=== Debug Complete ==="