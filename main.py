#!/usr/bin/env python3
"""
HF TC - Collection & Accounts Software
======================================
Entry point.

Run:   python main.py
Data:  a local SQLite database is created at  data/hftc.db

Requirements: Python 3.9+ (tkinter + sqlite3, both bundled with the
python.org Windows installer).
"""
from __future__ import annotations

import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))


def _fatal(msg: str) -> None:
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("HF TC - خرابی", msg)
        root.destroy()
    except Exception:
        print(msg)


def main() -> int:
    try:
        from hftc import database as db
        from hftc.app import main as run_app
    except ImportError as exc:
        _fatal(f"درکار لائبریری موجود نہیں: {exc}\n\n"
               "براہ کرم Python دوبارہ انسٹال کریں (tkinter شامل ہونا چاہیے)۔")
        return 1

    try:
        db.init_db()
        run_app()
        return 0
    except Exception:
        _fatal("ایپلیکیشن شروع کرنے میں خرابی:\n\n" + traceback.format_exc())
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
