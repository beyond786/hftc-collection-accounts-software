#!/usr/bin/env bash
# HF TC - Collection & Accounts Software (Linux/macOS launcher)
set -e
cd "$(dirname "$0")"
mkdir -p data
exec python3 main.py "$@"
