# HF TC — Collection & Accounts Software

**ہمدرد فوجی ٹریڈنگ کارپوریشن (HF TC)** کے **Head Office** کے لیے Windows پر چلنے والا
Python-based **collection / accounts / inventory** desktop software۔

Primary database **SQLite** ہے جو Head Office کے computer پر **local** محفوظ رہتی ہے
(`data/hftc.db`)۔ کوئی internet یا server درکار نہیں۔

---

## ✨ خصوصیات (Features)

| ماڈیول | تفصیل |
|---|---|
| **ڈیش بورڈ** | کل وصولی باقی، آج/اس ماہ وصولی، کیش بیلنس، کھاتے، ڈیفالٹر، اسٹاک مالیت |
| **کھاتے / گاہک** | اقرار نامہ کے تمام fields (نام، ولدیت، قوم، پتے، این آئی سی، ضامن…) + auto بقایا حساب |
| **وصولی / رسید** | قسط وصولی، آٹو جرمانہ، رسید نمبر، کھاتا کارڈ اپ ڈیٹ، رسید پرنٹ |
| **اسٹاک / اشیاء** | اشیاء master + خریداری/فروخت/واپسی/ایڈجسٹ لین دین، کم اسٹاک الرٹ |
| **حسابات و اخراجات** | روزنامچہ (Cash Book)، اخراجات، منافع/نقصان |
| **رپورٹس و پرنٹ** | روزانہ وصولی شیٹ، بقایا کھاتے، ڈیفالٹر، اسٹاک، روزنامچہ، اخراجات، منافع |
| **ترتیبات** | کمپنی معلومات، آفس/برانچیں، بیک اپ/باز بحالی، ڈیمو ڈیٹا |
| **صارفین** | کردار کے ساتھ صارفین (admin / manager / operator / collector) |

### پرنٹouts — اصل کاغذی فارمز کے مطابق
تینوں paper forms کا layout (column order، headings، totals، fields) بعینہٖ رکھا گیا ہے:

1. **رسید (Receipt)** — کارڈ نمبر، رسید نمبر، نام، ولدیت، نام اشیاء، مبلغ، بقایا،
   باکس کوڈ، رقم بالفاظ، دستخط منیجر/وصول کنندہ، لیٹ قسط جرمانہ نوٹ۔
2. **اقرار نامہ (Agreement)** — درخواست دہندہ + ضامن کی مکمل تفصیل، 15 خانہ این آئی سی،
   کل رقم / ایڈوانس / بقایا رقم / کیش ریٹ / ہارڈ کیش ریٹ، دستخط کرایہ دار و ضامن۔
3. **کھاتا کارڈ (Ledger Card)** — 20 قطاروں والا کارڈ: نمبر، دستخط، ماہ، جمع، بقایا،
   رسید، تاریخ، دستخط OM۔

تمام پرنٹouts print-ready HTML ہیں جو browser میں کھل کر `Ctrl+P` سے A5/A4 پر پرنٹ ہو جاتے ہیں۔

---

## 🚀 انسٹالیشن اور چلانا (Windows)

