"""Create a Windows standalone build of HF TC with PyInstaller.

Usage (on Windows):
    pip install pyinstaller
    python build_windows.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> int:
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        print("PyInstaller نہیں ملا۔ پہلے چلائیں:  pip install pyinstaller")
        return 1

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm", "--clean",
        "--name", "HFTC",
        "--windowed",                       # no console window
        "--add-data", f"hftc/schema.sql;hftc",
        str(ROOT / "main.py"),
    ]
    print("Running:", " ".join(cmd))
    return subprocess.call(cmd, cwd=str(ROOT))


if __name__ == "__main__":
    raise SystemExit(main())
