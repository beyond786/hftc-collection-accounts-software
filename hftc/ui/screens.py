"""
All HF TC application screens.

  CustomersScreen  - کھاتے / گاہک   (agreement form entry)
  CollectionScreen - وصولی / رسید   (installment entry + receipt)
  InventoryScreen  - اسٹاک / اشیاء
  AccountsScreen   - حسابات و اخراجات
  ReportsScreen    - رپورٹس و پرنٹ
  SettingsScreen   - ترتیبات
  UsersScreen      - صارفین
"""
from __future__ import annotations

import tkinter as tk
from datetime import date, timedelta
from tkinter import filedialog, ttk
from typing import Optional

from .. import config, database as db, models, printing, reports, utils
from . import widgets
from .theme import ACCENT, BG, BORDER, CARD, GREEN, MUTED, NAVY, RED, TEXT


# ==========================================================================
# Helpers
# ==========================================================================
def _scrollable(parent) -> tuple[tk.Frame, tk.Frame]:
    """Return (outer, inner) where inner is vertically scrollable."""
    canvas = tk.Canvas(parent, bg=CARD, highlightthickness=0)
    vs = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
    inner = tk.Frame(canvas, bg=CARD)
    inner.bind("<Configure>",
               lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
    win = canvas.create_window((0, 0), window=inner, anchor="nw")
    canvas.bind("<Configure>", lambda e: canvas.itemconfig(win, width=e.width))
    canvas.configure(yscrollcommand=vs.set)
    canvas.pack(side="right", fill="both", expand=True)
    vs.pack(side="right", fill="y")
    canvas.bind_all(
        "<MouseWheel>",
        lambda e: canvas.yview_scroll(int(-1 * (e.delta / 120)), "units"))
    return canvas, inner


def _date_field(parent, label: str, value: Optional[str] = None):
    f = widgets.FormField(parent, label, width=16)
    f.set(value or utils.today_str())
    return f


# ==========================================================================
# CUSTOMERS / ACCOUNTS
# ==========================================================================
class CustomersScreen(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=14)
        self.app = app
        self.office_map = {}

        ttk.Label(self, text="کھاتے / گاہک  (Accounts)", style="Title.TLabel").pack(
            anchor="e")

        bar = tk.Frame(self, bg=BG)
        bar.pack(fill="x", pady=(8, 6))
        self.search = tk.StringVar()
        e = ttk.Entry(bar, textvariable=self.search, width=28, justify="right")
        e.pack(side="right", padx=4)
        e.bind("<Return>", lambda ev: self.refresh())
        ttk.Button(bar, text="تلاش", style="Ghost.TButton",
                   command=self.refresh).pack(side="right", padx=2)
        self.status = tk.StringVar(value="")
        cb = ttk.Combobox(bar, textvariable=self.status, width=12, state="readonly",
                          values=["", "active", "closed", "defaulter"])
        cb.pack(side="right", padx=6)
        cb.bind("<<ComboboxSelected>>", lambda ev: self.refresh())

        ttk.Button(bar, text="➕ نیا کھاتا", style="Accent.TButton",
                   command=self.new_customer).pack(side="left", padx=3)
        ttk.Button(bar, text="✎ ترمیم", style="Ghost.TButton",
                   command=self.edit_customer).pack(side="left", padx=3)
        ttk.Button(bar, text="🗑 حذف", style="Danger.TButton",
                   command=self.delete_customer).pack(side="left", padx=3)
        ttk.Button(bar, text="🖨 اقرار نامہ", style="TButton",
                   command=self.print_agreement).pack(side="left", padx=3)
        ttk.Button(bar, text="🖨 کھاتا کارڈ", style="TButton",
                   command=self.print_ledger).pack(side="left", padx=3)
        ttk.Button(bar, text="👁 تفصیل", style="TButton",
                   command=self.show_detail).pack(side="left", padx=3)

        self.table = widgets.DataTable(self, [
            ("card_no", "کارڈ نمبر", 90), ("name", "نام", 160),
            ("father_name", "ولدیت", 130), ("phone", "فون", 110),
            ("item_name", "نام اشیاء", 120),
            ("total_amount", "کل رقم", 90), ("advance", "ایڈوانس", 80),
            ("paid", "وصول", 90), ("remaining_amount", "بقایا رقم", 100),
            ("monthly_installment", "قسط ماہانہ", 90),
            ("status", "حالت", 70)],
            height=16, on_double=self.edit_customer)
        self.table.pack(fill="both", expand=True)
        self.rows: list[dict] = []

    def refresh(self):
        self.rows = models.CustomerService.list_all(
            search=self.search.get().strip(), status=self.status.get())
        self.table.set_rows(self.rows,
                            money_keys=("total_amount", "advance", "paid",
                                        "remaining_amount", "monthly_installment"))

    def _selected(self) -> Optional[dict]:
        row = self.table.selected_row(self.rows)
        if not row:
            widgets.warn("پہلے فہرست سے ایک کھاتا منتخب کریں")
        return row

    def new_customer(self):
        dlg = CustomerDialog(self, None)
        self.wait_window(dlg)
        if dlg.saved:
            self.refresh()

    def edit_customer(self):
        row = self._selected()
        if row:
            dlg = CustomerDialog(self, row)
            self.wait_window(dlg)
            if dlg.saved:
                self.refresh()

    def delete_customer(self):
        row = self._selected()
        if not row:
            return
        if not widgets.confirm(
                f"کیا آپ واقعی کھاتا '{row['name']}' (کارڈ {row['card_no']}) "
                f"حذف کرنا چاہتے ہیں؟\n\nتمام قسطیں بھی حذف ہو جائیں گی۔"):
            return
        models.CustomerService.delete(row["id"])
        db.audit(self.app.user["username"], "delete", "customer", row["id"])
        self.refresh()

    def print_agreement(self):
        row = self._selected()
        if row:
            c = models.CustomerService.get(row["id"])
            printing.PrintService.print_agreement(c)

    def print_ledger(self):
        row = self._selected()
        if row:
            c = models.CustomerService.get(row["id"])
            printing.PrintService.print_ledger(c)

    def show_detail(self):
        row = self._selected()
        if row:
            LedgerDialog(self, row["id"])


class CustomerDialog(tk.Toplevel):
    """Add / edit an account using the agreement-form fields."""

    def __init__(self, master, record: Optional[dict]):
        super().__init__(master)
        self.saved = False
        self.record = record
        self.title("نیا کھاتا" if not record else f"ترمیم - کارڈ {record.get('card_no')}")
        self.configure(bg=CARD)
        self.geometry("900x640")
        self.transient(master)
        self.grab_set()

        offices = models.OfficeService.list_all()
        self.office_names = [o["name"] for o in offices]
        self.office_ids = [o["id"] for o in offices]
        items = models.ItemService.list_all()
        self.item_names = [i["name"] for i in items]
        self.item_ids = [i["id"] for i in items]

        canvas, body = _scrollable(self)

        def section(text):
            tk.Label(body, text=text, bg=NAVY, fg="#FFFFFF",
                     font=("Segoe UI", 11, "bold"), anchor="e").pack(
                fill="x", padx=10, pady=(12, 6), ipady=4)

        # --- account fields -------------------------------------------
        section("کھاتہ کی معلومات")
        g1 = tk.Frame(body, bg=CARD)
        g1.pack(fill="x", padx=10)
        self.f_card = widgets.FormField(g1, config.L["card_no"], required=True)
        self.f_name = widgets.FormField(g1, config.L["name"], required=True)
        self.f_father = widgets.FormField(g1, config.L["father_name"])
        self.f_caste = widgets.FormField(g1, config.L["caste"])
        self.f_age = widgets.FormField(g1, config.L["age"], width=8)
        fields_row = [self.f_card, self.f_name, self.f_father, self.f_caste, self.f_age]
        for i, f in enumerate(fields_row):
            f.grid(row=0, column=i, padx=5, pady=4, sticky="ew")
        for i in range(len(fields_row)):
            g1.grid_columnconfigure(i, weight=1)

        g2 = tk.Frame(body, bg=CARD)
        g2.pack(fill="x", padx=10)
        self.f_perm = widgets.FormField(g2, config.L["permanent_address"], width=60)
        self.f_perm.grid(row=0, column=0, columnspan=2, padx=5, pady=4, sticky="ew")
        g2.grid_columnconfigure(0, weight=1)

        g3 = tk.Frame(body, bg=CARD)
        g3.pack(fill="x", padx=10)
        self.f_pres = widgets.FormField(g3, config.L["present_address"], width=40)
        self.f_work = widgets.FormField(g3, config.L["work_address"], width=40)
        self.f_phone = widgets.FormField(g3, config.L["phone"])
        self.f_nic = widgets.FormField(g3, config.L["nic_no"])
        self.f_office = widgets.FormField(g3, "آفس", kind="combo",
                                          values=self.office_names)
        for i, f in enumerate((self.f_pres, self.f_work, self.f_phone,
                               self.f_nic, self.f_office)):
            f.grid(row=0, column=i, padx=5, pady=4, sticky="ew")
            g3.grid_columnconfigure(i, weight=1)

        # --- item / amounts -------------------------------------------
        section("اشیاء و رقم")
        g4 = tk.Frame(body, bg=CARD)
        g4.pack(fill="x", padx=10)
        self.f_item = widgets.FormField(g4, config.L["item_name"], kind="combo",
                                        values=self.item_names)
        self.f_model = widgets.FormField(g4, config.L["model"])
        self.f_joined = _date_field(g4, config.L["date_joined"])
        self.f_total = widgets.FormField(g4, config.L["total_amount"], numeric=True)
        self.f_advance = widgets.FormField(g4, config.L["advance"], numeric=True)
        for i, f in enumerate((self.f_item, self.f_model, self.f_joined,
                               self.f_total, self.f_advance)):
            f.grid(row=0, column=i, padx=5, pady=4, sticky="ew")
            g4.grid_columnconfigure(i, weight=1)

        g5 = tk.Frame(body, bg=CARD)
        g5.pack(fill="x", padx=10)
        self.f_monthly = widgets.FormField(g5, config.L["monthly_installment"],
                                           numeric=True)
        self.f_due = widgets.FormField(g5, config.L["due_day"], width=8)
        self.f_cash = widgets.FormField(g5, config.L["cash_rate"], numeric=True)
        self.f_hard = widgets.FormField(g5, config.L["hard_cash_rate"], numeric=True)
        self.f_receipt = widgets.FormField(g5, config.L["receipt_no"])
        for i, f in enumerate((self.f_monthly, self.f_due, self.f_cash,
                               self.f_hard, self.f_receipt)):
            f.grid(row=0, column=i, padx=5, pady=4, sticky="ew")
            g5.grid_columnconfigure(i, weight=1)

        self.lbl_remaining = tk.Label(body, text="", bg=CARD, fg=GREEN,
                                      font=("Segoe UI", 11, "bold"), anchor="e")
        self.lbl_remaining.pack(fill="x", padx=16, pady=4)
        for f in (self.f_total, self.f_advance, self.f_monthly):
            f.var.trace_add("write", lambda *a: self._recalc())

        # --- guarantor ------------------------------------------------
        section("ضامن کی تفصیل")
        g6 = tk.Frame(body, bg=CARD)
        g6.pack(fill="x", padx=10)
        self.f_gn = widgets.FormField(g6, config.L["g_name"])
        self.f_gf = widgets.FormField(g6, config.L["father_name"])
        self.f_gc = widgets.FormField(g6, config.L["caste"])
        self.f_gr = widgets.FormField(g6, config.L["g_relation"])
        for i, f in enumerate((self.f_gn, self.f_gf, self.f_gc, self.f_gr)):
            f.grid(row=0, column=i, padx=5, pady=4, sticky="ew")
            g6.grid_columnconfigure(i, weight=1)

        g7 = tk.Frame(body, bg=CARD)
        g7.pack(fill="x", padx=10)
        self.f_gperm = widgets.FormField(g7, config.L["permanent_address"], width=40)
        self.f_gpres = widgets.FormField(g7, config.L["present_address"], width=40)
        for i, f in enumerate((self.f_gperm, self.f_gpres)):
            f.grid(row=0, column=i, padx=5, pady=4, sticky="ew")
            g7.grid_columnconfigure(i, weight=1)

        g8 = tk.Frame(body, bg=CARD)
        g8.pack(fill="x", padx=10)
        self.f_gp1 = widgets.FormField(g8, config.L["phone"])
        self.f_gp2 = widgets.FormField(g8, config.L["phone"])
        self.f_gnic = widgets.FormField(g8, config.L["nic_no"])
        for i, f in enumerate((self.f_gp1, self.f_gp2, self.f_gnic)):
            f.grid(row=0, column=i, padx=5, pady=4, sticky="ew")
            g8.grid_columnconfigure(i, weight=1)

        # --- status ---------------------------------------------------
        g9 = tk.Frame(body, bg=CARD)
        g9.pack(fill="x", padx=10, pady=(8, 4))
        self.f_status = widgets.FormField(
            g9, "حالت", kind="combo",
            values=[config.STATUS_ACTIVE, config.STATUS_CLOSED,
                    config.STATUS_DEFAULTER])
        self.f_remarks = widgets.FormField(g9, "نوٹ", width=50)
        self.f_status.grid(row=0, column=0, padx=5, sticky="ew")
        self.f_remarks.grid(row=0, column=1, padx=5, sticky="ew")
        g9.grid_columnconfigure(1, weight=1)

        # --- buttons --------------------------------------------------
        btns = tk.Frame(self, bg=CARD)
        btns.pack(fill="x", side="bottom", pady=8)
        ttk.Button(btns, text="محفوظ کریں", style="Success.TButton",
                   command=self.save).pack(side="right", padx=8)
        ttk.Button(btns, text="منسوخ", style="Ghost.TButton",
                   command=self.destroy).pack(side="right", padx=4)

        self.item_map = dict(zip(self.item_names, self.item_ids))
        self.office_map = dict(zip(self.office_names, self.office_ids))

        if record:
            self._load(record)
        else:
            self.f_card.set(models.CustomerService.next_card_no())
            self.f_status.set(config.STATUS_ACTIVE)
            self.f_joined.set(utils.today_str())
        self._recalc()

    # -----------------------------------------------------------------
    def _load(self, r: dict):
        self.f_card.set(r.get("card_no"))
        self.f_name.set(r.get("name"))
        self.f_father.set(r.get("father_name"))
        self.f_caste.set(r.get("caste"))
        self.f_age.set(r.get("age"))
        self.f_perm.set(r.get("permanent_address"))
        self.f_pres.set(r.get("present_address"))
        self.f_work.set(r.get("work_address"))
        self.f_phone.set(r.get("phone"))
        self.f_nic.set(r.get("nic_no"))
        self.f_office.set(r.get("office_name") or "")
        self.f_item.set(r.get("item_name") or "")
        self.f_model.set(r.get("model"))
        self.f_joined.set(utils.fmt_date(r.get("date_joined")))
        self.f_total.set(utils.fmt_money(r.get("total_amount")))
        self.f_advance.set(utils.fmt_money(r.get("advance")))
        self.f_monthly.set(utils.fmt_money(r.get("monthly_installment")))
        self.f_due.set(r.get("due_day"))
        self.f_cash.set(utils.fmt_money(r.get("cash_rate")))
        self.f_hard.set(utils.fmt_money(r.get("hard_cash_rate")))
        self.f_receipt.set(r.get("opening_receipt_no"))
        self.f_gn.set(r.get("g_name"))
        self.f_gf.set(r.get("g_father_name"))
        self.f_gc.set(r.get("g_caste"))
        self.f_gr.set(r.get("g_relation"))
        self.f_gperm.set(r.get("g_permanent_address"))
        self.f_gpres.set(r.get("g_present_address"))
        self.f_gp1.set(r.get("g_phone1"))
        self.f_gp2.set(r.get("g_phone2"))
        self.f_gnic.set(r.get("g_nic_no"))
        self.f_status.set(r.get("status") or config.STATUS_ACTIVE)
        self.f_remarks.set(r.get("remarks"))

    def _recalc(self):
        total = utils.to_float(self.f_total.get())
        adv = utils.to_float(self.f_advance.get())
        monthly = utils.to_float(self.f_monthly.get())
        rem = total - adv
        months = utils.installment_count(rem, monthly)
        txt = f"بقایا رقم: {utils.fmt_rs(rem)}"
        if months:
            txt += f"   |   اقساط: {months} ماہ"
        self.lbl_remaining.config(text=txt)

    def save(self):
        try:
            data = {
                "card_no": self.f_card.get(),
                "name": self.f_name.get(),
                "father_name": self.f_father.get(),
                "caste": self.f_caste.get(),
                "age": utils.to_int(self.f_age.get()) or None,
                "permanent_address": self.f_perm.get(),
                "present_address": self.f_pres.get(),
                "work_address": self.f_work.get(),
                "phone": self.f_phone.get(),
                "nic_no": utils.clean_nic(self.f_nic.get()),
                "office_id": self.office_map.get(self.f_office.get()),
                "item_id": self.item_map.get(self.f_item.get()),
                "item_name": self.f_item.get(),
                "model": self.f_model.get(),
                "date_joined": utils.fmt_date(self.f_joined.get()) or utils.today_str(),
                "total_amount": utils.to_float(self.f_total.get()),
                "advance": utils.to_float(self.f_advance.get()),
                "monthly_installment": utils.to_float(self.f_monthly.get()),
                "due_day": utils.to_int(self.f_due.get()) or None,
                "cash_rate": utils.to_float(self.f_cash.get()),
                "hard_cash_rate": utils.to_float(self.f_hard.get()),
                "opening_receipt_no": self.f_receipt.get(),
                "g_name": self.f_gn.get(),
                "g_father_name": self.f_gf.get(),
                "g_caste": self.f_gc.get(),
                "g_relation": self.f_gr.get(),
                "g_permanent_address": self.f_gperm.get(),
                "g_present_address": self.f_gpres.get(),
                "g_phone1": self.f_gp1.get(),
                "g_phone2": self.f_gp2.get(),
                "g_nic_no": utils.clean_nic(self.f_gnic.get()),
                "status": self.f_status.get() or config.STATUS_ACTIVE,
                "remarks": self.f_remarks.get(),
            }
            cid = models.CustomerService.save(
                data, self.record["id"] if self.record else None)
            db.audit(self.master.app.user["username"],
                     "update" if self.record else "create", "customer", cid)
            self.saved = True
            self.destroy()
        except ValueError as exc:
            widgets.error(str(exc))


class LedgerDialog(tk.Toplevel):
    """Show the ledger card of one account on screen."""

    def __init__(self, master, customer_id: int):
        super().__init__(master)
        c = models.CustomerService.get(customer_id)
        self.c = c
        self.title(f"کھاتا کارڈ - {c.get('name')} (کارڈ {c.get('card_no')})")
        self.configure(bg=BG)
        self.geometry("940x600")
        self.transient(master)

        head = tk.Frame(self, bg=CARD, highlightbackground=BORDER, highlightthickness=1)
        head.pack(fill="x", padx=10, pady=10)
        info = [
            ("نام", c.get("name")), ("ولدیت", c.get("father_name")),
            ("نام اشیاء", c.get("item_name")), ("ماڈل", c.get("model")),
            ("کل رقم", utils.fmt_rs(c.get("total_amount"))),
            ("ایڈوانس", utils.fmt_rs(c.get("advance"))),
            ("قسط ماہانہ", utils.fmt_rs(c.get("monthly_installment"))),
            ("کھاتا نمبر", c.get("card_no")),
        ]
        for i, (k, v) in enumerate(info):
            f = widgets.labelled_row(head, k + ":", str(v or ""))
            f.grid(row=i // 4, column=i % 4, padx=14, pady=6, sticky="e")
        for cc in range(4):
            head.grid_columnconfigure(cc, weight=1)

        table = widgets.DataTable(self, [
            ("sr_no", "نمبر", 60), ("month", "ماہ", 80),
            ("deposit", "جمع", 100), ("balance", "بقایا", 100),
            ("receipt_no", "رسید", 90), ("pay_date", "تاریخ", 100),
            ("fine", "جرمانہ", 80), ("collector", "وصول کنندہ", 110),
            ("remarks", "نوٹ", 140)], height=13)
        table.pack(fill="both", expand=True, padx=10)
        rows = models.CustomerService.ledger(customer_id)
        for r in rows:
            r["pay_date"] = utils.fmt_date(r.get("pay_date"))
        table.set_rows(rows, money_keys=("deposit", "balance", "fine"))

        btns = tk.Frame(self, bg=BG)
        btns.pack(fill="x", padx=10, pady=10)
        ttk.Button(btns, text="🖨 کھاتا کارڈ پرنٹ", style="TButton",
                   command=lambda: printing.PrintService.print_ledger(self.c)
                   ).pack(side="right", padx=4)
        ttk.Button(btns, text="🖨 اقرار نامہ پرنٹ", style="TButton",
                   command=lambda: printing.PrintService.print_agreement(self.c)
                   ).pack(side="right", padx=4)
        tk.Label(btns, text=f"کل وصولی: {utils.fmt_rs(models.CustomerService.total_paid(customer_id))}"
                            f"   |   موجودہ بقایا: {utils.fmt_rs(models.CustomerService.balance(customer_id))}",
                 bg=BG, fg=NAVY, font=("Segoe UI", 11, "bold")).pack(side="left", padx=10)
        ttk.Button(btns, text="بند کریں", style="Ghost.TButton",
                   command=self.destroy).pack(side="left", padx=4)


# ==========================================================================
# COLLECTION
# ==========================================================================
class CollectionScreen(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=14)
        self.app = app
        self.customer: Optional[dict] = None

        ttk.Label(self, text="وصولی / رسید  (Collection)", style="Title.TLabel").pack(
            anchor="e")

        # -- customer lookup -------------------------------------------
        top = tk.Frame(self, bg=BG)
        top.pack(fill="x", pady=(8, 6))
        self.q = tk.StringVar()
        ent = ttk.Entry(top, textvariable=self.q, width=30, justify="right")
        ent.pack(side="right", padx=4)
        ent.bind("<Return>", lambda e: self.lookup())
        ent.bind("<KeyRelease>", lambda e: self.suggest())
        ttk.Button(top, text="🔍 کارڈ / نام تلاش", style="Accent.TButton",
                   command=self.lookup).pack(side="right", padx=3)
        self.sugg = ttk.Combobox(top, width=42, state="readonly")
        self.sugg.pack(side="right", padx=3)
        self.sugg.bind("<<ComboboxSelected>>", lambda e: self.pick_suggestion())
        self._sugg_map = {}

        # -- account panel ---------------------------------------------
        panel = tk.Frame(self, bg=CARD, highlightbackground=BORDER, highlightthickness=1)
        panel.pack(fill="x", pady=4)
        self.info_labels = {}
        labels = [("card_no", "کارڈ نمبر"), ("name", "نام"), ("father_name", "ولدیت"),
                  ("phone", "فون"), ("item_name", "نام اشیاء"),
                  ("monthly_installment", "قسط ماہانہ"), ("due_day", "تاریخ قسط"),
                  ("total_amount", "کل رقم"), ("total_paid", "کل وصول"),
                  ("balance", "بقایا رقم")]
        for i, (key, cap) in enumerate(labels):
            f = tk.Frame(panel, bg=CARD)
            f.grid(row=i // 5, column=i % 5, padx=14, pady=8, sticky="e")
            tk.Label(f, text=cap, bg=CARD, fg=MUTED,
                     font=("Segoe UI", 9)).pack(anchor="e")
            v = tk.Label(f, text="—", bg=CARD, fg=NAVY,
                         font=("Segoe UI", 12, "bold"))
            v.pack(anchor="e")
            self.info_labels[key] = v
        for c in range(5):
            panel.grid_columnconfigure(c, weight=1)

        # -- entry form -------------------------------------------------
        form = tk.Frame(self, bg=CARD, highlightbackground=BORDER, highlightthickness=1)
        form.pack(fill="x", pady=8)
        tk.Label(form, text="قسط وصولی درج کریں", bg=NAVY, fg="#FFFFFF",
                 font=("Segoe UI", 11, "bold"), anchor="e").pack(
            fill="x", padx=10, pady=(8, 6), ipady=3)
        row = tk.Frame(form, bg=CARD)
        row.pack(fill="x", padx=10, pady=6)
        self.f_amount = widgets.FormField(row, "رقم (جمع)", numeric=True)
        self.f_fine = widgets.FormField(row, "جرمانہ", numeric=True)
        self.f_date = _date_field(row, "تاریخ")
        self.f_month = widgets.FormField(row, "ماہ")
        self.f_receipt = widgets.FormField(row, "رسید نمبر")
        self.f_collector = widgets.FormField(row, "وصول کنندہ")
        self.f_box = widgets.FormField(row, "باکس کوڈ")
        for i, f in enumerate((self.f_amount, self.f_fine, self.f_date,
                               self.f_month, self.f_receipt, self.f_collector,
                               self.f_box)):
            f.grid(row=0, column=i, padx=5, sticky="ew")
            row.grid_columnconfigure(i, weight=1)

        row2 = tk.Frame(form, bg=CARD)
        row2.pack(fill="x", padx=10, pady=(0, 10))
        self.f_remarks = widgets.FormField(row2, "نوٹ", width=60)
        self.f_remarks.grid(row=0, column=0, padx=5, sticky="ew")
        row2.grid_columnconfigure(0, weight=1)
        ttk.Button(row2, text="آٹو جرمانہ", style="Ghost.TButton",
                   command=self.auto_fine).grid(row=0, column=1, padx=6)
        ttk.Button(row2, text="💰 وصولی محفوظ + رسید پرنٹ", style="Success.TButton",
                   command=self.save_collection).grid(row=0, column=2, padx=6)
        ttk.Button(row2, text="🧾 رسید دوبارہ پرنٹ", style="TButton",
                   command=self.reprint).grid(row=0, column=3, padx=6)
        self.f_collector.set(self.app.user.get("full_name")
                             or self.app.user.get("username", ""))
        self.f_box.set("U-01")
        self.f_month.set(utils.month_label(utils.today_str()))

        # -- today's receipts ------------------------------------------
        ttk.Label(self, text="آج کی وصولیاں", style="H2.TLabel").pack(
            anchor="e", pady=(6, 2))
        self.table = widgets.DataTable(self, [
            ("receipt_no", "رسید", 90), ("card_no", "کارڈ", 70),
            ("customer_name", "نام", 150), ("item_name", "نام اشیاء", 110),
            ("amount", "جمع", 90), ("fine", "جرمانہ", 70),
            ("balance_after", "بقایا", 90), ("pay_date", "تاریخ", 90),
            ("collector", "وصول کنندہ", 110)], height=8,
            on_double=self.reprint)
        self.table.pack(fill="both", expand=True)
        self.rows: list[dict] = []

    # -----------------------------------------------------------------
    def suggest(self):
        term = self.q.get().strip()
        if len(term) < 2:
            self.sugg.set("")
            self._sugg_map = {}
            return
        rows = models.CustomerService.list_all(search=term)[:30]
        self._sugg_map = {
            f"{r['card_no']} — {r['name']} ({r.get('phone') or '—'})": r["id"]
            for r in rows}
        self.sugg.configure(values=list(self._sugg_map.keys()))

    def pick_suggestion(self):
        cid = self._sugg_map.get(self.sugg.get())
        if cid:
            self.load_customer(cid)

    def lookup(self):
        term = self.q.get().strip()
        if not term:
            widgets.warn("کارڈ نمبر یا نام درج کریں")
            return
        c = models.CustomerService.get_by_card(term)
        if c:
            self.load_customer(c["id"])
            return
        rows = models.CustomerService.list_all(search=term)
        if len(rows) == 1:
            self.load_customer(rows[0]["id"])
        elif rows:
            self._sugg_map = {
                f"{r['card_no']} — {r['name']} ({r.get('phone') or '—'})": r["id"]
                for r in rows[:30]}
            self.sugg.configure(values=list(self._sugg_map.keys()))
            widgets.info("چند کھاتے ملے — فہرست سے منتخب کریں")
        else:
            widgets.warn("کوئی کھاتا نہیں ملا")

    def load_customer(self, cid: int):
        self.customer = models.CustomerService.get(cid)
        bal = models.CustomerService.balance(cid)
        paid = models.CustomerService.total_paid(cid)
        vals = {
            "card_no": self.customer.get("card_no"),
            "name": self.customer.get("name"),
            "father_name": self.customer.get("father_name") or "—",
            "phone": self.customer.get("phone") or "—",
            "item_name": self.customer.get("item_name") or "—",
            "monthly_installment": utils.fmt_money(
                self.customer.get("monthly_installment")),
            "due_day": self.customer.get("due_day") or "—",
            "total_amount": utils.fmt_money(self.customer.get("total_amount")),
            "total_paid": utils.fmt_money(paid),
            "balance": utils.fmt_money(bal),
        }
        for k, v in vals.items():
            self.info_labels[k].config(text=str(v))
        self.f_amount.set(utils.fmt_money(min(
            utils.to_float(self.customer.get("monthly_installment")), bal)))
        self.f_receipt.set(models.CollectionService.next_receipt_no())
        self.f_date.set(utils.today_str())
        self.f_month.set(utils.month_label(utils.today_str()))
        self.auto_fine()

    def auto_fine(self):
        if not self.customer:
            return
        fine = models.CollectionService.late_fine_for(
            self.customer["id"], utils.fmt_date(self.f_date.get()))
        self.f_fine.set(utils.fmt_money(fine))

    def save_collection(self):
        if not self.customer:
            widgets.warn("پہلے کوئی کھاتا منتخب کریں")
            return
        try:
            receipt = models.CollectionService.collect(
                customer_id=self.customer["id"],
                amount=utils.to_float(self.f_amount.get()),
                pay_date=utils.fmt_date(self.f_date.get()) or utils.today_str(),
                fine=utils.to_float(self.f_fine.get()),
                collector=self.f_collector.get(),
                box_code=self.f_box.get(),
                remarks=self.f_remarks.get(),
                receipt_no=self.f_receipt.get() or None,
                user_name=self.app.user["username"])
        except ValueError as exc:
            widgets.error(str(exc))
            return
        printing.PrintService.print_receipt(receipt)
        widgets.info(f"رسید محفوظ ہو گئی: {receipt['receipt_no']}\n"
                     f"رقم: {utils.fmt_rs(receipt['amount'])}\n"
                     f"موجودہ بقایا: {utils.fmt_rs(receipt['balance_after'])}")
        self.f_remarks.clear()
        self.load_customer(self.customer["id"])
        self.refresh()

    def reprint(self):
        row = self.table.selected_row(self.rows)
        if not row:
            widgets.warn("رسید منتخب کریں")
            return
        printing.PrintService.print_receipt(row)

    def refresh(self):
        self.rows = models.CollectionService.list_receipts(
            date_from=utils.today_str(), date_to=utils.today_str())
        self.table.set_rows(self.rows,
                            money_keys=("amount", "fine", "balance_after"))
        self.f_receipt.set(models.CollectionService.next_receipt_no())


# ==========================================================================
# INVENTORY
# ==========================================================================
class InventoryScreen(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=14)
        self.app = app

        ttk.Label(self, text="اسٹاک / اشیاء  (Inventory)", style="Title.TLabel").pack(
            anchor="e")
        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True, pady=8)

        # -- items tab --------------------------------------------------
        t1 = ttk.Frame(nb, padding=8)
        nb.add(t1, text="اشیاء (Items)")
        bar = tk.Frame(t1, bg=BG)
        bar.pack(fill="x", pady=(0, 6))
        self.search = tk.StringVar()
        e = ttk.Entry(bar, textvariable=self.search, width=26, justify="right")
        e.pack(side="right", padx=4)
        e.bind("<Return>", lambda ev: self.refresh())
        ttk.Button(bar, text="تلاش", style="Ghost.TButton",
                   command=self.refresh).pack(side="right", padx=2)
        ttk.Button(bar, text="➕ نئی شے", style="Accent.TButton",
                   command=self.new_item).pack(side="left", padx=3)
        ttk.Button(bar, text="✎ ترمیم", style="Ghost.TButton",
                   command=self.edit_item).pack(side="left", padx=3)

        self.items_table = widgets.DataTable(t1, [
            ("code", "کوڈ", 80), ("name", "نام اشیاء", 180),
            ("model", "ماڈل", 110), ("category", "قسم", 100),
            ("qty_in_stock", "اسٹاک", 80), ("reorder_level", "کم از کم", 80),
            ("purchase_price", "خرید ریٹ", 100), ("sale_price", "فروخت ریٹ", 100),
            ("cash_rate", "کیش ریٹ", 100)], height=15,
            on_double=self.edit_item)
        self.items_table.pack(fill="both", expand=True)
        self.items: list[dict] = []

        # -- stock movements tab ---------------------------------------
        t2 = ttk.Frame(nb, padding=8)
        nb.add(t2, text="اسٹاک لین دین (Movements)")
        bar2 = tk.Frame(t2, bg=BG)
        bar2.pack(fill="x", pady=(0, 6))
        ttk.Button(bar2, text="➕ نیا لین دین / خریداری", style="Accent.TButton",
                   command=self.new_movement).pack(side="left", padx=3)
        ttk.Button(bar2, text="🖨 اسٹاک رپورٹ", style="TButton",
                   command=self.print_stock).pack(side="left", padx=3)
        self.moves_table = widgets.DataTable(t2, [
            ("move_date", "تاریخ", 100), ("item_name", "نام اشیاء", 170),
            ("move_type", "قسم", 90), ("qty", "مقدار", 70),
            ("rate", "ریٹ", 90), ("amount", "رقم", 100),
            ("party", "فریق", 130), ("ref_no", "حوالہ", 100)], height=15)
        self.moves_table.pack(fill="both", expand=True)

    def refresh(self):
        self.items = models.ItemService.list_all(search=self.search.get().strip())
        self.items_table.set_rows(
            self.items,
            money_keys=("purchase_price", "sale_price", "cash_rate"))
        moves = models.StockService.history()
        for m in moves:
            m["move_type"] = {"purchase": "خریداری", "sale": "فروخت",
                              "return": "واپسی", "adjust": "ایڈجسٹ",
                              "damage": "نقصان"}.get(m.get("move_type"),
                                                     m.get("move_type"))
        self.moves_table.set_rows(moves, money_keys=("rate", "amount"))

    def new_item(self):
        dlg = ItemDialog(self, None)
        self.wait_window(dlg)
        if dlg.saved:
            self.refresh()

    def edit_item(self):
        row = self.items_table.selected_row(self.items)
        if row:
            dlg = ItemDialog(self, row)
            self.wait_window(dlg)
            if dlg.saved:
                self.refresh()

    def new_movement(self):
        if not self.items:
            widgets.warn("پہلے اشیاء شامل کریں")
            return
        dlg = MovementDialog(self, self.items)
        self.wait_window(dlg)
        if dlg.saved:
            self.refresh()

    def print_stock(self):
        reports.Reports.inventory()


class ItemDialog(tk.Toplevel):
    def __init__(self, master, record):
        super().__init__(master)
        self.saved = False
        self.record = record
        self.title("نئی شے" if not record else f"ترمیم - {record.get('name')}")
        self.configure(bg=CARD)
        self.geometry("620x400")
        self.transient(master)
        self.grab_set()

        body = tk.Frame(self, bg=CARD)
        body.pack(padx=20, pady=16, fill="both", expand=True)
        self.f = {}
        rows = [
            ("code", "کوڈ"), ("name", "نام اشیاء"), ("model", "ماڈل"),
            ("category", "قسم"), ("unit", "یونٹ"),
            ("purchase_price", "خرید ریٹ"), ("sale_price", "فروخت ریٹ"),
            ("cash_rate", "کیش ریٹ"), ("hard_cash_rate", "ہارڈ کیش ریٹ"),
            ("qty_in_stock", "موجودہ اسٹاک"), ("reorder_level", "کم از کم حد"),
        ]
        for i, (key, cap) in enumerate(rows):
            f = widgets.FormField(body, cap, width=24)
            f.grid(row=i // 2, column=(i % 2), padx=8, pady=5, sticky="ew")
            self.f[key] = f
        body.grid_columnconfigure(0, weight=1)
        body.grid_columnconfigure(1, weight=1)

        if record:
            for key in self.f:
                v = record.get(key)
                if key in ("purchase_price", "sale_price", "cash_rate",
                           "hard_cash_rate") and v is not None:
                    v = utils.fmt_money(v)
                self.f[key].set(v)
        else:
            self.f["unit"].set("عدد")

        btns = tk.Frame(self, bg=CARD)
        btns.pack(fill="x", pady=10)
        ttk.Button(btns, text="محفوظ کریں", style="Success.TButton",
                   command=self.save).pack(side="right", padx=8)
        ttk.Button(btns, text="منسوخ", style="Ghost.TButton",
                   command=self.destroy).pack(side="right", padx=4)

    def save(self):
        try:
            data = {
                "code": self.f["code"].get(),
                "name": self.f["name"].get(),
                "model": self.f["model"].get(),
                "category": self.f["category"].get(),
                "unit": self.f["unit"].get() or "عدد",
                "purchase_price": utils.to_float(self.f["purchase_price"].get()),
                "sale_price": utils.to_float(self.f["sale_price"].get()),
                "cash_rate": utils.to_float(self.f["cash_rate"].get()),
                "hard_cash_rate": utils.to_float(self.f["hard_cash_rate"].get()),
                "qty_in_stock": utils.to_int(self.f["qty_in_stock"].get()),
                "reorder_level": utils.to_int(self.f["reorder_level"].get()),
            }
            models.ItemService.save(data, self.record["id"] if self.record else None)
            self.saved = True
            self.destroy()
        except ValueError as exc:
            widgets.error(str(exc))


class MovementDialog(tk.Toplevel):
    def __init__(self, master, items: list[dict]):
        super().__init__(master)
        self.saved = False
        self.item_map = {f"{i['name']} ({i.get('model') or '—'})": i["id"]
                         for i in items}
        self.title("نیا اسٹاک لین دین")
        self.configure(bg=CARD)
        self.geometry("560x420")
        self.transient(master)
        self.grab_set()

        body = tk.Frame(self, bg=CARD)
        body.pack(padx=20, pady=16, fill="both", expand=True)
        self.f_item = widgets.FormField(body, "نام اشیاء", kind="combo",
                                        values=list(self.item_map.keys()), width=34)
        self.f_item.pack(pady=5, fill="x")
        self.f_type = widgets.FormField(
            body, "قسم", kind="combo", values=["خریداری", "فروخت", "واپسی",
                                               "ایڈجسٹ", "نقصان"], width=20)
        self.f_type.pack(pady=5, fill="x")
        self.f_qty = widgets.FormField(body, "مقدار", numeric=True)
        self.f_qty.pack(pady=5, fill="x")
        self.f_rate = widgets.FormField(body, "ریٹ", numeric=True)
        self.f_rate.pack(pady=5, fill="x")
        self.f_date = _date_field(body, "تاریخ")
        self.f_date.pack(pady=5, fill="x")
        self.f_party = widgets.FormField(body, "فریق / سپلائر")
        self.f_party.pack(pady=5, fill="x")
        self.f_ref = widgets.FormField(body, "حوالہ نمبر")
        self.f_ref.pack(pady=5, fill="x")
        self.f_remarks = widgets.FormField(body, "نوٹ")
        self.f_remarks.pack(pady=5, fill="x")

        btns = tk.Frame(self, bg=CARD)
        btns.pack(fill="x", pady=10)
        ttk.Button(btns, text="محفوظ کریں", style="Success.TButton",
                   command=self.save).pack(side="right", padx=8)
        ttk.Button(btns, text="منسوخ", style="Ghost.TButton",
                   command=self.destroy).pack(side="right", padx=4)

    def save(self):
        try:
            type_map = {"خریداری": "purchase", "فروخت": "sale", "واپسی": "return",
                        "ایڈجسٹ": "adjust", "نقصان": "damage"}
            item_id = self.item_map.get(self.f_item.get())
            if not item_id:
                widgets.warn("شے منتخب کریں")
                return
            models.StockService.move(
                item_id=item_id,
                move_type=type_map.get(self.f_type.get(), "purchase"),
                qty=utils.to_int(self.f_qty.get()),
                rate=utils.to_float(self.f_rate.get()),
                move_date=utils.fmt_date(self.f_date.get()) or utils.today_str(),
                ref_no=self.f_ref.get(), party=self.f_party.get(),
                remarks=self.f_remarks.get())
            self.saved = True
            self.destroy()
        except ValueError as exc:
            widgets.error(str(exc))


# ==========================================================================
# ACCOUNTS (cash book + expenses)
# ==========================================================================
EXPENSE_CATEGORIES = ["تنخواہ", "کرایہ", "بجلی/بلات", "پٹرول/سفر", "دفتری خرچ",
                      "جرمانہ/قانونی", "مرمت", "ٹیلیفون/انٹرنیٹ", "متفرق"]


class AccountsScreen(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=14)
        self.app = app

        ttk.Label(self, text="حسابات و اخراجات  (Accounts)", style="Title.TLabel").pack(
            anchor="e")

        bar = tk.Frame(self, bg=BG)
        bar.pack(fill="x", pady=8)
        self.d_from = _date_field(bar, "سے تاریخ", utils.month_start().strftime(utils.DATE_FMT))
        self.d_to = _date_field(bar, "تک تاریخ", utils.today_str())
        self.d_from.grid(row=0, column=0, padx=5)
        self.d_to.grid(row=0, column=1, padx=5)
        ttk.Button(bar, text="لاگو کریں", style="Accent.TButton",
                   command=self.refresh).grid(row=0, column=2, padx=6, pady=(14, 0))
        ttk.Button(bar, text="➕ نیا خرچ", style="Success.TButton",
                   command=self.new_expense).grid(row=0, column=3, padx=6, pady=(14, 0))
        ttk.Button(bar, text="💵 کیش انٹری", style="TButton",
                   command=self.new_cash).grid(row=0, column=4, padx=6, pady=(14, 0))
        ttk.Button(bar, text="🖨 روزنامچہ", style="TButton",
                   command=self.print_cash).grid(row=0, column=5, padx=6, pady=(14, 0))
        ttk.Button(bar, text="🖨 اخراجات", style="TButton",
                   command=self.print_exp).grid(row=0, column=6, padx=6, pady=(14, 0))
        ttk.Button(bar, text="🖨 منافع/نقصان", style="TButton",
                   command=self.print_profit).grid(row=0, column=7, padx=6, pady=(14, 0))

        self.summary = tk.Label(self, text="", bg=BG, fg=NAVY,
                                font=("Segoe UI", 11, "bold"), anchor="e")
        self.summary.pack(fill="x", pady=(2, 6))

        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True)
        t1 = ttk.Frame(nb, padding=6); nb.add(t1, text="روزنامچہ (Cash Book)")
        self.cash_table = widgets.DataTable(t1, [
            ("entry_date", "تاریخ", 100), ("description", "تفصیل", 320),
            ("cash_in", "آمد", 100), ("cash_out", "خرچ", 100),
            ("balance", "بیلنس", 110)], height=15)
        self.cash_table.pack(fill="both", expand=True)

        t2 = ttk.Frame(nb, padding=6); nb.add(t2, text="اخراجات (Expenses)")
        self.exp_table = widgets.DataTable(t2, [
            ("expense_date", "تاریخ", 100), ("category", "مد", 130),
            ("description", "تفصیل", 300), ("paid_to", "ادا شدہ", 130),
            ("amount", "رقم", 110)], height=15)
        self.exp_table.pack(fill="both", expand=True)
        self.refresh()

    def refresh(self):
        d1 = utils.fmt_date(self.d_from.get())
        d2 = utils.fmt_date(self.d_to.get())
        cash = models.CashBookService.list_entries(d1, d2)
        self.cash_table.set_rows(cash, money_keys=("cash_in", "cash_out", "balance"))
        exp = models.ExpenseService.list_all(d1, d2)
        self.exp_table.set_rows(exp, money_keys=("amount",))
        t = models.CashBookService.totals(d1, d2)
        et = models.ExpenseService.total(d1, d2)
        self.summary.config(
            text=f"مدت: {d1} تا {d2}   |   کل آمد: {utils.fmt_rs(t['cash_in'])}"
                 f"   |   کل خرچ: {utils.fmt_rs(t['cash_out'])}"
                 f"   |   موجودہ کیش بیلنس: {utils.fmt_rs(models.CashBookService.current_balance())}"
                 f"   |   اخراجات: {utils.fmt_rs(et)}")

    def new_expense(self):
        dlg = ExpenseDialog(self, self.app)
        self.wait_window(dlg)
        if dlg.saved:
            self.refresh()

    def new_cash(self):
        dlg = CashDialog(self, self.app)
        self.wait_window(dlg)
        if dlg.saved:
            self.refresh()

    def print_cash(self):
        reports.Reports.cash_book(utils.fmt_date(self.d_from.get()),
                                  utils.fmt_date(self.d_to.get()))

    def print_exp(self):
        reports.Reports.expenses(utils.fmt_date(self.d_from.get()),
                                 utils.fmt_date(self.d_to.get()))

    def print_profit(self):
        reports.Reports.profit(utils.fmt_date(self.d_from.get()),
                               utils.fmt_date(self.d_to.get()))


class ExpenseDialog(tk.Toplevel):
    def __init__(self, master, app):
        super().__init__(master)
        self.saved = False
        self.app = app
        self.title("نیا خرچ")
        self.configure(bg=CARD)
        self.geometry("480x420")
        self.transient(master)
        self.grab_set()
        body = tk.Frame(self, bg=CARD)
        body.pack(padx=20, pady=16, fill="both", expand=True)
        self.f_date = _date_field(body, "تاریخ"); self.f_date.pack(pady=6, fill="x")
        self.f_cat = widgets.FormField(body, "مد", kind="combo",
                                       values=EXPENSE_CATEGORIES, width=30)
        self.f_cat.pack(pady=6, fill="x")
        self.f_desc = widgets.FormField(body, "تفصیل", width=30)
        self.f_desc.pack(pady=6, fill="x")
        self.f_amount = widgets.FormField(body, "رقم", numeric=True)
        self.f_amount.pack(pady=6, fill="x")
        self.f_paid = widgets.FormField(body, "ادا شدہ (کس کو)")
        self.f_paid.pack(pady=6, fill="x")
        btns = tk.Frame(self, bg=CARD); btns.pack(fill="x", pady=10)
        ttk.Button(btns, text="محفوظ کریں", style="Success.TButton",
                   command=self.save).pack(side="right", padx=8)
        ttk.Button(btns, text="منسوخ", style="Ghost.TButton",
                   command=self.destroy).pack(side="right", padx=4)

    def save(self):
        try:
            models.ExpenseService.add(
                expense_date=utils.fmt_date(self.f_date.get()) or utils.today_str(),
                category=self.f_cat.get(), description=self.f_desc.get(),
                amount=utils.to_float(self.f_amount.get()),
                paid_to=self.f_paid.get(),
                user_name=self.app.user["username"])
            self.saved = True
            self.destroy()
        except ValueError as exc:
            widgets.error(str(exc))


class CashDialog(tk.Toplevel):
    def __init__(self, master, app):
        super().__init__(master)
        self.saved = False
        self.app = app
        self.title("کیش انٹری (آمد / خرچ)")
        self.configure(bg=CARD)
        self.geometry("460x360")
        self.transient(master)
        self.grab_set()
        body = tk.Frame(self, bg=CARD)
        body.pack(padx=20, pady=16, fill="both", expand=True)
        self.f_date = _date_field(body, "تاریخ"); self.f_date.pack(pady=6, fill="x")
        self.f_desc = widgets.FormField(body, "تفصیل", width=30)
        self.f_desc.pack(pady=6, fill="x")
        self.f_in = widgets.FormField(body, "آمد (Cash In)", numeric=True)
        self.f_in.pack(pady=6, fill="x")
        self.f_out = widgets.FormField(body, "خرچ (Cash Out)", numeric=True)
        self.f_out.pack(pady=6, fill="x")
        btns = tk.Frame(self, bg=CARD); btns.pack(fill="x", pady=10)
        ttk.Button(btns, text="محفوظ کریں", style="Success.TButton",
                   command=self.save).pack(side="right", padx=8)
        ttk.Button(btns, text="منسوخ", style="Ghost.TButton",
                   command=self.destroy).pack(side="right", padx=4)

    def save(self):
        cin = utils.to_float(self.f_in.get())
        cout = utils.to_float(self.f_out.get())
        if cin <= 0 and cout <= 0:
            widgets.warn("آمد یا خرچ درج کریں")
            return
        models.CashBookService.add_entry(
            entry_date=utils.fmt_date(self.f_date.get()) or utils.today_str(),
            description=self.f_desc.get() or "کیش انٹری",
            ref_type=config.REF_OTHER, cash_in=cin, cash_out=cout,
            user_name=self.app.user["username"])
        self.saved = True
        self.destroy()


# ==========================================================================
# REPORTS
# ==========================================================================
class ReportsScreen(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=18)
        self.app = app
        ttk.Label(self, text="رپورٹس و پرنٹ  (Reports)", style="Title.TLabel").pack(
            anchor="e")
        ttk.Label(self, text="رپورٹ منتخب کریں — نئی ونڈو میں پرنٹ کے لیے کھل جائے گی",
                  style="Muted.TLabel").pack(anchor="e", pady=(2, 12))

        bar = tk.Frame(self, bg=BG)
        bar.pack(fill="x", pady=6)
        self.d_from = _date_field(bar, "سے تاریخ", utils.month_start().strftime(utils.DATE_FMT))
        self.d_to = _date_field(bar, "تک تاریخ", utils.today_str())
        self.d_day = _date_field(bar, "دن (مجوزہ تاریخ)", utils.today_str())
        self.d_from.grid(row=0, column=0, padx=6)
        self.d_to.grid(row=0, column=1, padx=6)
        self.d_day.grid(row=0, column=2, padx=6)

        grid = tk.Frame(self, bg=BG)
        grid.pack(fill="both", expand=True, pady=14)
        buttons = [
            ("روزانہ وصولی شیٹ", self.rep_collection, GREEN),
            ("روزانہ بندش رپورٹ", self.rep_daily, GREEN),
            ("بقایا کھاتے (Outstanding)", self.rep_outstanding, NAVY),
            ("ڈیفالٹر / تاخیر کھاتے", self.rep_overdue, RED),
            ("وصول کنندگان کا خلاصہ", self.rep_collectors, NAVY),
            ("اسٹاک رپورٹ", self.rep_inventory, NAVY),
            ("روزنامچہ (Cash Book)", self.rep_cash, NAVY),
            ("اخراجات (Expenses)", self.rep_expenses, NAVY),
            ("منافع / نقصان", self.rep_profit, GREEN),
        ]
        for i, (label, cmd, color) in enumerate(buttons):
            b = tk.Button(grid, text=label, command=cmd, bg=color, fg="#FFFFFF",
                          font=("Segoe UI", 12, "bold"), relief="flat",
                          activebackground=NAVY, cursor="hand2", height=3, width=28)
            b.grid(row=i // 3, column=i % 3, padx=10, pady=10, sticky="nsew")
        for c in range(3):
            grid.grid_columnconfigure(c, weight=1)
        for r in range(3):
            grid.grid_rowconfigure(r, weight=1)

        tk.Label(self, text=f"پرنٹ فائلیں یہاں محفوظ ہوتی ہیں: {config.PRINT_DIR}",
                 bg=BG, fg=MUTED, font=("Segoe UI", 9)).pack(anchor="e")

    # -- shortcuts ----------------------------------------------------
    def _range(self):
        return utils.fmt_date(self.d_from.get()), utils.fmt_date(self.d_to.get())

    def rep_collection(self):
        reports.Reports.collection_sheet(utils.fmt_date(self.d_day.get()))

    def rep_daily(self):
        reports.Reports.daily_report(utils.fmt_date(self.d_day.get()))

    def rep_outstanding(self):
        reports.Reports.outstanding()

    def rep_overdue(self):
        reports.Reports.overdue()

    def rep_collectors(self):
        d1, d2 = self._range(); reports.Reports.collector_summary(d1, d2)

    def rep_inventory(self):
        reports.Reports.inventory()

    def rep_cash(self):
        d1, d2 = self._range(); reports.Reports.cash_book(d1, d2)

    def rep_expenses(self):
        d1, d2 = self._range(); reports.Reports.expenses(d1, d2)

    def rep_profit(self):
        d1, d2 = self._range(); reports.Reports.profit(d1, d2)


# ==========================================================================
# SETTINGS
# ==========================================================================
class SettingsScreen(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=16)
        self.app = app
        ttk.Label(self, text="ترتیبات  (Settings)", style="Title.TLabel").pack(
            anchor="e")
        nb = ttk.Notebook(self); nb.pack(fill="both", expand=True, pady=10)

        # company info --------------------------------------------------
        t1 = ttk.Frame(nb, padding=16); nb.add(t1, text="کمپنی کی معلومات")
        keys = [("company_name", "کمپنی کا نام (اردو)"),
                ("company_name_en", "کمپنی کا نام (English)"),
                ("company_short", "مختصر نام"), ("head_office", "ہیڈ آفس (اردو)"),
                ("head_office_en", "ہیڈ آفس (English)"), ("phone1", "فون نمبر 1"),
                ("phone2", "فون نمبر 2"), ("address", "پتہ"),
                ("late_fine", "لیٹ قسط جرمانہ (فی چکر)"),
                ("ledger_rows", "کھاتا کارڈ قطاریں"),
                ("receipt_prefix", "رسید نمبر سابقہ"), ("currency", "کرنسی"),
                ("backup_keep", "بیک اپ رکھیں (تعداد)")]
        self.fields = {}
        for i, (key, cap) in enumerate(keys):
            f = widgets.FormField(t1, cap, width=34)
            f.grid(row=i // 2, column=i % 2, padx=10, pady=7, sticky="ew")
            f.set(config.setting(key, config.DEFAULT_SETTINGS.get(key, "")))
            self.fields[key] = f
        for c in range(2):
            t1.grid_columnconfigure(c, weight=1)
        ttk.Button(t1, text="محفوظ کریں", style="Success.TButton",
                   command=self.save_company).grid(row=len(keys), column=0,
                                                   columnspan=2, pady=14)

        # offices -------------------------------------------------------
        t2 = ttk.Frame(nb, padding=16); nb.add(t2, text="آفس / برانچیں")
        bar = tk.Frame(t2, bg=BG); bar.pack(fill="x", pady=6)
        ttk.Button(bar, text="➕ نیا آفس", style="Accent.TButton",
                   command=self.new_office).pack(side="left", padx=3)
        self.office_table = widgets.DataTable(t2, [
            ("id", "نمبر", 60), ("name", "نام", 220), ("address", "پتہ", 260),
            ("phone1", "فون 1", 130), ("phone2", "فون 2", 130)], height=10)
        self.office_table.pack(fill="both", expand=True)

        # data ----------------------------------------------------------
        t3 = ttk.Frame(nb, padding=16); nb.add(t3, text="ڈیٹا و بیک اپ")
        self.dbinfo = tk.Label(t3, text="", bg=BG, fg=NAVY, justify="right",
                               anchor="e", font=("Consolas", 10))
        self.dbinfo.pack(fill="x", pady=10)
        ttk.Button(t3, text="اب بیک اپ لیں", style="Success.TButton",
                   command=self.backup).pack(anchor="e", pady=4)
        ttk.Button(t3, text="بیک اپ بحال کریں", style="TButton",
                   command=self.restore).pack(anchor="e", pady=4)
        ttk.Button(t3, text="⚠ ڈیمو ڈیٹا شامل کریں", style="Ghost.TButton",
                   command=self.seed).pack(anchor="e", pady=4)
        self.refresh()

    def refresh(self):
        self.office_table.set_rows(models.OfficeService.list_all(active_only=False))
        import os
        size = os.path.getsize(config.DB_PATH) if config.DB_PATH.exists() else 0
        self.dbinfo.config(
            text=f"ڈیٹا بیس: {config.DB_PATH}\nحجم: {size/1024:.1f} KB\n"
                 f"بیک اپ فولڈر: {config.BACKUP_DIR}")

    def save_company(self):
        for key, field in self.fields.items():
            db.set_setting(key, field.get())
        widgets.info("ترتیبات محفوظ ہو گئیں")

    def new_office(self):
        win = tk.Toplevel(self); win.title("نیا آفس"); win.configure(bg=CARD)
        win.geometry("440x340"); win.transient(self); win.grab_set()
        body = tk.Frame(win, bg=CARD); body.pack(padx=20, pady=16, fill="both", expand=True)
        f_name = widgets.FormField(body, "نام", width=30); f_name.pack(pady=6, fill="x")
        f_addr = widgets.FormField(body, "پتہ", width=30); f_addr.pack(pady=6, fill="x")
        f_p1 = widgets.FormField(body, "فون 1"); f_p1.pack(pady=6, fill="x")
        f_p2 = widgets.FormField(body, "فون 2"); f_p2.pack(pady=6, fill="x")

        def do_save():
            try:
                models.OfficeService.save({
                    "name": f_name.get(), "address": f_addr.get(),
                    "phone1": f_p1.get(), "phone2": f_p2.get()})
                win.destroy(); self.refresh()
            except ValueError as exc:
                widgets.error(str(exc))

        btns = tk.Frame(win, bg=CARD); btns.pack(fill="x", pady=8)
        ttk.Button(btns, text="محفوظ کریں", style="Success.TButton",
                   command=do_save).pack(side="right", padx=8)
        ttk.Button(btns, text="منسوخ", style="Ghost.TButton",
                   command=win.destroy).pack(side="right", padx=4)

    def backup(self):
        try:
            p = db.backup_db("manual")
            widgets.info(f"بیک اپ محفوظ: {p.name}"); self.refresh()
        except Exception as exc:
            widgets.error(str(exc))

    def restore(self):
        path = filedialog.askopenfilename(
            title="بیک اپ فائل منتخب کریں", initialdir=str(config.BACKUP_DIR),
            filetypes=[("SQLite DB", "*.db"), ("All files", "*.*")])
        if not path:
            return
        if not widgets.confirm("باز بحالی موجودہ ڈیٹا کو بدل دے گی۔ جاری رکھیں؟"):
            return
        db.restore_db(path)
        db.init_db()
        widgets.info("ڈیٹا بحال ہو گیا — ایپ دوبارہ شروع کریں")

    def seed(self):
        if not widgets.confirm("ڈیمو ڈیٹا شامل کریں؟ (جانچ کے لیے)"):
            return
        from .. import seed as seed_mod
        seed_mod.seed_demo()
        widgets.info("ڈیمو ڈیٹا شامل ہو گیا")
        self.refresh()


# ==========================================================================
# USERS
# ==========================================================================
class UsersScreen(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=16)
        self.app = app
        ttk.Label(self, text="صارفین  (Users)", style="Title.TLabel").pack(anchor="e")
        bar = tk.Frame(self, bg=BG); bar.pack(fill="x", pady=8)
        ttk.Button(bar, text="➕ نیا صارف", style="Accent.TButton",
                   command=self.new_user).pack(side="left", padx=3)
        ttk.Button(bar, text="🔑 پاس ورڈ تبدیل", style="TButton",
                   command=self.reset_pw).pack(side="left", padx=3)
        self.table = widgets.DataTable(self, [
            ("username", "صارف نام", 150), ("full_name", "پورا نام", 200),
            ("role", "کردار", 120), ("is_active", "فعال", 80),
            ("last_login", "آخری لاگ ان", 170)], height=14)
        self.table.pack(fill="both", expand=True)
        self.rows: list[dict] = []
        self.refresh()

    def refresh(self):
        self.rows = models.UserService.list_all()
        for r in self.rows:
            r["is_active"] = "ہاں" if r.get("is_active") else "نہیں"
        self.table.set_rows(self.rows)

    def new_user(self):
        win = tk.Toplevel(self); win.title("نیا صارف"); win.configure(bg=CARD)
        win.geometry("400x360"); win.transient(self); win.grab_set()
        body = tk.Frame(win, bg=CARD); body.pack(padx=20, pady=16, fill="both", expand=True)
        f_u = widgets.FormField(body, "صارف نام", width=28); f_u.pack(pady=6, fill="x")
        f_p = widgets.FormField(body, "پاس ورڈ", width=28); f_p.pack(pady=6, fill="x")
        f_p.widget.configure(show="•")
        f_n = widgets.FormField(body, "پورا نام", width=28); f_n.pack(pady=6, fill="x")
        f_r = widgets.FormField(body, "کردار", kind="combo",
                                values=list(config.ROLES), width=26)
        f_r.pack(pady=6, fill="x"); f_r.set(config.ROLE_OPERATOR)

        def do_save():
            try:
                models.UserService.create(f_u.get(), f_p.widget.get(),
                                          f_n.get(), f_r.get())
                win.destroy(); self.refresh()
            except ValueError as exc:
                widgets.error(str(exc))

        btns = tk.Frame(win, bg=CARD); btns.pack(fill="x", pady=8)
        ttk.Button(btns, text="محفوظ کریں", style="Success.TButton",
                   command=do_save).pack(side="right", padx=8)
        ttk.Button(btns, text="منسوخ", style="Ghost.TButton",
                   command=win.destroy).pack(side="right", padx=4)

    def reset_pw(self):
        row = self.table.selected_row(self.rows)
        if not row:
            widgets.warn("صارف منتخب کریں"); return
        win = tk.Toplevel(self); win.title("پاس ورڈ تبدیل"); win.configure(bg=CARD)
        win.geometry("360x200"); win.transient(self); win.grab_set()
        body = tk.Frame(win, bg=CARD); body.pack(padx=20, pady=16, fill="both", expand=True)
        tk.Label(body, text=f"صارف: {row['username']}", bg=CARD, fg=NAVY,
                 font=("Segoe UI", 11, "bold")).pack(anchor="e")
        f_p = widgets.FormField(body, "نیا پاس ورڈ", width=26); f_p.pack(pady=8, fill="x")
        f_p.widget.configure(show="•")

        def do_save():
            models.UserService.set_password(row["id"], f_p.widget.get())
            win.destroy(); widgets.info("پاس ورڈ تبدیل ہو گیا")

        btns = tk.Frame(win, bg=CARD); btns.pack(fill="x", pady=8)
        ttk.Button(btns, text="محفوظ کریں", style="Success.TButton",
                   command=do_save).pack(side="right", padx=8)
        ttk.Button(btns, text="منسوخ", style="Ghost.TButton",
                   command=win.destroy).pack(side="right", padx=4)
