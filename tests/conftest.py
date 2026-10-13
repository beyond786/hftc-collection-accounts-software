"""HF TC test-suite (pytest).  Run:  pytest -q"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


@pytest.fixture(scope="session", autouse=True)
def _isolated_db(tmp_path_factory):
    """Point the app at a throw-away database for the whole test session."""
    from hftc import config
    work = tmp_path_factory.mktemp("hftc")
    config.DATA_DIR = work
    config.DB_PATH = work / "test.db"
    config.PRINT_DIR = work / "print"
    config.BACKUP_DIR = work / "backup"
    config.LOG_DIR = work / "logs"
    for d in (config.DATA_DIR, config.PRINT_DIR, config.BACKUP_DIR, config.LOG_DIR):
        d.mkdir(parents=True, exist_ok=True)
    from hftc import database as db
    db.close_connection()
    db.init_db()
    yield
    db.close_connection()
