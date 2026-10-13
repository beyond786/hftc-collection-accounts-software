# HF TC – Collection & Accounts Software
# Windows `.exe` بنانے کا مکمل طریقہ (اردو)

یہ گائیڈ آپ کو قدم بہ قدم بتاتی ہے کہ GitHub سے ڈاؤن لوڈ کردہ سافٹ ویئر سے ایک
**standalone `HFTC.exe`** کیسے بنائیں جسے آپ Head Office کے کمپیوٹر پر ڈبل کلک کر کے
چلا سکیں — بغیر Python کھولنے یا کوئی کمانڈ چلانے کے۔

---

## 0) ایک نظر میں (TL;DR)

Windows پر — repo فولڈر کے اندر:

```bat
pip install pyinstaller
python build_windows.py
```

`.exe` یہاں بنے گی: **`dist\HFTC.exe`**

یا سب سے آسان: **`build.bat` پر ڈبل کلک کر دیں** — یہ خود PyInstaller انسٹال کر کے
`.exe` بنا دے گا۔

---

## 1) ضروری تقاضے (Requirements)

| چیز | تفصیل |
|---|---|
| Windows | Windows 10 یا 11 (64-bit) |
| Python | **3.9 یا اس سے نیا** — ترجیحاً 3.11/3.12 |
| انٹرنیٹ | صرف ایک بار، PyInstaller انسٹال کرنے کے لیے |
| جگہ | تقریباً 500 MB (Python + build tools) |

> ⚠️ `.exe` صرف اُس پلیٹ فارم پر بنتی ہے جس پر آپ build کرتے ہیں۔ **Windows `.exe`
> صرف Windows پر بنے گی** — Linux/macOS پر cross-build ممکن نہیں۔ اس لیے یہ کمانڈ
> **Windows کمپیوٹر پر** چلانی ہوگی۔

---

## 2) Python انسٹال کرنا

1. کھولیں: **https://www.python.org/downloads/windows/**
2. "Latest Python 3 Release" سے **Windows installer (64-bit)** ڈاؤن لوڈ کریں۔
3. انسٹالر چلائیں اور پہلی سکرین پر یہ **ضرور ٹک کریں**:
   - ✅ **Add python.exe to PATH**
   - ✅ **tcl/tk and IDLE** (یہ `tkinter` دیتا ہے — ایپ کا UI اسی پر ہے)
   - ✅ **pip**
4. **Install Now** دبائیں۔

تصدیق: `Win + R` → `cmd` → یہ لکھیں:

```bat
python --version
pip --version
```

اگر دونوں ورژن دکھا دیں تو Python تیار ہے۔

---

## 3) کوڈ حاصل کرنا

1. GitHub سے **Code ▸ Download ZIP** کریں:
   `https://github.com/beyond786/hftc-collection-accounts-software`
2. ZIP کو **Extract** کریں (مثلاً `C:\HFTC\hftc-collection-accounts-software`)
3. USB یا نیٹ ورک کے ذریعے وہی فولڈر **Head Office کے کمپیوٹر** پر کاپی کر لیں۔

> نوٹ: فولڈر کا path آسان رکھیں — خالی جگہ یا اردو حروف پریشان کر سکتے ہیں۔
> بہترین: `C:\HFTC\`

---

## 4) `.exe` بنانا — دو طریقے

### طریقہ A — سب سے آسان (ایک کلک)

فولڈر میں **`build.bat`** پر ڈبل کلک کریں۔
یہ خود بخود:
1. Python چیک کرتا ہے،
2. `pip install pyinstaller` چلاتا ہے،
3. `python build_windows.py` چلا کر `.exe` بناتا ہے،
4. آخر میں `dist` فولڈر کھول دیتا ہے۔

### طریقہ B — دستی (کمانڈز)

`cmd` کھولیں، فولڈر میں جائیں، اور یہ دو کمانڈیں چلائیں:

```bat
cd C:\HFTC\hftc-collection-accounts-software

pip install pyinstaller

