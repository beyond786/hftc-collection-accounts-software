"""
HF TC - Collection & Accounts Software
Main application window: login, sidebar navigation and dashboard.
"""
from __future__ import annotations

import tkinter as tk
from datetime import datetime
from tkinter import ttk

from . import config, database as db, models, reports, utils
from .ui import widgets
from .ui.theme import (ACCENT, BG, BORDER, CARD, GREEN, MUTED, NAVY, NAVY_DARK,
                       NAVY_LIGHT, RED, TEXT, Theme)


# ==========================================================================
# Login
# ==========================================================================
class LoginDialog(tk.Toplevel):
    def __init__(self, master):
        super().__init__(master)
        self.result = None
        self.title("HF TC - لاگ ان")
        self.configure(bg=CARD)
        self.resizable(False, False)
        self.transient(master)
        self.grab_set()

        tk.Label(self, text=config.DEFAULT_SETTINGS["company_name"], bg=CARD,
                 fg=NAVY, font=("Segoe UI", 17, "bold")).pack(padx=40, pady=(25, 0))
        tk.Label(self, text=config.DEFAULT_SETTINGS["head_office"], bg=CARD,
                 fg=MUTED, font=("Segoe UI", 10)).pack(pady=(0, 18))

        body = tk.Frame(self, bg=CARD)
        body.pack(padx=40, pady=(0, 10))
        self.u = widgets.FormField(body, "صارف نام (Username)", width=26)
        self.u.pack(pady=5)
        self.p = widgets.FormField(body, "پاس ورڈ (Password)", width=26)
        self.p.widget.configure(show="•")
        self.p.pack(pady=5)

        self.msg = tk.Label(self, text="", bg=CARD, fg=RED, font=("Segoe UI", 9))
        self.msg.pack()

        btns = tk.Frame(self, bg=CARD)
        btns.pack(pady=(6, 25))
        ttk.Button(btns, text="لاگ ان", style="Accent.TButton",
                   command=self._login).pack(side="right", padx=4)
        ttk.Button(btns, text="بند کریں", style="Ghost.TButton",
                   command=self._cancel).pack(side="right", padx=4)

        self.u.set("admin")
        self.p.widget.focus_set()
        self.bind("<Return>", lambda e: self._login())
        self.bind("<Escape>", lambda e: self._cancel())
        self._center(master)

    def _center(self, master):
        self.update_idletasks()
        try:
            x = master.winfo_rootx() + (master.winfo_width() - self.winfo_width()) // 2
            y = master.winfo_rooty() + (master.winfo_height() - self.winfo_height()) // 3
            self.geometry(f"+{max(x, 0)}+{max(y, 0)}")
        except Exception:
            pass

    def _login(self):
        user = models.UserService.authenticate(self.u.get(), self.p.widget.get())
        if user:
            self.result = user
            self.destroy()
        else:
            self.msg.config(text="غلط صارف نام یا پاس ورڈ")

    def _cancel(self):
        self.result = None
        self.destroy()


