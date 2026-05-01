@echo off
REM YOLO API Server Startup Script
REM Starts the FastAPI YOLO detection server on port 8001

echo ========================================
echo Starting YOLO API Server...
echo ========================================

cd /d "%~dp0backend"

REM Check if virtual environment exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Install dependencies if needed
pip install -q fastapi uvicorn python-multipart opencv-python ultralytics numpy

echo.
echo Starting YOLO server on http://localhost:8001
echo Press Ctrl+C to stop
echo.

REM Start the server
python -m uvicorn yolo_api:app --host 0.0.0.0 --port 8001 --reload

pause