"""Visual theme for the HF TC desktop application."""
from __future__ import annotations

import tkinter as tk
from tkinter import font as tkfont
from tkinter import ttk

# Palette ------------------------------------------------------------------
NAVY = "#0F2E4C"
NAVY_DARK = "#0A2036"
NAVY_LIGHT = "#1B4A75"
ACCENT = "#E8A33D"
GREEN = "#1E8E5A"
RED = "#C0392B"
BLUE = "#2D7DD2"
BG = "#F4F6F9"
CARD = "#FFFFFF"
BORDER = "#D8DEE6"
TEXT = "#1A2733"
MUTED = "#64748B"
ROW_ALT = "#F7F9FC"

# Prefer a Nastaliq font when the machine has one --------------------------
URDU_FAMILIES = ["Jameel Noori Nastaleeq", "Noto Nastaliq Urdu",
                 "Alvi Nastaleeq", "Nafees Web Naskh"]
FALLBACK_FAMILIES = ["Segoe UI", "Tahoma", "Arial"]


def pick_font(root: tk.Misc) -> str:
    available = set(tkfont.families(root))
    for fam in URDU_FAMILIES:
        if fam in available:
            return fam
    for fam in FALLBACK_FAMILIES:
        if fam in available:
            return fam
    return "TkDefaultFont"


class Theme:
    """Holds the resolved fonts and applies ttk styles."""

    def __init__(self, root: tk.Misc):
        self.root = root
        self.family = pick_font(root)
        self.f_title = (self.family, 20, "bold")
        self.f_h1 = (self.family, 15, "bold")
        self.f_h2 = (self.family, 12, "bold")
        self.f_body = (self.family, 11)
        self.f_small = (self.family, 9)
        self.f_mono = ("Consolas", 11)
        self.numeric = ("Consolas", 11)

    def apply(self) -> None:
        style = ttk.Style(self.root)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure(".", font=self.f_body, background=BG, foreground=TEXT)
        style.configure("TFrame", background=BG)
        style.configure("Card.TFrame", background=CARD, relief="flat")
        style.configure("Header.TFrame", background=NAVY)
        style.configure("Sidebar.TFrame", background=NAVY_DARK)

        style.configure("TLabel", background=BG, foreground=TEXT, font=self.f_body)
        style.configure("Card.TLabel", background=CARD, foreground=TEXT)
        style.configure("Title.TLabel", font=self.f_title, foreground=NAVY,
                        background=BG)
        style.configure("H1.TLabel", font=self.f_h1, foreground=NAVY, background=BG)
        style.configure("H2.TLabel", font=self.f_h2, foreground=NAVY, background=BG)
        style.configure("Muted.TLabel", foreground=MUTED, background=BG,
                        font=self.f_small)
        style.configure("White.TLabel", foreground="#FFFFFF", background=NAVY,
                        font=self.f_h1)
        style.configure("WhiteSmall.TLabel", foreground="#D6E2F0", background=NAVY,
                        font=self.f_small)
        style.configure("Stat.TLabel", font=(self.family, 22, "bold"),
                        foreground=NAVY, background=CARD)
        style.configure("StatCap.TLabel", font=self.f_small, foreground=MUTED,
                        background=CARD)

        style.configure("TButton", font=self.f_body, padding=(10, 6),
                        background=NAVY_LIGHT, foreground="#FFFFFF", borderwidth=0)
        style.map("TButton",
                  background=[("active", NAVY), ("disabled", "#9AA7B4")])
        style.configure("Accent.TButton", background=ACCENT, foreground="#1A1A1A")
        style.map("Accent.TButton", background=[("active", "#D08F2B")])
        style.configure("Success.TButton", background=GREEN, foreground="#FFFFFF")
        style.map("Success.TButton", background=[("active", "#166B44")])
        style.configure("Danger.TButton", background=RED, foreground="#FFFFFF")
        style.map("Danger.TButton", background=[("active", "#99291D")])
        style.configure("Ghost.TButton", background="#E2E8F0", foreground=NAVY)
        style.map("Ghost.TButton", background=[("active", "#CBD5E1")])
        style.configure("Nav.TButton", background=NAVY_DARK, foreground="#FFFFFF",
                        anchor="e", padding=(14, 11), font=(self.family, 12))
        style.map("Nav.TButton",
                  background=[("active", NAVY_LIGHT)],
                  foreground=[("active", "#FFFFFF")])
        style.configure("NavActive.TButton", background=ACCENT,
                        foreground="#12263A", anchor="e", padding=(14, 11),
                        font=(self.family, 12, "bold"))

        style.configure("TEntry", fieldbackground="#FFFFFF", padding=5,
                        bordercolor=BORDER, lightcolor=BORDER, darkcolor=BORDER)
        style.configure("TCombobox", fieldbackground="#FFFFFF", padding=4)
        style.configure("TSpinbox", fieldbackground="#FFFFFF", padding=4)

        style.configure("Treeview", background=CARD, fieldbackground=CARD,
                        rowheight=27, font=self.f_body, borderwidth=1)
        style.configure("Treeview.Heading", font=(self.family, 11, "bold"),
                        background=NAVY, foreground="#FFFFFF", padding=6)
        style.map("Treeview.Heading", background=[("active", NAVY_LIGHT)])
        style.map("Treeview", background=[("selected", "#CFE3F7")],
                  foreground=[("selected", TEXT)])

        style.configure("TNotebook", background=BG, borderwidth=0)
        style.configure("TNotebook.Tab", padding=(16, 8), font=self.f_h2)
        style.map("TNotebook.Tab",
                  background=[("selected", CARD), ("!selected", "#E2E8F0")],
                  foreground=[("selected", NAVY)])

        style.configure("TLabelframe", background=BG, bordercolor=BORDER)
        style.configure("TLabelframe.Label", background=BG, foreground=NAVY,
                        font=self.f_h2)
        style.configure("TProgressbar", background=GREEN)
        style.configure("TScrollbar", background="#CBD5E1")
