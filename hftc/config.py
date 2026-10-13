"""
HF TC - Collection & Accounts Software
Central configuration: paths, constants and bilingual (Urdu/English) labels.

Company : Hamdard Fauji Trading Corporation (HF TC)
Head Office : Mirpur Mathelo
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

APP_NAME = "HF TC - Collection & Accounts Software"
APP_SHORT = "HF TC"
APP_VERSION = "1.0.0"

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
def _base_dir() -> Path:
    """Directory that holds the SQLite database and generated printouts.

    When frozen (PyInstaller) the data lives next to the executable so the
    Head Office computer keeps its database locally.  In development it lives
    in the project root.
    """
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = _base_dir()
DATA_DIR = BASE_DIR / "data"
PRINT_DIR = BASE_DIR / "printouts"
BACKUP_DIR = BASE_DIR / "backups"
LOG_DIR = BASE_DIR / "logs"

DB_PATH = DATA_DIR / "hftc.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

for _d in (DATA_DIR, PRINT_DIR, BACKUP_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------------------------------
# Business defaults (all overridable from the Settings screen)
# --------------------------------------------------------------------------
DEFAULT_SETTINGS = {
    "company_name": "ہمدرد فوجی ٹریڈنگ کارپوریشن",
    "company_name_en": "Hamdard Fauji Trading Corporation",
    "company_short": "HF TC",
    "head_office": "آفس میر پور ماتھیلو",
    "head_office_en": "Head Office Mirpur Mathelo",
    "phone1": "0308-2710346",
    "phone2": "0300-2245768",
    "address": "میر پور ماتھیلو، سندھ",
    "late_fine": "300",          # جرمانہ فی چکر (per visit)
    "currency": "Rs.",
    "ledger_rows": "20",         # rows printed on the ledger card
    "receipt_prefix": "R",
    "card_prefix": "",
    "financial_year_start": "07-01",
    "backup_keep": "30",
}

# Roles
ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_OPERATOR = "operator"
ROLE_COLLECTOR = "collector"
ROLES = [ROLE_ADMIN, ROLE_MANAGER, ROLE_OPERATOR, ROLE_COLLECTOR]

# Customer status
STATUS_ACTIVE = "active"
STATUS_CLOSED = "closed"
STATUS_DEFAULTER = "defaulter"

# Stock movement types
MOVE_PURCHASE = "purchase"
MOVE_SALE = "sale"
MOVE_RETURN = "return"
MOVE_ADJUST = "adjust"
MOVE_DAMAGE = "damage"

# Cash book reference types
REF_RECEIPT = "receipt"
REF_EXPENSE = "expense"
REF_PURCHASE = "purchase"
REF_CAPITAL = "capital"
REF_OTHER = "other"

# --------------------------------------------------------------------------
# Bilingual labels used across the UI and the printed forms
# --------------------------------------------------------------------------
L = {
    # generic
    "save": "محفوظ کریں",
    "cancel": "منسوخ",
    "delete": "حذف کریں",
    "edit": "ترمیم",
    "new": "نیا",
    "search": "تلاش",
    "print": "پرنٹ",
    "close": "بند کریں",
    "refresh": "تازہ کریں",
    "total": "کل",
    "date": "تاریخ",
    "amount": "رقم",
    "remarks": "نوٹ",
    "yes": "ہاں",
    "no": "نہیں",
    # form fields (as printed on the paper forms)
    "card_no": "کارڈ نمبر",
    "name": "نام",
    "father_name": "ولدیت",
    "caste": "قوم",
    "permanent_address": "پتہ مستقل",
    "present_address": "پتہ موجودہ",
    "work_address": "کام یا ملازمت کا پتہ",
    "phone": "فون نمبر",
    "nic_no": "این آئی سی نمبر",
    "age": "عمر",
    "item_name": "نام اشیاء",
    "model": "ماڈل",
    "date_joined": "تاریخ جمع",
    "total_amount": "کل رقم",
    "advance": "ایڈوانس",
    "remaining_amount": "بقایا رقم",
    "monthly_installment": "قسط ماہانہ",
    "due_day": "تاریخ قسط ادائیگی",
    "cash_rate": "کیش ریٹ",
    "hard_cash_rate": "ہارڈ کیش ریٹ",
    "receipt_no": "رسید نمبر",
    "guarantor": "ضامن",
    "g_name": "نام ضامنی",
    "g_relation": "درخواست دہندہ سے مراسم",
    "signature": "دستخط",
    "manager_signature": "دستخط منیجر",
    "guarantor_signature": "دستخط ضامن",
    "tenant_signature": "دستخط کرایہ دار",
    # ledger card columns
    "col_sr": "نمبر",
    "col_om": "دستخط OM",
    "col_month": "ماہ",
    "col_deposit": "جمع",
    "col_balance": "بقایا",
    "col_receipt": "رسید",
    "col_date": "تاریخ",
    "col_sign": "دستخط",
    # modules
    "dashboard": "ڈیش بورڈ",
    "customers": "کھاتے / گاہک",
    "collection": "وصولی",
    "inventory": "اسٹاک / اشیاء",
    "accounts": "حسابات",
    "reports": "رپورٹس",
    "settings": "ترتیبات",
    "users": "صارفین",
}

# Late-fine note printed at the bottom of the receipt
LATE_FINE_NOTE = "نوٹ: لیٹ قسط کی صورت میں -/{fine} روپیہ فی چکر جرمانہ"


def setting(key: str, default: str = "") -> str:
    """Read a setting from the DB with a safe fallback to DEFAULT_SETTINGS."""
    try:
        from .database import get_setting  # local import to avoid a cycle
        val = get_setting(key)
        if val not in (None, ""):
            return val
    except Exception:
        pass
    return DEFAULT_SETTINGS.get(key, default)


def late_fine() -> float:
    try:
        return float(setting("late_fine", "300") or 300)
    except (TypeError, ValueError):
        return 300.0


def ledger_rows() -> int:
    try:
        return int(setting("ledger_rows", "20") or 20)
    except (TypeError, ValueError):
        return 20
