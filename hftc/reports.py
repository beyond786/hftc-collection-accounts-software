"""Ready-made report definitions built on top of PrintService."""
from __future__ import annotations

from datetime import date

from . import config, models, printing, utils


class Reports:
    """Build the standard HF TC reports."""

    @staticmethod
    def collection_sheet(day: str, open_browser: bool = True):
        rows = models.CollectionService.list_receipts(date_from=day, date_to=day)
        total = models.CollectionService.day_total(day)
        cols = [("#", "نمبر"), ("receipt_no", "رسید نمبر"), ("card_no", "کارڈ نمبر"),
                ("customer_name", "نام"), ("item_name", "نام اشیاء"),
                ("money:amount", "جمع"), ("money:fine", "جرمانہ"),
                ("money:balance_after", "بقایا"), ("collector", "وصول کنندہ")]
        footer = {"money:amount": sum(utils.to_float(r["amount"]) for r in rows),
                  "money:fine": sum(utils.to_float(r["fine"]) for r in rows)}
        return printing.PrintService.print_report(
            f"report_collection_{day}", "روزانہ وصولی شیٹ", cols, rows, footer,
            subtitle=f"تاریخ: {utils.fmt_date(day)}   |   کل وصولی: {utils.fmt_rs(total)}",
            open_browser=open_browser)

    @staticmethod
    def outstanding(min_balance: float = 0.0, open_browser: bool = True):
        rows = models.ReportService.outstanding(min_balance)
        total = sum(utils.to_float(r["balance"]) for r in rows)
        cols = [("#", "نمبر"), ("card_no", "کارڈ نمبر"), ("name", "نام"),
                ("phone", "فون"), ("item_name", "نام اشیاء"),
                ("money:total_amount", "کل رقم"), ("money:paid", "وصول"),
                ("money:balance", "بقایا"), ("status", "حالت")]
        return printing.PrintService.print_report(
            "report_outstanding", "بقایا کھاتے (Outstanding)", cols, rows,
            {"money:balance": total},
            subtitle=f"کل بقایا: {utils.fmt_rs(total)}   |   کھاتے: {len(rows)}",
            landscape=True, open_browser=open_browser)

    @staticmethod
    def overdue(open_browser: bool = True):
        rows = models.CustomerService.overdue()
        cols = [("#", "نمبر"), ("card_no", "کارڈ نمبر"), ("name", "نام"),
                ("phone", "فون"), ("due_date", "تاریخ قسط"),
                ("money:monthly_installment", "قسط ماہانہ"),
                ("money:paid_this_month", "ماہ میں وصول"),
                ("money:balance", "بقایا")]
        return printing.PrintService.print_report(
            "report_overdue", "ڈیفالٹر / تاخیر کھاتے", cols, rows,
            subtitle=f"کل کھاتے: {len(rows)}", landscape=True,
            open_browser=open_browser)

    @staticmethod
    def inventory(open_browser: bool = True):
        rows = models.ItemService.list_all()
        cols = [("#", "نمبر"), ("code", "کوڈ"), ("name", "نام اشیاء"),
                ("model", "ماڈل"), ("num:qty_in_stock", "اسٹاک"),
                ("money:purchase_price", "خرید ریٹ"),
                ("money:sale_price", "فروخت ریٹ"),
                ("money:cash_rate", "کیش ریٹ")]
        value = models.ItemService.stock_value()
        return printing.PrintService.print_report(
            "report_inventory", "اسٹاک رپورٹ", cols, rows,
            subtitle=f"اسٹاک کی کل مالیت: {utils.fmt_rs(value)}",
            open_browser=open_browser)

    @staticmethod
    def cash_book(date_from: str, date_to: str, open_browser: bool = True):
        rows = models.CashBookService.list_entries(date_from, date_to)
        t = models.CashBookService.totals(date_from, date_to)
        cols = [("entry_date", "تاریخ"), ("description", "تفصیل"),
                ("money:cash_in", "آمد"), ("money:cash_out", "خرچ"),
                ("money:balance", "بقایا")]
        return printing.PrintService.print_report(
            "report_cashbook", "روزنامچہ (Cash Book)", cols, rows,
            {"money:cash_in": t["cash_in"], "money:cash_out": t["cash_out"]},
            subtitle=f"{utils.fmt_date(date_from)} تا {utils.fmt_date(date_to)}"
                     f"   |   موجودہ بیلنس: {utils.fmt_rs(models.CashBookService.current_balance())}",
            open_browser=open_browser)

    @staticmethod
    def expenses(date_from: str, date_to: str, open_browser: bool = True):
        rows = models.ExpenseService.list_all(date_from, date_to)
        total = models.ExpenseService.total(date_from, date_to)
        cols = [("#", "نمبر"), ("expense_date", "تاریخ"), ("category", "مد"),
                ("description", "تفصیل"), ("paid_to", "ادا شدہ"),
                ("money:amount", "رقم")]
        return printing.PrintService.print_report(
            "report_expenses", "اخراجات", cols, rows, {"money:amount": total},
            subtitle=f"{utils.fmt_date(date_from)} تا {utils.fmt_date(date_to)}"
                     f"   |   کل: {utils.fmt_rs(total)}", open_browser=open_browser)

    @staticmethod
    def profit(date_from: str, date_to: str, open_browser: bool = True):
        d = models.ReportService.profit_summary(date_from, date_to)
        rows = [
            {"k": "کل وصولی (Receipts)", "amount": d["collected"]},
            {"k": "کل اخراجات (Expenses)", "amount": d["expenses"]},
            {"k": "کل خریداری (Purchases)", "amount": d["purchases"]},
            {"k": "خالص (Net)", "amount": d["net"]},
        ]
        cols = [("k", "تفصیل"), ("money:amount", "رقم")]
        return printing.PrintService.print_report(
            "report_profit", "منافع و نقصان کا خلاصہ", cols, rows,
            subtitle=f"{utils.fmt_date(date_from)} تا {utils.fmt_date(date_to)}",
            open_browser=open_browser)

    @staticmethod
    def collector_summary(date_from: str, date_to: str, open_browser: bool = True):
        rows = models.ReportService.collector_summary(date_from, date_to)
        cols = [("#", "نمبر"), ("collector", "وصول کنندہ"), ("cnt", "رسیدیں"),
                ("money:amount", "وصولی"), ("money:fine", "جرمانہ")]
        return printing.PrintService.print_report(
            "report_collectors", "وصول کنندگان کا خلاصہ", cols, rows,
            subtitle=f"{utils.fmt_date(date_from)} تا {utils.fmt_date(date_to)}",
            open_browser=open_browser)

    @staticmethod
    def daily_report(day: Optional[str] = None, open_browser: bool = True):
        """Combined day-end report: receipts + cash position."""
        day = day or utils.today_str()
        rows = models.CollectionService.list_receipts(date_from=day, date_to=day)
        cols = [("#", "نمبر"), ("receipt_no", "رسید"), ("card_no", "کارڈ"),
                ("customer_name", "نام"), ("money:amount", "جمع"),
                ("money:balance_after", "بقایا"), ("collector", "وصول کنندہ")]
        t = models.CollectionService.day_total(day)
        return printing.PrintService.print_report(
            f"report_daily_{day}", "روزانہ بندش رپورٹ", cols, rows,
            {"money:amount": sum(utils.to_float(r["amount"]) for r in rows)},
            subtitle=f"تاریخ: {utils.fmt_date(day)}   |   کل وصولی: {utils.fmt_rs(t)}"
                     f"   |   کیش بیلنس: {utils.fmt_rs(models.CashBookService.current_balance())}",
            open_browser=open_browser)
