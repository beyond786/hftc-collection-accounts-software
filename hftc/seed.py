"""Demo / sample data for HF TC (used for testing and training)."""
from __future__ import annotations

from datetime import date

from . import config, database as db, models, utils

DEMO_ITEMS = [
    ("FAN-ACDC", "ACDC پنکھا", "ACDC-1", "الیکٹرانکس", 8200, 12500, 1200),
    ("FAN-PAK", "پاک پنکھا", "PAK-56", "الیکٹرانکس", 6500, 9800, 900),
    ("LED-32", "ایل ای ڈی ٹی وی", "32 انچ", "الیکٹرانکس", 28000, 38500, 3000),
    ("FRG-14", "فریج", "14 کیوبک", "ہوم اپلائنسز", 32000, 44000, 3500),
    ("WM-AUTO", "واشنگ مشین", "آٹو 7kg", "ہوم اپلائنسز", 24000, 33000, 2500),
    ("SOLAR-1", "سولر پینل", "550W", "سولر", 18000, 26000, 2000),
]

DEMO_CUSTOMERS = [
    # card, name, father, caste, phone, item_code, total, advance, monthly, due
    ("1001", "مجاہد حسین", "علی بخش", "ابڑو", "0302-5266799", "FAN-ACDC",
     33200, 1000, 3000, 8),
    ("1002", "نعمان حسنین", "حسنین احمد", "سید", "0300-1122334", "FAN-ACDC",
     14000, 1000, 1000, 5),
    ("1003", "تنویر احمد", "محمد یوسف", "شیخ", "0333-4455667", "LED-32",
     38500, 2500, 3000, 10),
    ("1004", "اللہ ڈنو", "غلام سرور", "چاندیو", "0311-9988776", "FAN-PAK",
     9800, 800, 900, 15),
    ("1005", "ثنا اللہ", "مولابخش", "بروہی", "0345-6677889", "WM-AUTO",
     33000, 3000, 2500, 20),
    ("1006", "رمضان علی", "شاہ دولہ", "کھوسہ", "0308-2233445", "SOLAR-1",
     26000, 2000, 2000, 12),
]


def seed_demo(reset: bool = False) -> None:
    """Populate the database with a realistic demo dataset."""
    db.init_db()
    if reset:
        for table in ("installments", "receipts", "cashbook", "expenses",
                      "stock_movements", "customers", "items"):
            db.execute(f"DELETE FROM {table}")

    # items ------------------------------------------------------------
    item_ids = {}
    for code, name, model, cat, buy, sell, cash in DEMO_ITEMS:
        existing = db.query_one("SELECT id FROM items WHERE code = ?", (code,))
        if existing:
            item_ids[code] = existing["id"]
            continue
        iid = models.ItemService.save({
            "code": code, "name": name, "model": model, "category": cat,
            "unit": "عدد", "purchase_price": buy, "sale_price": sell,
            "cash_rate": cash, "hard_cash_rate": cash, "qty_in_stock": 0,
            "reorder_level": 2,
        })
        item_ids[code] = iid
        models.StockService.move(iid, config.MOVE_PURCHASE, 10, rate=buy,
                                 party="مرکزی سپلائر",
                                 remarks="ابتدائی اسٹاک")

    # customers + collections -----------------------------------------
    office = models.OfficeService.list_all()
    office_id = office[0]["id"] if office else None
    today = utils.today()

    for (card, name, father, caste, phone, item_code, total, adv, monthly,
         due) in DEMO_CUSTOMERS:
        if db.query_one("SELECT id FROM customers WHERE card_no = ?", (card,)):
            continue
        item = models.ItemService.get(item_ids[item_code])
        joined = utils.add_months(today, -6).replace(day=1)
        cid = models.CustomerService.save({
            "card_no": card, "name": name, "father_name": father,
            "caste": caste, "phone": phone,
            "permanent_address": "ڈاک خانہ کینجھو، تحصیل رتو ڈیرو، لاڑکانہ",
            "present_address": "", "work_address": "پرائیویٹ ملازم",
            "nic_no": "4220530971477", "age": 32, "office_id": office_id,
            "item_id": item["id"], "item_name": item["name"],
            "model": item["model"], "date_joined": joined.strftime(utils.DATE_FMT),
            "total_amount": total, "advance": adv,
            "monthly_installment": monthly, "due_day": due,
            "cash_rate": item["cash_rate"], "hard_cash_rate": item["cash_rate"],
            "opening_receipt_no": "",
            "g_name": "محمد رمضان", "g_father_name": "غلام قادر",
            "g_caste": caste, "g_phone1": "0300-0000000",
            "g_relation": "بھائی", "g_nic_no": "4220199887766",
            "status": config.STATUS_ACTIVE,
        })
        # sell one unit of stock
        try:
            models.StockService.move(item["id"], config.MOVE_SALE, 1,
                                     rate=item["sale_price"], party=name,
                                     remarks=f"کارڈ {card}")
        except ValueError:
            pass

        # a few paid installments
        bal = models.CustomerService.balance(cid)
        for n in range(1, 5):
            pay = min(monthly, models.CustomerService.balance(cid))
            if pay <= 0:
                break
            pay_date = utils.add_months(joined, n)
            models.CollectionService.collect(
                customer_id=cid, amount=pay,
                pay_date=pay_date.strftime(utils.DATE_FMT),
                collector="Field Collector", box_code="U-01")

    # a few expenses ---------------------------------------------------
    if models.ExpenseService.total() == 0:
        for cat, desc, amt in [("تنخواہ", "اسٹاف تنخواہ", 45000),
                               ("کرایہ", "دفتر کرایہ", 15000),
                               ("پٹرول/سفر", "گاڑی پٹرول", 8000),
                               ("دفتری خرچ", "اسٹیشنری", 2500)]:
            models.ExpenseService.add(
                expense_date=utils.today_str(), category=cat,
                description=desc, amount=amt, paid_to="—")

    # opening capital --------------------------------------------------
    if models.CashBookService.current_balance() < 1000:
        models.CashBookService.add_entry(
            entry_date=utils.today_str(), description="ابتدائی سرمایہ (Capital)",
            ref_type=config.REF_CAPITAL, cash_in=500000)


if __name__ == "__main__":
    seed_demo()
    print("Demo data seeded.")