### طریقہ 1 — سیدھا چلائیں (سب سے آسان)
1. [python.org](https://www.python.org/downloads/windows/) سے **Python 3.9+** انسٹال کریں
   (installer میں **"Add Python to PATH"** اور **tcl/tk** ضرور شامل ہوں)۔
2. اس فولڈر میں **`run.bat`** پر ڈبل کلک کریں۔
3. پہلی بار لاگ ان: **صارف نام `admin` / پاس ورڈ `admin123`**
   (لاگ ان کے بعد ترتیبات → صارفین سے پاس ورڈ تبدیل کر لیں)۔

### طریقہ 2 — کمانڈ لائن
```bat
python main.py
```

### طریقہ 3 — standalone .exe بنانا (Python کے بغیر چلے)
```bat
pip install pyinstaller
python build_windows.py
```
`dist\HFTC.exe` بن جائے گا (single file) — اسے کسی بھی Windows PC پر کاپی کر کے ڈبل کلک سے چلایا جا سکتا ہے۔

سب سے آسان: **`build.bat` پر ڈبل کلک کریں** — یہ خود PyInstaller انسٹال کر کے `.exe` بنا دیتا ہے۔
مکمل قدم بہ قدم گائیڈ (اردو) یہاں ہے: [`docs/how-to-build-exe.md`](docs/how-to-build-exe.md)

**اختیاری سُوچ:**
```bat
python build_windows.py --onedir        :: ایک فولڈر build (تیز start)
python build_windows.py --debug         :: console window کے ساتھ (errors دیکھنے کے لیے)
python build_windows.py --install-deps  :: PyInstaller خود انسٹال کر دے
```

> **نوٹ:** صرف Python standard library درکار ہے (tkinter + sqlite3 دونوں CPython کے ساتھ آتے ہیں)۔
> کوئی `pip install` لازمی نہیں۔

---

## 📁 پروجیکٹ کی ساخت

```
hf-tc-software/
├── main.py                  # entry point
├── run.bat / run.sh         # launchers
├── build.bat / build.sh     # one-click builder (Windows / Linux-macOS)
├── build_windows.py         # PyInstaller build script
├── requirements.txt         # runtime (stdlib only)
├── requirements-build.txt   # build-only (PyInstaller)
├── assets/
│   ├── hftc.ico             # Windows app icon
│   └── hftc_icon.png        # icon source
├── docs/
│   └── how-to-build-exe.md  # مکمل اردو گائیڈ (.exe بنانے کا طریقہ)
├── hftc/
│   ├── config.py            # paths, settings, bilingual labels
│   ├── schema.sql           # SQLite schema (11 tables + indexes)
│   ├── database.py          # connection, settings, hashing, backup
│   ├── utils.py             # money/date/Urdu helpers, schedule maths
│   ├── models.py            # business logic (users, items, customers,
│   │                        #   collection, cash book, expenses, reports)
│   ├── printing.py          # receipt / agreement / ledger / report HTML
│   ├── reports.py           # ready-made report definitions
│   ├── seed.py              # demo data
│   ├── app.py               # main window, login, dashboard
│   └── ui/
│       ├── theme.py         # colours + ttk styles
│       ├── widgets.py       # Card, StatCard, FormField, DataTable
│       └── screens.py       # all module screens
├── tests/                   # pytest suite (24 tests)
└── tools/                   # ui_smoke.py, render_samples.py, make_icon.py
```

### ڈیٹا بیس ٹیبلز
`settings`, `users`, `offices`, `items`, `customers`, `installments`,
`receipts`, `stock_movements`, `cashbook`, `expenses`, `audit_log`

---

## 🧮 حساب کتاب کے اصول

- **بقایا رقم** = کل رقم − (ایڈوانس + تمام وصول شدہ اقساط)
- **ایڈوانس** کھاتہ بناتے وقت پہلی ledger row کے طور پر درج ہوتا ہے
- **قسط ماہانہ** کی بنیاد پر اقساط کی تعداد خود بخود شمار ہوتی ہے
- **لیٹ جرمانہ** = فی چکر جرمانہ × چھوڑے گئے چکر (due day کی بنیاد پر)
- ہر وصولی خود بخود **روزنامچہ (Cash Book)** میں آمد بن جاتی ہے
- ہر خرچ خود بخود **روزنامچہ** میں خرچ بن جاتا ہے
- کھاتہ مکمل ادا ہونے پر خود بخود **closed** ہو جاتا ہے

---

## 🧪 ٹیسٹ چلانا (developers)

```bash
pip install pytest
python -m pytest -q                    # 24 tests
xvfb-run -a python tools/ui_smoke.py   # headless UI smoke test (Linux)
python tools/render_samples.py         # sample printouts -> docs/samples/
```

---

## 🔐 بیک اپ

- ایپ ہر روز خود بخود بیک اپ لیتی ہے (`backups/`)۔
- سائیڈبار میں **"بیک اپ لیں"** یا ترتیبات → ڈیٹا و بیک اپ سے دستی بیک اپ۔
- باز بحالی (Restore) بھی ترتیبات سے ممکن ہے۔

---

## 📄 لائسنس

Internal software for HF TC Head Office.
