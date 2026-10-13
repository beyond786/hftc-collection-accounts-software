"""
Business / data-access layer for HF TC.

Every screen and report talks to the database through the classes in this
module, so the accounting rules live in exactly one place.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from . import config, database as db, utils


# ==========================================================================
# Users
# ==========================================================================
class UserService:
    @staticmethod
    def authenticate(username: str, password: str) -> Optional[dict]:
        row = db.query_one(
            "SELECT * FROM users WHERE username = ? AND is_active = 1", (username,))
        if row and db.verify_password(password, row["password_hash"]):
            db.execute("UPDATE users SET last_login = datetime('now','localtime') "
                       "WHERE id = ?", (row["id"],))
            return dict(row)
        return None

    @staticmethod
    def list_all() -> list[dict]:
        return [dict(r) for r in db.query("SELECT * FROM users ORDER BY username")]

    @staticmethod
    def create(username: str, password: str, full_name: str = "",
               role: str = config.ROLE_OPERATOR) -> int:
        utils.require(username, "صارف نام")
        utils.require(password, "پاس ورڈ")
        return db.insert("users", {
            "username": username.strip(),
            "password_hash": db.hash_password(password),
            "full_name": full_name,
            "role": role,
        })

    @staticmethod
    def set_password(user_id: int, password: str) -> None:
        db.update("users", {"password_hash": db.hash_password(password)},
                  "id = ?", (user_id,))

    @staticmethod
    def set_active(user_id: int, active: bool) -> None:
        db.update("users", {"is_active": 1 if active else 0}, "id = ?", (user_id,))


# ==========================================================================
# Offices
# ==========================================================================
class OfficeService:
    @staticmethod
    def list_all(active_only: bool = True) -> list[dict]:
        sql = "SELECT * FROM offices"
        if active_only:
            sql += " WHERE is_active = 1"
        sql += " ORDER BY name"
        return [dict(r) for r in db.query(sql)]

    @staticmethod
    def get(office_id: int) -> Optional[dict]:
        row = db.query_one("SELECT * FROM offices WHERE id = ?", (office_id,))
        return dict(row) if row else None

    @staticmethod
    def save(data: dict, office_id: Optional[int] = None) -> int:
        utils.require(data.get("name"), "آفس کا نام")
        if office_id:
            db.update("offices", data, "id = ?", (office_id,))
            return office_id
        return db.insert("offices", data)


# ==========================================================================
# Items / Inventory
# ==========================================================================
class ItemService:
    @staticmethod
    def list_all(active_only: bool = True, search: str = "") -> list[dict]:
        sql = "SELECT * FROM items WHERE 1=1"
        params: list[Any] = []
        if active_only:
            sql += " AND is_active = 1"
        if search:
            sql += " AND (name LIKE ? OR code LIKE ? OR model LIKE ?)"
            like = f"%{search}%"
            params += [like, like, like]
        sql += " ORDER BY name"
        return [dict(r) for r in db.query(sql, params)]

    @staticmethod
    def get(item_id: int) -> Optional[dict]:
        row = db.query_one("SELECT * FROM items WHERE id = ?", (item_id,))
        return dict(row) if row else None

    @staticmethod
    def save(data: dict, item_id: Optional[int] = None) -> int:
        utils.require(data.get("name"), "نام اشیاء")
        if item_id:
            db.update("items", data, "id = ?", (item_id,))
            return item_id
        return db.insert("items", data)

    @staticmethod
    def low_stock() -> list[dict]:
        return [dict(r) for r in db.query(
            "SELECT * FROM items WHERE is_active = 1 AND qty_in_stock <= reorder_level "
            "ORDER BY qty_in_stock")]

    @staticmethod
    def stock_value() -> float:
        return float(db.scalar(
            "SELECT COALESCE(SUM(qty_in_stock * purchase_price),0) FROM items") or 0)


class StockService:
    @staticmethod
    def move(item_id: int, move_type: str, qty: int, rate: float = 0,
             move_date: Optional[str] = None, ref_no: str = "",
             party: str = "", remarks: str = "") -> int:
        """Record a stock movement and keep items.qty_in_stock in sync."""
        qty = utils.to_int(qty)
        if qty <= 0:
            raise ValueError("مقدار صفر سے زیادہ ہونی چاہیے")
        item = ItemService.get(item_id)
        if not item:
            raise ValueError("شے موجود نہیں")
        signed = qty if move_type in (config.MOVE_PURCHASE, config.MOVE_RETURN) else -qty
        if move_type == config.MOVE_ADJUST:
            signed = qty  # adjustment sets the delta explicitly (may be negative)
        new_qty = utils.to_int(item["qty_in_stock"]) + signed
        if new_qty < 0:
            raise ValueError("اسٹاک منفی نہیں ہو سکتا")
        mid = db.insert("stock_movements", {
            "item_id": item_id,
            "move_date": move_date or utils.today_str(),
            "move_type": move_type,
            "qty": qty,
            "rate": utils.to_float(rate),
            "amount": round(utils.to_float(rate) * qty, 2),
            "ref_no": ref_no,
            "party": party,
            "remarks": remarks,
        })
        db.update("items", {"qty_in_stock": new_qty}, "id = ?", (item_id,))
        return mid

    @staticmethod
    def history(item_id: Optional[int] = None, limit: int = 500) -> list[dict]:
        sql = ("SELECT sm.*, i.name AS item_name FROM stock_movements sm "
               "JOIN items i ON i.id = sm.item_id")
        params: list[Any] = []
        if item_id:
            sql += " WHERE sm.item_id = ?"
            params.append(item_id)
        sql += " ORDER BY sm.move_date DESC, sm.id DESC LIMIT ?"
        params.append(limit)
        return [dict(r) for r in db.query(sql, params)]


# ==========================================================================
# Customers / Accounts
# ==========================================================================
class CustomerService:
    @staticmethod
    def next_card_no() -> str:
        n = utils.to_int(db.scalar("SELECT COUNT(*) FROM customers")) + 1
        return str(n)

    @staticmethod
    def list_all(search: str = "", status: str = "",
                 office_id: Optional[int] = None) -> list[dict]:
        sql = ("SELECT c.*, o.name AS office_name, "
               "COALESCE((SELECT SUM(deposit) FROM installments i "
               "          WHERE i.customer_id = c.id),0) AS paid "
               "FROM customers c LEFT JOIN offices o ON o.id = c.office_id WHERE 1=1")
        params: list[Any] = []
        if search:
            sql += (" AND (c.name LIKE ? OR c.card_no LIKE ? OR c.phone LIKE ? "
                    "OR c.nic_no LIKE ?)")
            like = f"%{search}%"
            params += [like, like, like, like]
        if status:
            sql += " AND c.status = ?"
            params.append(status)
        if office_id:
            sql += " AND c.office_id = ?"
            params.append(office_id)
        sql += " ORDER BY c.card_no"
        return [dict(r) for r in db.query(sql, params)]

    @staticmethod
    def get(customer_id: int) -> Optional[dict]:
        row = db.query_one(
            "SELECT c.*, o.name AS office_name FROM customers c "
            "LEFT JOIN offices o ON o.id = c.office_id WHERE c.id = ?",
            (customer_id,))
        return dict(row) if row else None

    @staticmethod
    def get_by_card(card_no: str) -> Optional[dict]:
        row = db.query_one("SELECT * FROM customers WHERE card_no = ?", (card_no,))
        return dict(row) if row else None

    @staticmethod
    def save(data: dict, customer_id: Optional[int] = None) -> int:
        """Create/update an account.  Recomputes the remaining balance."""
        utils.require(data.get("card_no"), "کارڈ نمبر")
        utils.require(data.get("name"), "نام")

        total = utils.to_float(data.get("total_amount"))
        advance = utils.to_float(data.get("advance"))
        monthly = utils.to_float(data.get("monthly_installment"))

        if customer_id:
            existing = CustomerService.get(customer_id)
            paid = CustomerService.total_paid(customer_id)
            # remaining = total - everything already collected (advance incl.)
            data["remaining_amount"] = round(total - paid, 2)
            data["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            db.update("customers", data, "id = ?", (customer_id,))
            return customer_id

        data["remaining_amount"] = round(total - advance, 2)
        cid = db.insert("customers", data)

        # Opening entry on the ledger card (advance / initial receipt)
        if advance > 0:
            db.insert("installments", {
                "customer_id": cid,
                "sr_no": 0,
                "month": utils.month_label(data.get("date_joined")),
                "deposit": advance,
                "balance": data["remaining_amount"],
                "receipt_no": data.get("opening_receipt_no") or "",
                "pay_date": data.get("date_joined") or utils.today_str(),
                "remarks": "ایڈوانس",
            })
            CashBookService.add_entry(
                entry_date=data.get("date_joined") or utils.today_str(),
                description=f"ایڈوانس - کارڈ {data['card_no']} - {data['name']}",
                ref_type=config.REF_RECEIPT, cash_in=advance)
        return cid

    @staticmethod
    def total_paid(customer_id: int) -> float:
        return float(db.scalar(
            "SELECT COALESCE(SUM(deposit),0) FROM installments WHERE customer_id = ?",
            (customer_id,)) or 0)

    @staticmethod
    def balance(customer_id: int) -> float:
        """Outstanding balance.

        ``total_paid`` already includes the opening advance (it is written as
        the first ledger row when the account is created), so the advance must
        NOT be subtracted a second time here.
        """
        c = CustomerService.get(customer_id)
        if not c:
            return 0.0
        return round(utils.to_float(c["total_amount"])
                     - CustomerService.total_paid(customer_id), 2)

    @staticmethod
    def ledger(customer_id: int) -> list[dict]:
        return [dict(r) for r in db.query(
            "SELECT * FROM installments WHERE customer_id = ? "
            "ORDER BY (sr_no = 0) DESC, sr_no, id", (customer_id,))]

    @staticmethod
    def set_status(customer_id: int, status: str) -> None:
        db.update("customers", {"status": status}, "id = ?", (customer_id,))

    @staticmethod
    def delete(customer_id: int) -> None:
        db.delete("customers", "id = ?", (customer_id,))

    @staticmethod
    def overdue(due_day: Optional[int] = None) -> list[dict]:
        """Accounts whose current month installment is still unpaid."""
        today = utils.today()
        out = []
        for c in CustomerService.list_all(status=config.STATUS_ACTIVE):
            bal = CustomerService.balance(c["id"])
            if bal <= 0:
                continue
            day = utils.to_int(c.get("due_day") or due_day or 1)
            due = today.replace(day=min(day, utils._days_in_month(today.year, today.month)))
            paid_this_month = float(db.scalar(
                "SELECT COALESCE(SUM(deposit),0) FROM installments "
                "WHERE customer_id = ? AND substr(pay_date,4,7) = ?",
                (c["id"], today.strftime("%m-%Y"))) or 0)
            if today > due and paid_this_month < utils.to_float(c["monthly_installment"]):
                c["balance"] = bal
                c["due_date"] = due.strftime(utils.DATE_FMT)
                c["paid_this_month"] = paid_this_month
                out.append(c)
        return out


# ==========================================================================
# Collection / Receipts
# ==========================================================================
class CollectionService:
    @staticmethod
    def next_receipt_no() -> str:
        prefix = config.setting("receipt_prefix", "R")
        n = utils.to_int(db.scalar("SELECT COUNT(*) FROM receipts")) + 1
        return f"{prefix}{n:05d}"

    @staticmethod
    def next_serial_no() -> str:
        return str(utils.to_int(db.scalar("SELECT COUNT(*) FROM receipts")) + 1)

    @staticmethod
    def collect(customer_id: int, amount: float, pay_date: Optional[str] = None,
                fine: float = 0, collector: str = "", box_code: str = "U-01",
                remarks: str = "", receipt_no: Optional[str] = None,
                user_name: str = "") -> dict:
        """Post an installment: ledger row + receipt + cash book, atomically."""
        customer = CustomerService.get(customer_id)
        if not customer:
            raise ValueError("کھاتا موجود نہیں")
        amount = utils.to_float(amount)
        fine = utils.to_float(fine)
        if amount <= 0 and fine <= 0:
            raise ValueError("رقم درج کریں")

        balance_before = CustomerService.balance(customer_id)
        if amount > balance_before + 0.009:
            raise ValueError(
                f"رقم بقایا ({utils.fmt_money(balance_before)}) سے زیادہ ہے")

        pay_date = pay_date or utils.today_str()
        receipt_no = receipt_no or CollectionService.next_receipt_no()
        balance_after = round(balance_before - amount, 2)

        sr = utils.to_int(db.scalar(
            "SELECT COALESCE(MAX(sr_no),0) FROM installments WHERE customer_id = ?",
            (customer_id,))) + 1

        db.insert("installments", {
            "customer_id": customer_id,
            "sr_no": sr,
            "month": utils.month_label(pay_date),
            "deposit": amount,
            "balance": balance_after,
            "receipt_no": receipt_no,
            "pay_date": pay_date,
            "collector": collector,
            "fine": fine,
            "remarks": remarks,
        })

        rid = db.insert("receipts", {
            "receipt_no": receipt_no,
            "serial_no": CollectionService.next_serial_no(),
            "customer_id": customer_id,
            "card_no": customer["card_no"],
            "customer_name": customer["name"],
            "father_name": customer.get("father_name"),
            "item_name": customer.get("item_name"),
            "amount": amount,
            "fine": fine,
            "balance_before": balance_before,
            "balance_after": balance_after,
            "pay_date": pay_date,
            "collector": collector,
            "box_code": box_code,
            "remarks": remarks,
        })

        CashBookService.add_entry(
            entry_date=pay_date,
            description=f"قسط وصولی - کارڈ {customer['card_no']} - {customer['name']}",
            ref_type=config.REF_RECEIPT, ref_id=rid, cash_in=amount + fine,
            user_name=user_name)

        if balance_after <= 0.009:
            CustomerService.set_status(customer_id, config.STATUS_CLOSED)

        db.audit(user_name, "collect", "receipt", rid,
                 f"{receipt_no} {amount}")
        return CollectionService.get_receipt(rid)

    @staticmethod
    def get_receipt(receipt_id: int) -> Optional[dict]:
        row = db.query_one("SELECT * FROM receipts WHERE id = ?", (receipt_id,))
        return dict(row) if row else None

    @staticmethod
    def get_receipt_by_no(receipt_no: str) -> Optional[dict]:
        row = db.query_one("SELECT * FROM receipts WHERE receipt_no = ?", (receipt_no,))
        return dict(row) if row else None

    @staticmethod
    def list_receipts(date_from: str = "", date_to: str = "",
                      collector: str = "", search: str = "") -> list[dict]:
        sql = "SELECT * FROM receipts WHERE 1=1"
        params: list[Any] = []
        if date_from:
            sql += " AND pay_date >= ?"
            params.append(date_from)
        if date_to:
            sql += " AND pay_date <= ?"
            params.append(date_to)
        if collector:
            sql += " AND collector = ?"
            params.append(collector)
        if search:
            sql += " AND (receipt_no LIKE ? OR card_no LIKE ? OR customer_name LIKE ?)"
            like = f"%{search}%"
            params += [like, like, like]
        sql += " ORDER BY id DESC"
        return [dict(r) for r in db.query(sql, params)]

    @staticmethod
    def day_total(day: str) -> float:
        return float(db.scalar(
            "SELECT COALESCE(SUM(amount + fine),0) FROM receipts WHERE pay_date = ?",
            (day,)) or 0)

    @staticmethod
    def range_total(date_from: str, date_to: str) -> float:
        return float(db.scalar(
            "SELECT COALESCE(SUM(amount + fine),0) FROM receipts "
            "WHERE pay_date BETWEEN ? AND ?", (date_from, date_to)) or 0)

    @staticmethod
    def late_fine_for(customer_id: int, pay_date: Optional[str] = None) -> float:
        """Fine = late_fine per missed visit, based on the due day."""
        c = CustomerService.get(customer_id)
        if not c:
            return 0.0
        d = utils.parse_date(pay_date) or utils.today()
        day = utils.to_int(c.get("due_day") or 1)
        due = d.replace(day=min(day, utils._days_in_month(d.year, d.month)))
        if d <= due:
            return 0.0
        missed = max(1, (d - due).days // 30 + 1)
        return round(config.late_fine() * missed, 2)


# ==========================================================================
# Cash book
# ==========================================================================
class CashBookService:
    @staticmethod
    def add_entry(entry_date: str, description: str, ref_type: str = "",
                  ref_id: Optional[int] = None, cash_in: float = 0,
                  cash_out: float = 0, user_name: str = "") -> int:
        prev = float(db.scalar(
            "SELECT COALESCE(balance,0) FROM cashbook ORDER BY id DESC LIMIT 1") or 0)
        balance = round(prev + utils.to_float(cash_in) - utils.to_float(cash_out), 2)
        return db.insert("cashbook", {
            "entry_date": entry_date,
            "description": description,
            "ref_type": ref_type,
            "ref_id": ref_id,
            "cash_in": utils.to_float(cash_in),
            "cash_out": utils.to_float(cash_out),
            "balance": balance,
            "user_name": user_name,
        })

    @staticmethod
    def list_entries(date_from: str = "", date_to: str = "") -> list[dict]:
        sql = "SELECT * FROM cashbook WHERE 1=1"
        params: list[Any] = []
        if date_from:
            sql += " AND entry_date >= ?"
            params.append(date_from)
        if date_to:
            sql += " AND entry_date <= ?"
            params.append(date_to)
        sql += " ORDER BY entry_date, id"
        return [dict(r) for r in db.query(sql, params)]

    @staticmethod
    def current_balance() -> float:
        return float(db.scalar(
            "SELECT COALESCE(balance,0) FROM cashbook ORDER BY id DESC LIMIT 1") or 0)

    @staticmethod
    def totals(date_from: str = "", date_to: str = "") -> dict:
        sql = ("SELECT COALESCE(SUM(cash_in),0) AS cin, "
               "COALESCE(SUM(cash_out),0) AS cout FROM cashbook WHERE 1=1")
        params: list[Any] = []
        if date_from:
            sql += " AND entry_date >= ?"
            params.append(date_from)
        if date_to:
            sql += " AND entry_date <= ?"
            params.append(date_to)
        row = db.query_one(sql, params)
        return {"cash_in": float(row["cin"]), "cash_out": float(row["cout"])}


# ==========================================================================
# Expenses
# ==========================================================================
class ExpenseService:
    @staticmethod
    def add(expense_date: str, category: str, description: str, amount: float,
            paid_to: str = "", user_name: str = "") -> int:
        amount = utils.to_float(amount)
        if amount <= 0:
            raise ValueError("رقم درج کریں")
        eid = db.insert("expenses", {
            "expense_date": expense_date,
            "category": category,
            "description": description,
            "amount": amount,
            "paid_to": paid_to,
            "user_name": user_name,
        })
        CashBookService.add_entry(
            entry_date=expense_date,
            description=f"خرچ - {category} - {description}",
            ref_type=config.REF_EXPENSE, ref_id=eid, cash_out=amount,
            user_name=user_name)
        return eid

    @staticmethod
    def list_all(date_from: str = "", date_to: str = "",
                 category: str = "") -> list[dict]:
        sql = "SELECT * FROM expenses WHERE 1=1"
        params: list[Any] = []
        if date_from:
            sql += " AND expense_date >= ?"
            params.append(date_from)
        if date_to:
            sql += " AND expense_date <= ?"
            params.append(date_to)
        if category:
            sql += " AND category = ?"
            params.append(category)
        sql += " ORDER BY expense_date DESC, id DESC"
        return [dict(r) for r in db.query(sql, params)]

    @staticmethod
    def total(date_from: str = "", date_to: str = "") -> float:
        sql = "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE 1=1"
        params: list[Any] = []
        if date_from:
            sql += " AND expense_date >= ?"
            params.append(date_from)
        if date_to:
            sql += " AND expense_date <= ?"
            params.append(date_to)
        return float(db.scalar(sql, params) or 0)

    @staticmethod
    def categories() -> list[str]:
        rows = db.query("SELECT DISTINCT category FROM expenses "
                        "WHERE category IS NOT NULL AND category <> '' ORDER BY category")
        return [r["category"] for r in rows]


# ==========================================================================
# Dashboard / reports
# ==========================================================================
class ReportService:
    @staticmethod
    def dashboard() -> dict:
        today = utils.today_str()
        mstart = utils.month_start().strftime(utils.DATE_FMT)
        mend = utils.month_end().strftime(utils.DATE_FMT)
        return {
            "customers": utils.to_int(db.scalar("SELECT COUNT(*) FROM customers")),
            "active": utils.to_int(db.scalar(
                "SELECT COUNT(*) FROM customers WHERE status = 'active'")),
            "closed": utils.to_int(db.scalar(
                "SELECT COUNT(*) FROM customers WHERE status = 'closed'")),
            "today_collection": CollectionService.day_total(today),
            "month_collection": CollectionService.range_total(mstart, mend),
            "total_receivable": float(db.scalar(
                "SELECT COALESCE(SUM(remaining_amount),0) FROM customers "
                "WHERE status <> 'closed'") or 0),
            "cash_balance": CashBookService.current_balance(),
            "month_expense": ExpenseService.total(mstart, mend),
            "stock_value": ItemService.stock_value(),
            "low_stock": len(ItemService.low_stock()),
            "overdue": len(CustomerService.overdue()),
        }

    @staticmethod
    def outstanding(min_balance: float = 0.0) -> list[dict]:
        rows = []
        for c in CustomerService.list_all():
            bal = CustomerService.balance(c["id"])
            if bal > min_balance:
                c["balance"] = bal
                c["paid"] = CustomerService.total_paid(c["id"])
                rows.append(c)
        rows.sort(key=lambda r: r["balance"], reverse=True)
        return rows

    @staticmethod
    def collection_sheet(day: str) -> list[dict]:
        return CollectionService.list_receipts(date_from=day, date_to=day)

    @staticmethod
    def profit_summary(date_from: str, date_to: str) -> dict:
        collected = CollectionService.range_total(date_from, date_to)
        expenses = ExpenseService.total(date_from, date_to)
        purchases = float(db.scalar(
            "SELECT COALESCE(SUM(amount),0) FROM stock_movements "
            "WHERE move_type = 'purchase' AND move_date BETWEEN ? AND ?",
            (date_from, date_to)) or 0)
        return {
            "collected": collected,
            "expenses": expenses,
            "purchases": purchases,
            "net": round(collected - expenses, 2),
        }

    @staticmethod
    def collector_summary(date_from: str, date_to: str) -> list[dict]:
        return [dict(r) for r in db.query(
            "SELECT COALESCE(NULLIF(collector,''),'—') AS collector, "
            "COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS amount, "
            "COALESCE(SUM(fine),0) AS fine "
            "FROM receipts WHERE pay_date BETWEEN ? AND ? "
            "GROUP BY collector ORDER BY amount DESC", (date_from, date_to))]

    @staticmethod
    def monthly_collection(year: int) -> list[dict]:
        return [dict(r) for r in db.query(
            "SELECT substr(pay_date,4,7) AS ym, COALESCE(SUM(amount),0) AS amount "
            "FROM receipts WHERE substr(pay_date,7,4) = ? "
            "GROUP BY ym ORDER BY ym", (str(year),))]
