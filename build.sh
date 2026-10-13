#!/usr/bin/env bash
# =====================================================================
#  HF TC - Collection & Accounts Software
#  Standalone build helper for Linux / macOS (same pipeline as Windows)
#      ./build.sh            -> dist/HFTC        (onefile)
#      ./build.sh --onedir   -> dist/HFTC/HFTC   (folder build)
# =====================================================================
set -e
cd "$(dirname "$0")"

python3 -m pip install --upgrade pyinstaller >/dev/null 2>&1 || true
python3 build_windows.py "$@"
