"""
SQLite database layer for HF TC.

The database is a single local file (data/hftc.db) that lives on the Head
Office computer.  Everything goes through :func:`get_connection` so the whole
application shares one configured connection factory.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Optional, Sequence

from . import config

_local = threading.local()


# --------------------------------------------------------------------------
# Connection handling
# --------------------------------------------------------------------------
def get_connection() -> sqlite3.Connection:
    """Return a thread-local connection with row access by name."""
    conn = getattr(_local, "conn", None)
    if conn is None:
        config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(config.DB_PATH), timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        _local.conn = conn
    return conn


def close_connection() -> None:
    conn = getattr(_local, "conn", None)
    if conn is not None:
        conn.close()
        _local.conn = None


# --------------------------------------------------------------------------
# Query helpers
# --------------------------------------------------------------------------
def query(sql: str, params: Sequence[Any] = ()) -> list[sqlite3.Row]:
    cur = get_connection().execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    return rows


def query_one(sql: str, params: Sequence[Any] = ()) -> Optional[sqlite3.Row]:
    cur = get_connection().execute(sql, params)
    row = cur.fetchone()
    cur.close()
    return row


def scalar(sql: str, params: Sequence[Any] = (), default: Any = 0) -> Any:
    row = query_one(sql, params)
    if row is None or row[0] is None:
        return default
    return row[0]


def execute(sql: str, params: Sequence[Any] = ()) -> int:
    conn = get_connection()
    cur = conn.execute(sql, params)
    conn.commit()
    lastrow = cur.lastrowid
    cur.close()
    return lastrow


def execute_many(sql: str, seq: Iterable[Sequence[Any]]) -> None:
    conn = get_connection()
    conn.executemany(sql, seq)
    conn.commit()


def insert(table: str, data: dict) -> int:
    cols = ", ".join(data.keys())
    marks = ", ".join("?" for _ in data)
    sql = f"INSERT INTO {table} ({cols}) VALUES ({marks})"
    return execute(sql, tuple(data.values()))


def update(table: str, data: dict, where: str, params: Sequence[Any] = ()) -> None:
    sets = ", ".join(f"{k} = ?" for k in data)
    sql = f"UPDATE {table} SET {sets} WHERE {where}"
    execute(sql, tuple(data.values()) + tuple(params))


def delete(table: str, where: str, params: Sequence[Any] = ()) -> None:
    execute(f"DELETE FROM {table} WHERE {where}", params)


# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------
def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    row = query_one("SELECT value FROM settings WHERE key = ?", (key,))
    if row is None:
        return default
    return row["value"]


def set_setting(key: str, value: str) -> None:
    execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, str(value)),
    )


def all_settings() -> dict:
    return {r["key"]: r["value"] for r in query("SELECT key, value FROM settings")}


# --------------------------------------------------------------------------
# Password hashing (PBKDF2-SHA256, no external dependency)
# --------------------------------------------------------------------------
def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"),
                                 bytes.fromhex(salt), 120_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt, digest = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"),
                                    bytes.fromhex(salt), 120_000).hex()
        return check == digest
    except Exception:
        return False


# --------------------------------------------------------------------------
# Initialisation
# --------------------------------------------------------------------------
def init_db(seed: bool = True) -> None:
    """Create the schema (idempotent) and seed the default rows."""
    conn = get_connection()
    with open(config.SCHEMA_PATH, "r", encoding="utf-8") as fh:
        conn.executescript(fh.read())
    conn.commit()
    if seed:
        seed_defaults()


def seed_defaults() -> None:
    # settings
    for key, value in config.DEFAULT_SETTINGS.items():
        if get_setting(key) is None:
            set_setting(key, value)

    # default office
    if scalar("SELECT COUNT(*) FROM offices") == 0:
        insert("offices", {
            "name": config.DEFAULT_SETTINGS["head_office"],
            "address": config.DEFAULT_SETTINGS["address"],
            "phone1": config.DEFAULT_SETTINGS["phone1"],
            "phone2": config.DEFAULT_SETTINGS["phone2"],
        })

    # default admin
    if scalar("SELECT COUNT(*) FROM users") == 0:
        insert("users", {
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "full_name": "Head Office Admin",
            "role": config.ROLE_ADMIN,
        })


# --------------------------------------------------------------------------
# Audit
# --------------------------------------------------------------------------
def audit(user_name: str, action: str, entity: str = "",
          entity_id: Any = "", details: str = "") -> None:
    try:
        insert("audit_log", {
            "user_name": user_name, "action": action, "entity": entity,
            "entity_id": str(entity_id), "details": details,
        })
    except Exception:
        pass


# --------------------------------------------------------------------------
# Backup / restore
# --------------------------------------------------------------------------
def backup_db(tag: str = "") -> Path:
    config.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = f"hftc_{stamp}{('_' + tag) if tag else ''}.db"
    dest = config.BACKUP_DIR / name
    src = get_connection()
    src.commit()
    bck = sqlite3.connect(str(dest))
    with bck:
        src.backup(bck)
    bck.close()
    _prune_backups()
    return dest


def _prune_backups() -> None:
    try:
        keep = int(get_setting("backup_keep", "30") or 30)
    except (TypeError, ValueError):
        keep = 30
    files = sorted(config.BACKUP_DIR.glob("hftc_*.db"),
                   key=lambda p: p.stat().st_mtime, reverse=True)
    for old in files[keep:]:
        try:
            old.unlink()
        except OSError:
            pass


def restore_db(path: str | Path) -> None:
    close_connection()
    shutil.copy2(str(path), str(config.DB_PATH))
