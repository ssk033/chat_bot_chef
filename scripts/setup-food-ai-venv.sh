#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Turn C:\... into /c/... for Git Bash
win_to_msys() {
  local s="$1"
  s="${s//$'\r'/}"
  s="${s//\\/\/}"
  if [[ "${s:1:1}" == ":" ]]; then
    local d="${s:0:1}"
    d="${d,,}"
    printf '/%s%s' "$d" "${s:2}"
  else
    printf '%s' "$s"
  fi
}

verify312() {
  "$1" -c 'import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 12) else 1)' 2>/dev/null
}

# Locate Python 3.12 (TensorFlow wheels: 3.10–3.12 on Windows amd64).
resolve_python312() {
  local p out la m

  if [[ -n "${FOOD_AI_PYTHON312:-}" ]]; then
    p="${FOOD_AI_PYTHON312}"
    [[ -f "$p" ]] && verify312 "$p" && {
      printf '%s' "$p"
      return 0
    }
  fi

  # %LocalAppData%\Programs\Python\Python312\python.exe (works with spaces in username)
  if command -v cmd.exe >/dev/null 2>&1; then
    la="$(cmd.exe //c "echo %LocalAppData%" 2>/dev/null | tr -d '\r\n')"
    if [[ -n "$la" ]]; then
      m="$(win_to_msys "$la")"
      p="${m}/Programs/Python/Python312/python.exe"
      if [[ -f "$p" ]] && verify312 "$p"; then
        printf '%s' "$p"
        return 0
      fi
    fi
  fi

  # Common fixed paths
  for cand in \
    "/c/Python312/python.exe" \
    "${HOME}/AppData/Local/Programs/Python/Python312/python.exe" \
    "/c/Program Files/Python312/python.exe"; do
    p="$(printf '%s' "$cand" | sed 's|\\|/|g')"
    [[ -f "$p" ]] || continue
    if verify312 "$p"; then
      printf '%s' "$p"
      return 0
    fi
  done

  # Git Bash often does not see the same PATH as CMD — ask Windows py launcher
  if command -v cmd.exe >/dev/null 2>&1; then
    out="$(cmd.exe //c "py -3.12 -c \"import sys; print(sys.executable)\"" 2>/dev/null | tr -d '\r\n')"
    if [[ -n "$out" ]]; then
      p="$(win_to_msys "$out")"
      if [[ -f "$p" ]] && verify312 "$p"; then
        printf '%s' "$p"
        return 0
      fi
    fi
  fi

  if command -v py >/dev/null 2>&1; then
    out="$(py -3.12 -c "import sys; print(sys.executable)" 2>/dev/null)" || true
    if [[ -n "$out" ]]; then
      p="$out"
      if [[ "${p:1:1}" == ":" ]]; then
        p="$(win_to_msys "$p")"
      fi
      if [[ -f "$p" ]] && verify312 "$p"; then
        printf '%s' "$p"
        return 0
      fi
    fi
  fi

  if command -v python3.12 >/dev/null 2>&1; then
    p="$(command -v python3.12)"
    if verify312 "$p"; then
      printf '%s' "$p"
      return 0
    fi
  fi

  return 1
}

PYTHON312=""
if PYTHON312="$(resolve_python312)"; then
  :
else
  echo "[!] No Python 3.12 interpreter found."
  echo ""
  echo "    TensorFlow needs Python 3.12 (64-bit). Your default may be 3.14 only."
  echo ""
  if command -v cmd.exe >/dev/null 2>&1; then
    echo "    Installed runtimes (Windows \"py\" launcher):"
    cmd.exe //c "py -0p" 2>/dev/null | sed 's/^/        /' || true
    echo ""
  fi
  echo "    Install 3.12, then open a NEW terminal and re-run npm run food-ai:venv"
  echo ""
  echo "    winget install --id Python.Python.3.12 -e --source winget"
  echo ""
  echo "    Or: https://www.python.org/downloads/release/python-3129/ (Windows x86-64)"
  echo "    Or set full path: export FOOD_AI_PYTHON312=\"/c/Users/You/AppData/Local/Programs/Python/Python312/python.exe\""
  echo ""
  exit 1
fi

echo "Using Python 3.12 at: ${PYTHON312}"
echo "Creating .venv-food-ai..."
"$PYTHON312" -m venv .venv-food-ai

if [[ -f ".venv-food-ai/Scripts/activate" ]]; then
  # shellcheck source=/dev/null
  source ".venv-food-ai/Scripts/activate"
else
  # shellcheck source=/dev/null
  source ".venv-food-ai/bin/activate"
fi

python -m pip install --upgrade pip
pip install -r ml-models/food-ai-server/requirements.txt
pip install -r ml-models/food-ai-server/requirements.tensorflow.txt
pip install -r ml-models/food-ai-server/requirements.foodx.txt
echo ""
echo "OK. TensorFlow + FoodX (PyTorch) deps are in .venv-food-ai."
echo "Next: npm run food-ai:dev"
