"""Database, calculation and printing tests for HF TC."""
from __future__ import annotations

import pytest


# ----------------------------------------------------------------------
# Schema / setup
# ----------------------------------------------------------------------
def test_schema_created():
    from hftc import database as db
    tables = {r["name"] for r in db.query(
        "SELECT name FROM sqlite_master WHERE type='table'")}
    for t in ("customers", "installments", "receipts", "items",
              "stock_movements", "cashbook", "expenses", "users",
              "settings", "offices"):
        assert t in tables, f"missing table {t}"


def test_default_settings_and_admin():
    from hftc import database as db, models
    assert db.get_setting("company_name")
    admin = models.UserService.authenticate("admin", "admin123")
    assert admin is not None
    assert models.UserService.authenticate("admin", "wrong") is None


def test_password_hash_roundtrip():
    from hftc import database as db
    h = db.hash_password("secret")
    assert db.verify_password("secret", h)
    assert not db.verify_password("nope", h)


# ----------------------------------------------------------------------
# Utils
# ----------------------------------------------------------------------
def test_money_and_words():
    from hftc import utils
    assert utils.fmt_money(13500) == "13,500"
    assert utils.fmt_amount_slash(1200) == "1,200/="
    assert "ہزار" in utils.num_to_words_urdu(13000)


def test_date_helpers():
    from hftc import utils
    assert utils.parse_date("06-01-2023") is not None
    assert utils.fmt_date("24-9-21") == "24-09-2021"
    assert utils.month_label("2025-06-15") == "6-25"


def test_installment_count_and_schedule():
    from hftc import utils
    assert utils.installment_count(32200, 3000) == 11
    sched = utils.build_schedule(10000, 3000, utils.today())
    assert [r["deposit"] for r in sched] == [3000, 3000, 3000, 1000]
    assert sched[-1]["balance"] == 0


def test_nic_formatting():
    from hftc import utils
    assert utils.is_valid_nic("42205-3097147-7")
    assert utils.format_nic("4220530971477") == "42205-3097147-7"


# ----------------------------------------------------------------------
# Customers & balances
# ----------------------------------------------------------------------
_CARD_SEQ = {"n": 200}


def _make_customer(total=30000, adv=3000, monthly=3000, card=None):
    from hftc import models, utils
    if card is None:
        _CARD_SEQ["n"] += 1
        card = f"T{_CARD_SEQ['n']}"
    return models.CustomerService.save({
        "card_no": card, "name": "ٹیسٹ گاہک", "father_name": "ٹیسٹ والد",
        "phone": "0300-0000000", "item_name": "ٹیسٹ شے",
        "date_joined": utils.today_str(), "total_amount": total,
        "advance": adv, "monthly_installment": monthly, "due_day": 10,
        "status": "active",
    })


def test_customer_creation_balance():
    from hftc import models
    cid = _make_customer(total=30000, adv=3000, card="T100")
    assert models.CustomerService.balance(cid) == 27000
    c = models.CustomerService.get(cid)
    assert c["remaining_amount"] == 27000


def test_collection_reduces_balance():
    from hftc import models, utils
    cid = _make_customer(total=20000, adv=2000, monthly=2000, card="T101")
    assert models.CustomerService.balance(cid) == 18000
    receipt = models.CollectionService.collect(cid, 2000, utils.today_str())
    assert receipt["amount"] == 2000
    assert receipt["balance_after"] == 16000
    assert models.CustomerService.balance(cid) == 16000
    # advance (2000) + collected installment (2000)
    assert models.CustomerService.total_paid(cid) == 4000


def test_overpayment_rejected():
    from hftc import models, utils
    cid = _make_customer(total=5000, adv=0, monthly=1000, card="T102")
    with pytest.raises(ValueError):
        models.CollectionService.collect(cid, 999999, utils.today_str())


def test_account_closes_when_fully_paid():
    from hftc import models, utils
    cid = _make_customer(total=4000, adv=0, monthly=1000, card="T103")
    models.CollectionService.collect(cid, 4000, utils.today_str())
    assert models.CustomerService.balance(cid) == 0
    assert models.CustomerService.get(cid)["status"] == "closed"


def test_ledger_rows_recorded():
    from hftc import models, utils
    cid = _make_customer(total=9000, adv=0, monthly=3000, card="T104")
    for _ in range(3):
        models.CollectionService.collect(cid, 3000, utils.today_str())
    ledger = models.CustomerService.ledger(cid)
    assert len(ledger) == 3
    assert ledger[-1]["balance"] == 0
    assert ledger[-1]["sr_no"] == 3


def test_late_fine():
    from hftc import models, utils
    cid = _make_customer(total=10000, adv=0, monthly=1000, card="T105")
    # pay far after the due day -> a fine is due
    late = utils.add_months(utils.today(), 1).strftime(utils.DATE_FMT)
    fine = models.CollectionService.late_fine_for(cid, late)
    assert fine >= 300


