@echo off
echo === DEBUG PATH TESTING ===
echo.
echo Current directory:
echo %CD%
echo.
echo Testing parent directory:
dir ..
echo.
echo Testing ..\image directory:
dir ..\image
echo.
echo Testing ..\image\nextjs directory:
dir ..\image\nextjs
echo.
echo Attempting to change to ..\image\nextjs:
cd ..\image\nextjs
echo After cd command, current directory:
echo %CD%
echo.
echo Testing if package.json exists here:
if exist package.json (
    echo package.json EXISTS
) else (
    echo package.json NOT FOUND
)
echo.
echo === END DEBUG ===
pause