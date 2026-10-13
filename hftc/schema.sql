-- =====================================================================
-- HF TC - Collection & Accounts Software
-- SQLite schema (Head Office local database)
-- =====================================================================
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Settings (key/value)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT
);

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     TEXT,
    role          TEXT NOT NULL DEFAULT 'operator',
    is_active     INTEGER NOT NULL DEFAULT 1,
    last_login    TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- Offices (آفس)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offices (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    address   TEXT,
    phone1    TEXT,
    phone2    TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------
-- Items / Inventory master (نام اشیاء)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    code           TEXT UNIQUE,
    name           TEXT NOT NULL,
    model          TEXT,
    category       TEXT,
    unit           TEXT DEFAULT 'عدد',
    purchase_price REAL DEFAULT 0,
    sale_price     REAL DEFAULT 0,
    cash_rate      REAL DEFAULT 0,
    hard_cash_rate REAL DEFAULT 0,
    qty_in_stock   INTEGER DEFAULT 0,
    reorder_level  INTEGER DEFAULT 0,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- Customers / Accounts (کھاتا) - mirrors the agreement (اقرار نامہ) form
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    card_no             TEXT UNIQUE NOT NULL,   -- کارڈ نمبر
    name                TEXT NOT NULL,          -- نام
    father_name         TEXT,                   -- ولدیت
    caste               TEXT,                   -- قوم
    permanent_address   TEXT,                   -- پتہ مستقل
    present_address     TEXT,                   -- پتہ موجودہ
    work_address        TEXT,                   -- کام یا ملازمت کا پتہ
    phone               TEXT,                   -- فون نمبر
    nic_no              TEXT,                   -- این آئی سی نمبر
    age                 INTEGER,                -- عمر
    office_id           INTEGER REFERENCES offices(id),
    item_id             INTEGER REFERENCES items(id),
    item_name           TEXT,                   -- نام اشیاء
    model               TEXT,                   -- ماڈل
    date_joined         TEXT,                   -- تاریخ جمع
    total_amount        REAL DEFAULT 0,         -- کل رقم
    advance             REAL DEFAULT 0,         -- ایڈوانس
    remaining_amount    REAL DEFAULT 0,         -- بقایا رقم
    monthly_installment REAL DEFAULT 0,         -- قسط ماہانہ
    due_day             INTEGER,                -- تاریخ قسط ادائیگی
    cash_rate           REAL DEFAULT 0,         -- کیش ریٹ
    hard_cash_rate      REAL DEFAULT 0,         -- ہارڈ کیش ریٹ
    opening_receipt_no  TEXT,                   -- رسید نمبر
    -- Guarantor (ضامن)
    g_name              TEXT,
    g_father_name       TEXT,
    g_caste             TEXT,
    g_permanent_address TEXT,
    g_present_address   TEXT,
    g_phone1            TEXT,
    g_phone2            TEXT,
    g_relation          TEXT,
    g_nic_no            TEXT,
    status              TEXT NOT NULL DEFAULT 'active',
    remarks             TEXT,
    created_at          TEXT DEFAULT (datetime('now','localtime')),
    updated_at          TEXT
);

-- ---------------------------------------------------------------------
-- Installments (ledger card rows: ماہ / جمع / بقایا / رسید / تاریخ)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sr_no       INTEGER,
    month       TEXT,
    deposit     REAL DEFAULT 0,
    balance     REAL DEFAULT 0,
    receipt_no  TEXT,
    pay_date    TEXT,
    om_signature TEXT,
    signature   TEXT,
    collector   TEXT,
    fine        REAL DEFAULT 0,
    remarks     TEXT,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- Receipts (رسید)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no     TEXT UNIQUE NOT NULL,
    serial_no      TEXT,
    customer_id    INTEGER REFERENCES customers(id),
    card_no        TEXT,
    customer_name  TEXT,
    father_name    TEXT,
    item_name      TEXT,
    amount         REAL DEFAULT 0,
    fine           REAL DEFAULT 0,
    balance_before REAL DEFAULT 0,
    balance_after  REAL DEFAULT 0,
    pay_date       TEXT,
    collector      TEXT,
    box_code       TEXT,
    remarks        TEXT,
    created_at     TEXT DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- Stock movements
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    move_date  TEXT,
    move_type  TEXT NOT NULL,
    qty        INTEGER NOT NULL,
    rate       REAL DEFAULT 0,
    amount     REAL DEFAULT 0,
    ref_no     TEXT,
    party      TEXT,
    remarks    TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- Cash book (روزنامچہ)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cashbook (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date  TEXT NOT NULL,
    description TEXT,
    ref_type    TEXT,
    ref_id      INTEGER,
    cash_in     REAL DEFAULT 0,
    cash_out    REAL DEFAULT 0,
    balance     REAL DEFAULT 0,
    user_name   TEXT,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- Expenses (اخراجات)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date TEXT NOT NULL,
    category     TEXT,
    description  TEXT,
    amount       REAL DEFAULT 0,
    paid_to      TEXT,
    user_name    TEXT,
    created_at   TEXT DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ts        TEXT DEFAULT (datetime('now','localtime')),
    user_name TEXT,
    action    TEXT,
    entity    TEXT,
    entity_id TEXT,
    details   TEXT
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cust_name      ON customers(name);
CREATE INDEX IF NOT EXISTS idx_cust_status    ON customers(status);
CREATE INDEX IF NOT EXISTS idx_cust_office    ON customers(office_id);
CREATE INDEX IF NOT EXISTS idx_inst_customer  ON installments(customer_id);
CREATE INDEX IF NOT EXISTS idx_inst_date      ON installments(pay_date);
CREATE INDEX IF NOT EXISTS idx_rcpt_customer  ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_rcpt_date      ON receipts(pay_date);
CREATE INDEX IF NOT EXISTS idx_stock_item     ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_cash_date      ON cashbook(entry_date);
CREATE INDEX IF NOT EXISTS idx_exp_date       ON expenses(expense_date);