def test_cash_book_tracks_collections():
    from hftc import models, utils
    cid = _make_customer(total=6000, adv=0, monthly=3000, card="T106")
    before = models.CashBookService.current_balance()
    models.CollectionService.collect(cid, 3000, utils.today_str())
    after = models.CashBookService.current_balance()
    assert round(after - before, 2) == 3000


# ----------------------------------------------------------------------
# Inventory
# ----------------------------------------------------------------------
def test_item_stock_movements():
    from hftc import config, models
    iid = models.ItemService.save({
        "code": "IT-T1", "name": "ٹیسٹ شے", "purchase_price": 100,
        "sale_price": 150, "cash_rate": 150, "qty_in_stock": 0,
    })
    models.StockService.move(iid, config.MOVE_PURCHASE, 5, rate=100)
    assert models.ItemService.get(iid)["qty_in_stock"] == 5
    models.StockService.move(iid, config.MOVE_SALE, 2, rate=150)
    assert models.ItemService.get(iid)["qty_in_stock"] == 3
    with pytest.raises(ValueError):
        models.StockService.move(iid, config.MOVE_SALE, 99, rate=150)


# ----------------------------------------------------------------------
# Expenses & reports
# ----------------------------------------------------------------------
def test_expense_updates_cashbook():
    from hftc import models, utils
    before = models.CashBookService.current_balance()
    models.ExpenseService.add(utils.today_str(), "تنخواہ", "ٹیسٹ", 5000)
    after = models.CashBookService.current_balance()
    assert round(before - after, 2) == 5000


def test_dashboard_shape():
    from hftc import models
    d = models.ReportService.dashboard()
    for key in ("customers", "active", "today_collection", "cash_balance",
                "total_receivable", "stock_value"):
        assert key in d


def test_profit_summary():
    from hftc import models, utils
    d1 = utils.add_months(utils.today(), -1).strftime(utils.DATE_FMT)
    d2 = utils.today_str()
    s = models.ReportService.profit_summary(d1, d2)
    assert set(s) == {"collected", "expenses", "purchases", "net"}
    assert round(s["net"], 2) == round(s["collected"] - s["expenses"], 2)


# ----------------------------------------------------------------------
# Printing
# ----------------------------------------------------------------------
def _demo_customer():
    from hftc import models, utils
    cid = _make_customer(total=33200, adv=1000, monthly=3000)
    models.CollectionService.collect(cid, 3000, utils.today_str())
    return models.CustomerService.get(cid)


def test_receipt_printout_contains_paper_fields():
    from hftc import models, printing
    c = _demo_customer()
    r = models.CollectionService.list_receipts(search=c["card_no"])[0]
    html = printing.PrintService.receipt_html(r)
    for token in ("کارڈ نمبر", "رسید نمبر", "مبلغ", "بقایا",
                  "دستخط منیجر", "فی چکر جرمانہ", c["name"]):
        assert token in html, f"receipt missing {token}"


def test_agreement_printout_contains_paper_fields():
    from hftc import printing
    c = _demo_customer()
    html = printing.PrintService.agreement_html(c)
    for token in ("پتہ مستقل", "پتہ موجودہ", "کام یا ملازمت کا پتہ",
                  "نام ضامنی", "درخواست دہندہ سے مراسم", "کل رقم",
                  "ایڈوانس", "بقایا رقم", "ہارڈ کیش ریٹ", "رسید نمبر"):
        assert token in html, f"agreement missing {token}"


def test_ledger_printout_has_columns_and_rows():
    from hftc import config, printing
    c = _demo_customer()
    html = printing.PrintService.ledger_html(c)
    for token in ("دستخط OM", "ماہ", "جمع", "بقایا", "رسید", "تاریخ", "نمبر"):
        assert token in html, f"ledger missing {token}"
    assert html.count("<tr>") >= config.ledger_rows()


def test_reports_render(tmp_path):
    from hftc import reports, utils
    day = utils.today_str()
    d1 = utils.month_start().strftime(utils.DATE_FMT)
    paths = [
        reports.Reports.collection_sheet(day, open_browser=False),
        reports.Reports.daily_report(day, open_browser=False),
        reports.Reports.outstanding(open_browser=False),
        reports.Reports.overdue(open_browser=False),
        reports.Reports.inventory(open_browser=False),
        reports.Reports.cash_book(d1, day, open_browser=False),
        reports.Reports.expenses(d1, day, open_browser=False),
        reports.Reports.profit(d1, day, open_browser=False),
        reports.Reports.collector_summary(d1, day, open_browser=False),
    ]
    for p in paths:
        assert p.exists() and p.stat().st_size > 200


def test_backup_produces_file():
    from hftc import database as db
    p = db.backup_db("pytest")
    assert p.exists() and p.stat().st_size > 0


# ----------------------------------------------------------------------
# UI imports (ensure no syntax/import errors in the Tk layer)
# ----------------------------------------------------------------------
def test_ui_modules_import():
    import importlib
    for mod in ("hftc.app", "hftc.ui.theme", "hftc.ui.widgets",
                "hftc.ui.screens", "hftc.printing", "hftc.reports",
                "hftc.models", "hftc.database", "hftc.utils", "hftc.seed"):
        importlib.import_module(mod)
