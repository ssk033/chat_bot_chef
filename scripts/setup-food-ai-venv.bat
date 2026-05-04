@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."

set "PY312EXE="

if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
  "%LocalAppData%\Programs\Python\Python312\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info[:2]==(3,12) else 1)" 2>nul
  if not errorlevel 1 set "PY312EXE=%LocalAppData%\Programs\Python\Python312\python.exe"
)

if "!PY312EXE!"=="" if exist "%ProgramFiles%\Python312\python.exe" (
  "%ProgramFiles%\Python312\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info[:2]==(3,12) else 1)" 2>nul
  if not errorlevel 1 set "PY312EXE=%ProgramFiles%\Python312\python.exe"
)

if "!PY312EXE!"=="" if exist "C:\Python312\python.exe" (
  "C:\Python312\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info[:2]==(3,12) else 1)" 2>nul
  if not errorlevel 1 set "PY312EXE=C:\Python312\python.exe"
)

REM py launcher sometimes has older runtimes registered but not 3.12 yet
set "USED_PY_LAUNCHER="
if "!PY312EXE!"=="" (
  where py >nul 2>&1
  if not errorlevel 1 (
    py -3.12 -c "import sys; raise SystemExit(0 if sys.version_info[:2]==(3,12) else 1)" 2>nul
    if not errorlevel 1 (
      set "USED_PY_LAUNCHER=1"
    )
  )
)

if "!PY312EXE!"=="" if not defined USED_PY_LAUNCHER (
  echo [!] Python 3.12 not found. TensorFlow cannot use Python 3.14 yet.
  echo.
  echo     Install Python 3.12 (64-bit^), then re-run npm run food-ai:venv:win
  echo.
  echo     Quick install:
  echo        winget install --id Python.Python.3.12 -e --source winget
  echo.
  echo     Or download: https://www.python.org/downloads/release/python-3129/
  exit /b 1
)

echo Creating .venv-food-ai with Python 3.12...

if defined PY312EXE (
  "!PY312EXE!" -m venv .venv-food-ai
) else (
  py -3.12 -m venv .venv-food-ai
)
if errorlevel 1 exit /b 1

call ".venv-food-ai\Scripts\activate.bat"
python -m pip install --upgrade pip
pip install -r "ml-models\food-ai-server\requirements.txt"
pip install -r "ml-models\food-ai-server\requirements.tensorflow.txt"
pip install -r "ml-models\food-ai-server\requirements.foodx.txt"

echo.
echo OK. TensorFlow + FoodX PyTorch deps are in .venv-food-ai (not Python 3.14 system).
echo Next: npm run food-ai:dev
endlocal