# ==========================================================================
# Dashboard
# ==========================================================================
class Dashboard(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=16)
        self.app = app

        ttk.Label(self, text="ڈیش بورڈ", style="Title.TLabel").pack(anchor="e")
        ttk.Label(self, text="HF TC - Collection & Accounts Software",
                  style="Muted.TLabel").pack(anchor="e", pady=(0, 10))

        self.cards = tk.Frame(self, bg=BG)
        self.cards.pack(fill="x", pady=(0, 12))
        self._card_widgets = {}

        specs = [
            ("total_receivable", "کل وصولی باقی (Receivable)", NAVY),
            ("today_collection", "آج کی وصولی", GREEN),
            ("month_collection", "اس ماہ وصولی", GREEN),
            ("cash_balance", "کیش بیلنس", NAVY_LIGHT),
            ("customers", "کل کھاتے", NAVY),
            ("active", "فعال کھاتے", GREEN),
            ("overdue", "ڈیفالٹر کھاتے", RED),
            ("month_expense", "اس ماہ اخراجات", RED),
            ("stock_value", "اسٹاک مالیت", NAVY),
            ("low_stock", "کم اسٹاک اشیاء", ACCENT),
        ]
        for i, (key, caption, color) in enumerate(specs):
            card = widgets.StatCard(self.cards, caption, "0", color)
            card.grid(row=i // 5, column=i % 5, padx=5, pady=5, sticky="nsew")
            self._card_widgets[key] = card
        for c in range(5):
            self.cards.grid_columnconfigure(c, weight=1)

        lower = tk.Frame(self, bg=BG)
        lower.pack(fill="both", expand=True)

        left = widgets.Card(lower, "آج کی وصولیاں")
        left.pack(side="right", fill="both", expand=True, padx=(0, 6))
        self.recent = widgets.DataTable(left, [
            ("receipt_no", "رسید", 90), ("card_no", "کارڈ", 70),
            ("customer_name", "نام", 150), ("amount", "رقم", 90),
            ("pay_date", "تاریخ", 90)], height=10)
        self.recent.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        right = widgets.Card(lower, "کم اسٹاک / یاد دہانی")
        right.pack(side="right", fill="both", expand=True, padx=(6, 0))
        self.alerts = widgets.DataTable(right, [
            ("name", "نام اشیاء", 150), ("qty_in_stock", "اسٹاک", 70),
            ("reorder_level", "حد", 70)], height=10)
        self.alerts.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        ttk.Button(self, text="تازہ کریں", style="Ghost.TButton",
                   command=self.refresh).pack(anchor="e", pady=(8, 0))
        self.refresh()

    def refresh(self):
        d = models.ReportService.dashboard()
        fmt = {
            "total_receivable": lambda v: utils.fmt_rs(v),
            "today_collection": lambda v: utils.fmt_rs(v),
            "month_collection": lambda v: utils.fmt_rs(v),
            "cash_balance": lambda v: utils.fmt_rs(v),
            "customers": lambda v: f"{v}",
            "active": lambda v: f"{v}",
            "overdue": lambda v: f"{v}",
            "month_expense": lambda v: utils.fmt_rs(v),
            "stock_value": lambda v: utils.fmt_rs(v),
            "low_stock": lambda v: f"{v}",
        }
        for key, card in self._card_widgets.items():
            card.set(fmt[key](d.get(key, 0)))

        today = utils.today_str()
        rows = models.CollectionService.list_receipts(date_from=today, date_to=today)
        self.recent.set_rows(rows)
        self.alerts.set_rows(models.ItemService.low_stock())


# ==========================================================================
# Main window
# ==========================================================================
class MainApp(tk.Tk):
    def __init__(self, user: dict):
        super().__init__()
        self.user = user
        self.title(f"{config.APP_NAME}  v{config.APP_VERSION}")
        self.geometry("1280x780")
        self.minsize(1080, 660)
        self.configure(bg=BG)
        self.theme = Theme(self)
        self.theme.apply()
        self._current = None
        self._nav_buttons = {}

        self._build_header()
        body = tk.Frame(self, bg=BG)
        body.pack(fill="both", expand=True)
        self._build_sidebar(body)
        self.content = tk.Frame(body, bg=BG)
        self.content.pack(side="right", fill="both", expand=True)
        self._container = {}
        self.show("dashboard")
        self._auto_backup()

    # -----------------------------------------------------------------
    def _build_header(self):
        head = tk.Frame(self, bg=NAVY, height=64)
        head.pack(fill="x")
        head.pack_propagate(False)

        left = tk.Frame(head, bg=NAVY)
        left.pack(side="right", fill="y", padx=16)
        tk.Label(left, text=config.DEFAULT_SETTINGS["company_name"], bg=NAVY,
                 fg="#FFFFFF", font=("Segoe UI", 16, "bold")).pack(
            anchor="e", pady=(10, 0))
        tk.Label(left, text=config.DEFAULT_SETTINGS["head_office"], bg=NAVY,
                 fg="#B9CCE0", font=("Segoe UI", 9)).pack(anchor="e")

        right = tk.Frame(head, bg=NAVY)
        right.pack(side="left", fill="y", padx=16)
        label = self.user.get("full_name") or self.user.get("username", "")
        tk.Label(right, text=f"{label}  ({self.user.get('role', '')})", bg=NAVY,
                 fg="#D6E2F0", font=("Segoe UI", 10)).pack(anchor="w", pady=(14, 0))
        tk.Label(right, text=datetime.now().strftime("%d-%m-%Y  %H:%M"), bg=NAVY,
                 fg="#8FA9C4", font=("Segoe UI", 9)).pack(anchor="w")

        logo = tk.Label(head, text="HF\nTC", bg=ACCENT, fg="#12263A",
                        font=("Segoe UI", 15, "bold"), width=5, height=2)
        logo.pack(side="left", padx=10, pady=4)

    def _build_sidebar(self, parent):
        bar = tk.Frame(parent, bg=NAVY_DARK, width=210)
        bar.pack(side="right", fill="y")
        bar.pack_propagate(False)

        tk.Label(bar, text="مینو", bg=NAVY_DARK, fg="#7E95AE",
                 font=("Segoe UI", 9)).pack(anchor="e", padx=16, pady=(12, 4))

        entries = [
            ("dashboard", "ڈیش بورڈ", "🏠"),
            ("customers", "کھاتے / گاہک", "🗂"),
            ("collection", "وصولی / رسید", "💰"),
            ("inventory", "اسٹاک / اشیاء", "📦"),
            ("accounts", "حسابات و اخراجات", "🧾"),
            ("reports", "رپورٹس و پرنٹ", "🖨"),
            ("settings", "ترتیبات", "⚙"),
        ]
        for key, label, icon in entries:
            btn = ttk.Button(bar, text=f"{label}   {icon}", style="Nav.TButton",
                             command=lambda k=key: self.show(k))
            btn.pack(fill="x", padx=6, pady=2)
            self._nav_buttons[key] = btn

        if self.user.get("role") == config.ROLE_ADMIN:
            btn = ttk.Button(bar, text="صارفین   👤", style="Nav.TButton",
                             command=lambda: self.show("users"))
            btn.pack(fill="x", padx=6, pady=2)
            self._nav_buttons["users"] = btn

        ttk.Button(bar, text="لاگ آؤٹ   ⏏", style="Nav.TButton",
                   command=self.logout).pack(side="bottom", fill="x", padx=6, pady=8)
        ttk.Button(bar, text="بیک اپ لیں", style="Nav.TButton",
                   command=self._backup_now).pack(side="bottom", fill="x",
                                                  padx=6, pady=2)

    # -----------------------------------------------------------------
    def _make_screen(self, key: str):
        from .ui import screens
        mapping = {
            "dashboard": lambda p: Dashboard(p, self),
            "customers": lambda p: screens.CustomersScreen(p, self),
            "collection": lambda p: screens.CollectionScreen(p, self),
            "inventory": lambda p: screens.InventoryScreen(p, self),
            "accounts": lambda p: screens.AccountsScreen(p, self),
            "reports": lambda p: screens.ReportsScreen(p, self),
            "settings": lambda p: screens.SettingsScreen(p, self),
            "users": lambda p: screens.UsersScreen(p, self),
        }
        return mapping[key](self.content)

    def show(self, key: str):
        for k, btn in self._nav_buttons.items():
            btn.configure(style="NavActive.TButton" if k == key else "Nav.TButton")
        if key not in self._container:
            self._container[key] = self._make_screen(key)
        for frame in self._container.values():
            frame.pack_forget()
        frame = self._container[key]
        frame.pack(fill="both", expand=True)
        self._current = key
        if hasattr(frame, "refresh"):
            try:
                frame.refresh()
            except Exception:
                pass

    # -----------------------------------------------------------------
    def _auto_backup(self):
        try:
            today = utils.today_str()
            if db.get_setting("last_backup") != today:
                db.backup_db("auto")
                db.set_setting("last_backup", today)
        except Exception:
            pass

    def _backup_now(self):
        try:
            path = db.backup_db("manual")
            widgets.info(f"بیک اپ محفوظ ہو گیا:\n{path.name}")
        except Exception as exc:
            widgets.error(f"بیک اپ ناکام: {exc}")

    def logout(self):
        if widgets.confirm("کیا آپ لاگ آؤٹ کرنا چاہتے ہیں؟"):
            db.close_connection()
            self.destroy()
            main()


def main():
    """Entry point: initialise the database, log in and run."""
    db.init_db()
    root = tk.Tk()
    root.withdraw()
    root.title(config.APP_NAME)
    dlg = LoginDialog(root)
    root.wait_window(dlg)
    root.destroy()
    if dlg.result:
        app = MainApp(dlg.result)
        app.mainloop()
    else:
        db.close_connection()