python build_windows.py
```

اگر کبھی `PyInstaller install nahi hai` کا میسج آئے تو چلائیں:

```bat
python build_windows.py --install-deps
```

**اختیاری سُوچ:**

```bat
python build_windows.py --onedir      :: ایک فولڈر build (تیز start، ایک .exe + فولڈر)
python build_windows.py --debug       :: console window کے ساتھ (خرابی دیکھنے کے لیے)
python build_windows.py --no-icon     :: icon کے بغیر
```

---

## 5) build کے دوران کیا ہوتا ہے؟

`build_windows.py` یہ خودکار کام کرتا ہے:

| مرحلہ | تفصیل |
|---|---|
| جانچ | Python ≥ 3.9، `tkinter`، `main.py` موجودگی |
| انسٹال | ضرورت ہو تو PyInstaller |
| صفائی | پرانا `build/`، `dist/`، `*.spec` ہٹاتا ہے |
| build | `--onefile --windowed` یعنی ایک ہی `.exe`، بغیر کالی console ونڈو |
| ساتھ شامل | **`hftc/schema.sql`** (database schema)، ایپ کا پورا package، **icon** (`assets/hftc.ico`) |
| نتیجہ | `dist\HFTC.exe` |

پہلی بار build میں **1–3 منٹ** لگ سکتے ہیں۔

---

## 6) `.exe` کہاں بنتی ہے؟

```
hftc-collection-accounts-software\
├── build\                 ← عارضی فائلیں (ضرورت نہیں، حذف کر سکتے ہیں)
├── dist\
│    └── HFTC.exe          ← ✅ یہ آپ کی فائنل فائل ہے
├── HFTC.spec              ← خودکار بنی build recipe (ضرورت نہیں)
└── ...
```

**`HFTC.exe`** کو کسی بھی فولڈر (مثلاً `C:\HFTC`) میں رکھ کر ڈبل کلک کریں — بس۔

> 💡 ایک فائل والی `.exe` ہر بار چلنے پر عارضی فولڈر میں خود کو unpack کرتی ہے،
> اس لیے پہلا launch 3–8 سیکنڈ لے سکتا ہے۔ یہ معمول کی بات ہے۔ اگر start بہت سست
> لگے تو `--onedir` سے build کریں (تب `dist\HFTC\HFTC.exe` بنے گی اور start تیز ہو گا)۔

---

## 7) پہلی بار چلانے پر کیا ہوتا ہے؟

`HFTC.exe` کو **جس فولڈر میں رکھیں گے، اُسی کے ساتھ** یہ فولڈرز خود بن جائیں گے:

```
C:\HFTC\
├── HFTC.exe
├── data\
│    └── hftc.db           ← آپ کی local SQLite database (یہی Head Office کا اصل ڈیٹا ہے)
├── printouts\             ← پرنٹ کے لیے بننے والی رسید/اقرار نامہ/کھاتا کارڈ HTML فائلیں
├── backups\               ← خودکار بیک اپ (روزانہ/normal backup)
└── logs\
```

پہلے launch پر:

1. ایک **لاگ ان ڈائیلاگ** کھلے گا۔
2. ڈیفالٹ صارف:
   - **Username:** `admin`
   - **Password:** `admin123`
3. لاگ ان کے بعد **Settings** سے کمپنی/آفس کی معلومات، کم از کم ایک **Office/Branch**،
   **Items**، اور **وصول کنندہ (collector)** صارف بنا لیں۔
4. **صارفین** اسکرین سے `admin` کا پاس ورڈ **فوراً تبدیل** کر دیں۔

> 🔐 اہم: `data\hftc.db` میں آپ کا اصل ڈیٹا ہے — اس کی روزانہ کاپی `backups\` میں بنتی ہے۔
> اسے محفوظ رکھیں اور وقتاً فوقتاً USB/Google Drive پر کاپی کریں (Settings → بیک اپ)۔

---

## 8) اپنی پرنٹنگ — رسید / اقرار نامہ / کھاتا کارڈ

- ہر پرنٹ پر ایپ `printouts\` میں ایک **print-ready HTML** فائل بناتی ہے اور اسے
  browser میں کھول دیتی ہے۔
- وہاں **`Ctrl + P`** دبائیں → **A5** (رسید) یا **A4** (اقرار نامہ/کارڈ) منتخب کریں →
  Print۔
- یہ layouts اصل کاغذی فارمز کے عین مطابق (column order، headings، totals، fields) ہیں۔

---

## 9) اگر کوئی مسئلہ آئے

| خرابی | حل |
|---|---|
| `'python' is not recognized` | Python انسٹال نہیں یا PATH میں نہیں۔ انسٹالر دوبارہ چلا کر **Add to PATH** ٹک کریں، cmd بند کر کے دوبارہ کھولیں۔ |
| `No module named tkinter` | Python انسٹالر دوبارہ چلا کر **tcl/tk and IDLE** ٹک کریں۔ |
| `PyInstaller install nahi hai` | `pip install pyinstaller` چلائیں، یا `python build_windows.py --install-deps`۔ |
| `pip` پر انٹرنیٹ error | کمپیوٹر کو انٹرنیٹ سے جوڑیں یا `pip install --proxy ...` استعمال کریں۔ |
| `.exe` کھلتی ہے مگر کچھ نہیں دکھتا | `python build_windows.py --debug` سے build کریں اور console میں error دیکھیں۔ |
| Windows Defender کی وارننگ | "More info" → "Run anyway"۔ (چاہیں تو code-sign کر سکتے ہیں۔) |
| کمپیوٹر پر Python نہیں چلانا چاہتے | `.exe` صرف **build** کرنے کے لیے Python درکار ہے۔ ایک بار بننے کے بعد وہ `.exe` کسی بھی Windows PC (بغیر Python) پر چلے گی۔ |

---

## 10) تیز رفتار خلاصہ (Head Office کے لیے)

```
1. Python 3.9+ انسٹال کریں (Add to PATH + tcl/tk ٹک کے ساتھ)
2. repo فولڈر کھولیں
3. cmd میں:  pip install pyinstaller
4. cmd میں:  python build_windows.py
5. dist\HFTC.exe کو کسی مستقل فولڈر میں رکھیں
6. ڈبل کلک → admin / admin123 سے لاگ ان → پاس ورڈ بدلیں
7. Settings سے کمپنی + آفس + Items + صارفین بنا لیں — کام شروع!
```

---

*HF TC – Hamdard Fauji Trading Corporation | Head Office Mirpur Mathelo*
