@echo off
echo Initializing git submodules...

REM Initialize and update submodules
git submodule init
git submodule update --recursive

REM Check if submodules were set up
if exist agent\requirements.txt (
    echo ✓ Agent submodule initialized successfully
) else (
    echo ✗ Agent submodule failed to initialize
    echo You may need to manually clone https://github.com/WhyTilt/tilt-agent.git to agent/
)

if exist nextjs\package.json (
    echo ✓ Frontend submodule initialized successfully
) else (
    echo ✗ Frontend submodule failed to initialize  
    echo You may need to manually clone https://github.com/WhyTilt/tilt-frontend.git to nextjs/
)

echo.
echo Submodule setup complete! You can now run build.bat