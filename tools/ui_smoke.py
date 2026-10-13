"""Headless smoke-test of every Tk screen (used by CI / developers).

Run with a virtual display on Linux:
    xvfb-run -a python tools/ui_smoke.py
"""
from __future__ import annotations

import os
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("HFTC_SMOKE", "1")


def main() -> int:
    import tkinter as tk
    from hftc import config, database as db, seed
    from hftc.app import MainApp
    from hftc.ui.theme import Theme

    db.init_db()
    seed.seed_demo()

    root = tk.Tk()
    root.withdraw()

    # build the main window straight away with the default admin user
    user = {"username": "admin", "full_name": "Head Office Admin",
            "role": config.ROLE_ADMIN}
    app = MainApp(user)
    app.update_idletasks()
    app.update()

    screens = ["dashboard", "customers", "collection", "inventory",
               "accounts", "reports", "settings", "users"]
    failed = []
    for name in screens:
        try:
            app.show(name)
            app.update_idletasks()
            app.update()
            print(f"  OK   {name}")
        except Exception:
            failed.append(name)
            print(f"  FAIL {name}\n{traceback.format_exc()}")

    # exercise a real collection through the screen objects
    try:
        coll = app._container["collection"]
        c = app._container["customers"]
        coll.load_customer(db.query_one(
            "SELECT id FROM customers ORDER BY card_no LIMIT 1")["id"])
        app.update_idletasks()
        print("  OK   collection.load_customer")
    except Exception:
        failed.append("collection.load_customer")
        print(f"  FAIL collection.load_customer\n{traceback.format_exc()}")

    # save a screenshot of the dashboard for visual verification
    try:
        app.show("dashboard")
        app.update_idletasks()
        app.update()
        out = Path(config.BASE_DIR) / "docs" / "screenshots"
        out.mkdir(parents=True, exist_ok=True)
        _screenshot(app, out / "dashboard.png")
        app.show("customers")
        app.update_idletasks(); app.update()
        _screenshot(app, out / "customers.png")
        print(f"  OK   screenshots -> {out}")
    except Exception:
        print(f"  ..   screenshot skipped: {traceback.format_exc().splitlines()[-1]}")

    app.destroy()
    db.close_connection()

    if failed:
        print(f"\n{len(failed)} screen(s) failed: {failed}")
        return 1
    print("\nAll screens constructed successfully.")
    return 0


def _screenshot(widget, path: Path) -> None:
    """Grab the window using PIL/ImageGrab if available (X11 via xwd)."""
    try:
        from PIL import ImageGrab  # type: ignore
        widget.update_idletasks()
        x, y = widget.winfo_rootx(), widget.winfo_rooty()
        w, h = widget.winfo_width(), widget.winfo_height()
        img = ImageGrab.grab(bbox=(x, y, x + w, y + h))
        img.save(path)
    except Exception:
        raise


if __name__ == "__main__":
    raise SystemExit(main())
