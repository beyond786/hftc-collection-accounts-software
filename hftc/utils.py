"""Formatting, date and validation helpers shared across HF TC."""
from __future__ import annotations

import math
import re
from datetime import date, datetime, timedelta
from typing import Optional

# --------------------------------------------------------------------------
# Money / numbers
# --------------------------------------------------------------------------
def fmt_money(value, decimals: int = 0) -> str:
    """12345.5 -> '12,346' (Pakistani grouping, no symbol)."""
    try:
        v = float(value or 0)
    except (TypeError, ValueError):
        return "0"
    if decimals:
        return f"{v:,.{decimals}f}"
    return f"{v:,.0f}"


def fmt_rs(value, decimals: int = 0) -> str:
    return f"Rs. {fmt_money(value, decimals)}"


def fmt_amount_slash(value) -> str:
    """The paper forms write amounts as '13500/='."""
    return f"{fmt_money(value)}/="


def to_float(value, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = re.sub(r"[^0-9.\-]", "", str(value))
    try:
        return float(cleaned) if cleaned not in ("", "-", ".") else default
    except ValueError:
        return default


def to_int(value, default: int = 0) -> int:
    try:
        return int(round(to_float(value, default)))
    except (TypeError, ValueError):
        return default


def num_to_words_urdu(amount) -> str:
    """Very small Urdu number-to-words helper for receipt footers."""
    n = to_int(amount)
    if n == 0:
        return "صفر"
    ones = ["", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو",
            "دس", "گیارہ", "بارہ", "تیرہ", "چودہ", "پندرہ", "سولہ", "سترہ",
            "اٹھارہ", "انیس"]
    tens = ["", "", "بیس", "تیس", "چالیس", "پچاس", "ساٹھ", "ستر", "اسی", "نوے"]

    def under_100(x: int) -> str:
        if x < 20:
            return ones[x]
        return (tens[x // 10] + (" " + ones[x % 10] if x % 10 else "")).strip()

    def under_1000(x: int) -> str:
        if x < 100:
            return under_100(x)
        return (ones[x // 100] + " سو" +
                (" " + under_100(x % 100) if x % 100 else "")).strip()

    parts = []
    crore, n = divmod(n, 10_000_000)
    lakh, n = divmod(n, 100_000)
    thousand, n = divmod(n, 1000)
    if crore:
        parts.append(under_1000(crore) + " کروڑ")
    if lakh:
        parts.append(under_1000(lakh) + " لاکھ")
    if thousand:
        parts.append(under_1000(thousand) + " ہزار")
    if n:
        parts.append(under_1000(n))
    return " ".join(parts) + " روپے"


# --------------------------------------------------------------------------
# Dates
# --------------------------------------------------------------------------
DATE_FMT = "%d-%m-%Y"
DATE_FMT_SHORT = "%d-%m-%y"


def today() -> date:
    return date.today()


def today_str() -> str:
    return today().strftime(DATE_FMT)


def parse_date(value, default: Optional[date] = None) -> Optional[date]:
    if not value:
        return default
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in (DATE_FMT, DATE_FMT_SHORT, "%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y",
                "%d.%m.%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return default


def fmt_date(value) -> str:
    d = parse_date(value)
    return d.strftime(DATE_FMT) if d else ""


def month_label(value) -> str:
    """Return 'MM-YY' style month label used on the ledger card."""
    d = parse_date(value)
    if not d:
        return ""
    return f"{d.month}-{str(d.year)[2:]}"


def add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    day = min(d.day, _days_in_month(y, m))
    return date(y, m, day)


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (date(year, month + 1, 1) - timedelta(days=1)).day


def month_start(d: Optional[date] = None) -> date:
    d = d or today()
    return d.replace(day=1)


def month_end(d: Optional[date] = None) -> date:
    d = d or today()
    return date(d.year, d.month, _days_in_month(d.year, d.month))


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------
def clean_nic(value: str) -> str:
    return re.sub(r"[^0-9]", "", value or "")


def is_valid_nic(value: str) -> bool:
    return len(clean_nic(value)) == 13


def format_nic(value: str) -> str:
    digits = clean_nic(value)
    if len(digits) != 13:
        return value or ""
    return f"{digits[0:5]}-{digits[5:12]}-{digits[12]}"


def is_valid_phone(value: str) -> bool:
    digits = re.sub(r"[^0-9]", "", value or "")
    return 10 <= len(digits) <= 13


def require(value, field: str) -> str:
    if value is None or str(value).strip() == "":
        raise ValueError(f"{field} لازمی ہے")
    return str(value).strip()


# --------------------------------------------------------------------------
# Installment schedule maths
# --------------------------------------------------------------------------
def installment_count(remaining: float, monthly: float) -> int:
    if monthly <= 0:
        return 0
    return int(math.ceil(round(remaining, 2) / monthly))


def build_schedule(remaining: float, monthly: float, start: date,
                   due_day: Optional[int] = None) -> list[dict]:
    """Return the projected installment schedule for a new account."""
    rows: list[dict] = []
    balance = round(float(remaining), 2)
    monthly = round(float(monthly), 2)
    if monthly <= 0:
        return rows
    n = 0
    while balance > 0.009 and n < 600:
        n += 1
        due = add_months(start, n)
        if due_day:
            due = due.replace(day=min(int(due_day), _days_in_month(due.year, due.month)))
        pay = min(monthly, balance)
        balance = round(balance - pay, 2)
        rows.append({
            "sr_no": n,
            "month": month_label(due),
            "due_date": due.strftime(DATE_FMT),
            "deposit": pay,
            "balance": balance,
        })
    return rows
