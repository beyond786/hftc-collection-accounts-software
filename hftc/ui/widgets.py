"""Reusable Tkinter widgets for HF TC."""
from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk
from typing import Callable, Optional

from .theme import ACCENT, BG, BORDER, CARD, MUTED, NAVY, TEXT


class Card(tk.Frame):
    """A white rounded-ish panel with a title."""

    def __init__(self, parent, title: str = "", **kw):
        super().__init__(parent, bg=CARD, highlightbackground=BORDER,
                         highlightthickness=1, **kw)
        if title:
            tk.Label(self, text=title, bg=CARD, fg=NAVY,
                     font=("Segoe UI", 12, "bold")).pack(
                anchor="e", padx=12, pady=(10, 4))


class StatCard(tk.Frame):
    def __init__(self, parent, caption: str, value: str, color: str = NAVY):
        super().__init__(parent, bg=CARD, highlightbackground=BORDER,
                         highlightthickness=1)
        self.value_lbl = tk.Label(self, text=value, bg=CARD, fg=color,
                                  font=("Segoe UI", 20, "bold"))
        self.value_lbl.pack(anchor="e", padx=12, pady=(10, 0))
        tk.Label(self, text=caption, bg=CARD, fg=MUTED,
                 font=("Segoe UI", 9)).pack(anchor="e", padx=12, pady=(0, 10))

    def set(self, value: str):
        self.value_lbl.config(text=value)


class FormField(tk.Frame):
    """A labelled entry (or combobox) laid out right-to-left."""

    def __init__(self, parent, label: str, width: int = 22,
                 kind: str = "entry", values: Optional[list] = None,
                 required: bool = False, numeric: bool = False):
        super().__init__(parent, bg=CARD)
        text = label + (" *" if required else "")
        tk.Label(self, text=text, bg=CARD, fg=TEXT, anchor="e",
                 font=("Segoe UI", 10)).pack(anchor="e", fill="x")
        self.var = tk.StringVar()
        if kind == "combo":
            self.widget = ttk.Combobox(self, textvariable=self.var,
                                       values=values or [], width=width - 2,
                                       state="readonly")
        elif kind == "text":
            self.widget = tk.Text(self, width=width, height=3, relief="solid",
                                  bd=1, font=("Segoe UI", 10))
        else:
            self.widget = ttk.Entry(self, textvariable=self.var, width=width,
                                    justify="right")
            if numeric:
                self.widget.configure(justify="right")
        if kind != "text":
            self.widget.pack(anchor="e", fill="x", pady=(2, 0))
        else:
            self.widget.pack(anchor="e", fill="x", pady=(2, 0))
        if kind == "combo":
            self.widget.set("")

    # -- value helpers --------------------------------------------------
    def get(self) -> str:
        if isinstance(self.widget, tk.Text):
            return self.widget.get("1.0", "end").strip()
        return self.var.get().strip()

    def set(self, value) -> None:
        if isinstance(self.widget, tk.Text):
            self.widget.delete("1.0", "end")
            self.widget.insert("1.0", "" if value is None else str(value))
        else:
            self.var.set("" if value is None else str(value))

    def clear(self) -> None:
        self.set("")


def labelled_row(parent, label: str, value: str, mono: bool = False) -> ttk.Frame:
    f = ttk.Frame(parent)
    tk.Label(f, text=label, anchor="e", bg=BG, fg=MUTED,
             font=("Segoe UI", 9)).pack(side="right")
    tk.Label(f, text=value, anchor="e", bg=BG, fg=TEXT,
             font=("Consolas", 10) if mono else ("Segoe UI", 10, "bold")).pack(
        side="right", padx=6)
    return f


class DataTable(ttk.Frame):
    """Treeview wrapper with scrollbar and row helpers."""

    def __init__(self, parent, columns: list[tuple[str, str, int]],
                 height: int = 14, on_double: Optional[Callable] = None):
        super().__init__(parent)
        self.columns = columns
        keys = [c[0] for c in columns]
        self.tree = ttk.Treeview(self, columns=keys, show="headings",
                                 height=height)
        for key, heading, width in columns:
            self.tree.heading(key, text=heading)
            self.tree.column(key, width=width, anchor="center", stretch=True)
        vs = ttk.Scrollbar(self, orient="vertical", command=self.tree.yview)
        hs = ttk.Scrollbar(self, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscroll=vs.set, xscroll=hs.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        vs.grid(row=0, column=1, sticky="ns")
        hs.grid(row=1, column=0, sticky="ew")
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        self.tree.tag_configure("alt", background="#F7F9FC")
        if on_double:
            self.tree.bind("<Double-1>", lambda e: on_double())

    def set_rows(self, rows: list[dict], money_keys: tuple = ()) -> None:
        self.tree.delete(*self.tree.get_children())
        for i, r in enumerate(rows):
            vals = []
            for key, _h, _w in self.columns:
                v = r.get(key, "")
                if key in money_keys and isinstance(v, (int, float)):
                    from .. import utils
                    v = utils.fmt_money(v)
                vals.append("" if v is None else v)
            tags = ("alt",) if i % 2 else ()
            self.tree.insert("", "end", iid=str(r.get("id", i)), values=vals,
                             tags=tags)

    def selected_id(self) -> Optional[str]:
        sel = self.tree.selection()
        return sel[0] if sel else None

    def selected_row(self, rows: list[dict]) -> Optional[dict]:
        sid = self.selected_id()
        if sid is None:
            return None
        for r in rows:
            if str(r.get("id")) == sid:
                return r
        return None


def info(msg: str, title: str = "HF TC") -> None:
    messagebox.showinfo(title, msg)


def warn(msg: str, title: str = "تنبیہ") -> None:
    messagebox.showwarning(title, msg)


def error(msg: str, title: str = "خرابی") -> None:
    messagebox.showerror(title, msg)


def confirm(msg: str, title: str = "تصدیق") -> bool:
    return messagebox.askyesno(title, msg)
