#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HF TC - Collection & Accounts Software
======================================
Standalone Windows build helper (PyInstaller).

Windows par ye script chalayein:

    pip install pyinstaller
    python build_windows.py

Nateeja:  dist\\HFTC.exe   (single file, double-click se chalne wali app)

Options
-------
    --onedir        ek folder build karein (onefile ke bajaye) - start tez hota hai
    --debug         console window ke sath build karein (errors dekhne ke liye)
    --install-deps  PyInstaller na ho to khud pip se install kar de
    --no-icon       icon shamil na karein

Note: Windows .exe sirf Windows par hi banti hai. Linux/macOS par ye script
chalane se us platform ka executable banta hai (cross-build possible nahi).
"""
from __future__ import annotations

import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP_NAME = "HFTC"
ENTRY = ROOT / "main.py"
VERSION = "1.0.0"
ICON = ROOT / "assets" / "hftc.ico"


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def info(msg: str) -> None:
    print(f"  [*] {msg}")


def ok(msg: str) -> None:
    print(f"  [OK] {msg}")


def warn(msg: str) -> None:
    print(f"  [!] {msg}")


def fail(msg: str) -> None:
    print(f"  [X] {msg}")


def check_python() -> bool:
    if sys.version_info < (3, 9):
        fail(f"Python {platform.python_version()} mila - 3.9 ya is se naya darkar hai.")
        return False
    ok(f"Python {platform.python_version()}")
    return True


def check_tkinter() -> bool:
    try:
        import tkinter  # noqa: F401
        ok("tkinter mojood hai")
        return True
    except Exception as exc:  # pragma: no cover
        fail(f"tkinter nahi mila: {exc}")
        warn("Windows par python.org installer dobara chalayein aur "
             "'tcl/tk and IDLE' checkbox tick karein.")
        return False


def ensure_pyinstaller(install: bool) -> bool:
    try:
        import PyInstaller  # noqa: F401
        ok(f"PyInstaller {PyInstaller.__version__} mojood hai")
        return True
    except ImportError:
        pass

    if not install:
        fail("PyInstaller install nahi hai.")
        print()
        print("    Is command ko chalayein, phir ye script dobara chalayein:")
        print("        pip install pyinstaller")
        print("    (ya:  python build_windows.py --install-deps )")
        return False

    info("PyInstaller install kiya ja raha hai (pip install pyinstaller) ...")
    rc = subprocess.call([sys.executable, "-m", "pip", "install", "--upgrade", "pyinstaller"])
    if rc != 0:
        fail("PyInstaller install nahi ho saka. Internet / proxy check karein.")
        return False
    ok("PyInstaller install ho gaya")
    return True


def data_sep() -> str:
    """PyInstaller --add-data separator: ';' on Windows, ':' elsewhere."""
    return ";" if os.name == "nt" else ":"


def write_version_file() -> Path | None:
    """Windows only: file properties (Details tab) ke liye version info."""
    if os.name != "nt":
        return None
    ver = tuple(int(x) for x in (VERSION + ".0.0").split(".")[:4])
    vf = ROOT / "build" / "version_info.txt"
    vf.parent.mkdir(parents=True, exist_ok=True)
    vf.write_text(
        "VSVersionInfo(\n"
        "  ffi=FixedFileInfo(\n"
        f"    filevers={ver},\n"
        f"    prodvers={ver},\n"
        "    mask=0x3f, flags=0x0, OS=0x40004, fileType=0x1, subtype=0x0, date=(0, 0)\n"
        "  ),\n"
        "  kids=[\n"
        "    StringFileInfo([\n"
        "      StringTable('040904B0', [\n"
        "        StringStruct('CompanyName', 'Hamdard Fauji Trading Corporation (HF TC)'),\n"
        "        StringStruct('FileDescription', 'HF TC - Collection & Accounts Software'),\n"
        f"        StringStruct('FileVersion', '{VERSION}'),\n"
        "        StringStruct('InternalName', 'HFTC'),\n"
        "        StringStruct('LegalCopyright', 'HF TC - Head Office Mirpur Mathelo'),\n"
        "        StringStruct('OriginalFilename', 'HFTC.exe'),\n"
        "        StringStruct('ProductName', 'HF TC - Collection & Accounts Software'),\n"
        f"        StringStruct('ProductVersion', '{VERSION}'),\n"
        "      ])\n"
        "    ]),\n"
        "    VarFileInfo([VarStruct('Translation', [1033, 1200])])\n"
        "  ]\n"
        ")\n",
        encoding="utf-8",
    )
    return vf


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------
def build(args: argparse.Namespace) -> int:
    print("=" * 68)
    print("  HF TC - Collection & Accounts Software   |   Standalone Build")
    print("=" * 68)
    print(f"  Platform : {platform.system()} {platform.machine()}")
    print(f"  Python   : {sys.executable}")
    print("-" * 68)

    if not check_python():
        return 2
    if not ENTRY.exists():
        fail(f"main.py nahi mila: {ENTRY}")
        return 2
    if not check_tkinter():
        return 3
    if not ensure_pyinstaller(args.install_deps):
        return 4

    # clean previous output
    for d in ("build", "dist"):
        p = ROOT / d
        if p.exists():
            shutil.rmtree(p, ignore_errors=True)
    for spec in ROOT.glob("*.spec"):
        try:
            spec.unlink()
        except OSError:
            pass

    cmd: list[str] = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm", "--clean",
        "--name", APP_NAME,
        "--windowed" if not args.debug else "--console",
        "--onefile" if not args.onedir else "--onedir",
        # make the bundled hftc package + sqlite schema available
        "--paths", str(ROOT),
        "--hidden-import", "hftc",
        "--collect-submodules", "hftc",
        "--add-data", f"{ROOT / 'hftc' / 'schema.sql'}{data_sep()}hftc",
        # keep the bundle small (app needs neither of these)
        "--exclude-module", "matplotlib",
        "--exclude-module", "numpy",
        "--exclude-module", "pandas",
        "--exclude-module", "PIL",
        "--exclude-module", "PyQt5",
        "--exclude-module", "PySide2",
        "--exclude-module", "pytest",
    ]

    icon = None
    if not args.no_icon and ICON.exists():
        icon = ICON
    elif not args.no_icon:
        png = ROOT / "assets" / "hftc_icon.png"
        if png.exists():
            icon = png  # PyInstaller PIL ke zariye .png ko .ico bana leta hai
    if icon:
        cmd += ["--icon", str(icon)]
        ok(f"icon shamil: {icon.name}")

    vf = write_version_file()
    if vf:
        cmd += ["--version-file", str(vf)]

    cmd.append(str(ENTRY))

    print()
    info("build command:")
    print("      " + " ".join(f'"{c}"' if " " in c else c for c in cmd))
    print()
    info("build shuru ... (pehli baar 1-3 minute lag sakte hain)")
    print("-" * 68)

    rc = subprocess.call(cmd, cwd=str(ROOT))

    print("-" * 68)
    if rc != 0:
        fail(f"build nakaam (exit code {rc}). Upar diya gaya error dekhein.")
        return rc

    exe_name = APP_NAME + (".exe" if os.name == "nt" else "")
    exe = ROOT / "dist" / (exe_name if not args.onedir else f"{APP_NAME}/{exe_name}")
    if exe.exists():
        ok(f"BUILD KAMYAB -> {exe}")
        try:
            size = exe.stat().st_size / 1024 / 1024
            info(f"size: {size:.1f} MB")
        except OSError:
            pass
        print()
        print("  Ab ye file double-click kar ke chalayein:")
        print(f"      {exe}")
        print("  Pehli baar chalne par: data/hftc.db banega, login admin / admin123")
    else:
        warn(f"build exit 0, lekin {exe} nahi mila - dist folder check karein.")
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="HF TC ke liye standalone Windows executable banayein.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--onedir", action="store_true",
                   help="ek folder build karein (onefile ke bajaye)")
    p.add_argument("--debug", action="store_true",
                   help="console window ke sath build karein")
    p.add_argument("--install-deps", action="store_true",
                   help="PyInstaller khud install karne ki koshish karein")
    p.add_argument("--no-icon", action="store_true", help="icon shamil na karein")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    return build(parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
