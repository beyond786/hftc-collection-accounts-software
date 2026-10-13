"""
Print engine for HF TC.

Every printout is generated as a print-ready HTML page that opens in the
default browser (File ▸ Print, or Ctrl+P) and prints on A5/A4.  The layouts
mirror the original paper forms:

  * Receipt        (رسید)          - small payment receipt
  * Agreement      (اقرار نامہ)     - customer / guarantor registration form
  * Ledger card    (کھاتا کارڈ)     - 20-row account card
  * Reports                        - collection sheet, outstanding, etc.
"""
from __future__ import annotations

import html
import webbrowser
from pathlib import Path
from typing import Iterable, Optional

from . import config, models, utils

# --------------------------------------------------------------------------
# Shared CSS
# --------------------------------------------------------------------------
_URDU_FONT = ("'Jameel Noori Nastaleeq','Noto Nastaliq Urdu','Alvi Nastaleeq',"
              "'Nafees Web Naskh',Tahoma,'Segoe UI',sans-serif")

_BASE_CSS = f"""
* {{ box-sizing: border-box; }}
body {{ margin: 0; padding: 12px; background: #f1f1f1; }}
.sheet {{
  background:#fff; width: 148mm; min-height: 200mm; margin: 0 auto 14px;
  padding: 7mm 6mm; border: 1px solid #333;
  font-family: {_URDU_FONT}; direction: rtl; color:#000;
}}
.sheet.a4 {{ width: 200mm; min-height: 277mm; }}
.header {{ display:flex; align-items:flex-start; justify-content:space-between;
           border-bottom: 1.6px solid #000; padding-bottom:3px; margin-bottom:5px; }}
.logo {{ width:48px; height:48px; border:2px solid #000; border-radius:50%;
         display:flex; flex-direction:column; align-items:center;
         justify-content:center; font-weight:700; font-size:11px; line-height:1; }}
.co-name {{ font-size:20px; font-weight:700; }}
.co-sub  {{ font-size:12px; }}
.rt {{ text-align:right; }} .ct {{ text-align:center; }} .lt {{ text-align:left; }}
table {{ width:100%; border-collapse: collapse; }}
td, th {{ border:1px solid #000; padding:3px 5px; font-size:12px; vertical-align:middle; }}
th {{ background:#eaeaea; font-weight:700; font-size:11.5px; }}
.nolabel td {{ border:none; padding:2px 3px; }}
.num {{ font-family: 'Consolas','Courier New',monospace; direction:ltr; display:inline-block; }}
.muted {{ color:#555; }}
.small {{ font-size:11px; }}
.sig {{ margin-top:14px; display:flex; justify-content:space-between; font-size:11px; }}
.sig .line {{ border-top:1px solid #000; width:38%; padding-top:2px; text-align:center; }}
@media print {{
  body {{ background:#fff; padding:0; }}
  .sheet {{ margin:0; border:none; width:auto; min-height:auto;
            page-break-after: always; }}
  .sheet:last-child {{ page-break-after: auto; }}
  @page {{ size: A5 portrait; margin: 6mm; }}
}}
"""


def _esc(v) -> str:
    return html.escape("" if v is None else str(v))


def _money(v) -> str:
    return utils.fmt_money(v)


class PrintService:
    """Renders and stores printable HTML documents."""

    # ------------------------------------------------------------------
    @staticmethod
    def _save(name: str, body: str, subtitle: str = "") -> Path:
        config.PRINT_DIR.mkdir(parents=True, exist_ok=True)
        doc = (f"<!DOCTYPE html><html lang='ur' dir='rtl'><head>"
               f"<meta charset='utf-8'>"
               f"<meta name='viewport' content='width=device-width,initial-scale=1'>"
               f"<title>{_esc(name)}</title><style>{_BASE_CSS}</style></head>"
               f"<body>{body}</body></html>")
        path = config.PRINT_DIR / f"{name}.html"
        path.write_text(doc, encoding="utf-8")
        return path

    @staticmethod
    def open_document(path: Path) -> None:
        try:
            webbrowser.open(path.resolve().as_uri())
        except Exception:
            pass

    # ------------------------------------------------------------------
    # 1. RECEIPT  (رسید)
    # ------------------------------------------------------------------
    @staticmethod
    def receipt_html(receipt: dict) -> str:
        s = config.DEFAULT_SETTINGS
        office = config.setting("head_office", s["head_office"])
        late = int(config.late_fine())
        note = config.LATE_FINE_NOTE.format(fine=late)
        amt = receipt.get("amount") or 0
        return f"""
<div class="sheet">
  <div class="header">
    <div style="display:flex; gap:6px; align-items:center;">
      <div class="logo">HF<br>TC</div>
      <div class="small" style="text-align:center;">
        ہمدرد فوجی<br>ٹریڈنگ کارپوریشن
      </div>
    </div>
    <div class="rt">
      <div class="co-name">{_esc(config.setting('company_name', s['company_name']))}</div>
      <div class="co-sub">{_esc(office)}</div>
      <div class="co-sub">
        موبائل {_esc(config.setting('phone1', s['phone1']))}
        &nbsp; {_esc(config.setting('phone2', s['phone2']))}
      </div>
    </div>
  </div>

  <div class="small" style="display:flex; justify-content:space-between;">
    <div>سیریل نمبر: <span class="num">{_esc(receipt.get('serial_no'))}</span></div>
    <div>تاریخ: <span class="num">{_esc(utils.fmt_date(receipt.get('pay_date')))}</span></div>
  </div>

  <table style="margin-top:6px;">
    <tr>
      <td style="width:22%"><b>کارڈ نمبر</b></td>
      <td class="num" style="width:28%">{_esc(receipt.get('card_no'))}</td>
      <td style="width:22%"><b>رسید نمبر</b></td>
      <td class="num">{_esc(receipt.get('receipt_no'))}</td>
    </tr>
    <tr>
      <td><b>نام</b></td>
      <td>{_esc(receipt.get('customer_name'))}</td>
      <td><b>ولدیت</b></td>
      <td>{_esc(receipt.get('father_name') or '')}</td>
    </tr>
    <tr>
      <td><b>نام اشیاء قسط</b></td>
      <td colspan="3">{_esc(receipt.get('item_name') or '')}</td>
    </tr>
    <tr>
      <td><b>مبلغ</b></td>
      <td>{_money(amt)}/=</td>
      <td><b>بقایا</b></td>
      <td>{_money(receipt.get('balance_after'))}</td>
    </tr>
  </table>

  <table style="margin-top:8px; height:26mm;">
    <tr>
      <td class="ct" style="width:22%; vertical-align:middle;">
        <span class="num">{_esc(receipt.get('box_code') or 'U-01')}</span>
      </td>
      <td class="ct" style="vertical-align:middle; font-size:26px; font-weight:700;">
        Rs. <span class="num">{_money(amt)}/</span>
      </td>
    </tr>
  </table>

  <div class="small" style="margin-top:6px;">
    رقم بالفاظ: {_esc(utils.num_to_words_urdu(amt))}
  </div>

  <div class="sig">
    <div class="line">دستخط منیجر</div>
    <div class="line">دستخط وصول کنندہ</div>
  </div>

  <div style="border-top:1px solid #000; margin-top:10px; padding-top:4px; font-size:11.5px;">
    {_esc(note)}
  </div>
</div>"""

    # ------------------------------------------------------------------
    # 2. AGREEMENT  (اقرار نامہ)
    # ------------------------------------------------------------------
    @staticmethod
    def agreement_html(c: dict, schedule: Optional[list] = None) -> str:
        s = config.DEFAULT_SETTINGS
        office = c.get("office_name") or config.setting("head_office", s["head_office"])
        nic = utils.clean_nic(c.get("nic_no") or "")
        gnic = utils.clean_nic(c.get("g_nic_no") or "")

        def nic_cells(value: str) -> str:
            digits = (value + "0" * 15)[:15]
            cells = "".join(f"<td class='ct num' style='width:6.6%; padding:6px 1px;'>"
                            f"{d}</td>" for d in digits)
            return f"<table style='margin-top:3px;'><tr>{cells}</tr></table>"

        sig_block = """
  <table style="margin-top:6px;">
    <tr>
      <td style="width:50%; height:16mm; vertical-align:bottom;"><b>دستخط کرایہ دار</b></td>
      <td style="vertical-align:bottom;"><b>دستخط ضامن</b></td>
    </tr>
  </table>"""

        return f"""
<div class="sheet">
  <div class="header">
    <div class="rt" style="flex:1;">
      <div class="co-name">{_esc(config.setting('company_name', s['company_name']))}</div>
      <div class="co-sub">{_esc(office)}</div>
      <div class="co-sub">
        موبائل {_esc(config.setting('phone1', s['phone1']))}
        &nbsp; {_esc(config.setting('phone2', s['phone2']))}
      </div>
    </div>
    <div class="logo">HF<br>TC</div>
  </div>

  <table class="nolabel" style="margin-bottom:4px;">
    <tr>
      <td style="width:25%"><b>کارڈ نمبر:</b> <span class="num">{_esc(c.get('card_no'))}</span></td>
      <td style="width:25%"><b>قسط ماہانہ:</b> <span class="num">{_money(c.get('monthly_installment'))}</span></td>
      <td style="width:25%"><b>تاریخ قسط ادائیگی:</b> <span class="num">{_esc(c.get('due_day') or '')}</span></td>
      <td style="width:25%"><b>عمر:</b> <span class="num">{_esc(c.get('age') or '')}</span></td>
    </tr>
  </table>

  <table>
    <tr>
      <td style="width:12%"><b>نام</b></td>
      <td style="width:30%">{_esc(c.get('name'))}</td>
      <td style="width:12%"><b>ولدیت</b></td>
      <td style="width:24%">{_esc(c.get('father_name') or '')}</td>
      <td style="width:8%"><b>قوم</b></td>
      <td>{_esc(c.get('caste') or '')}</td>
    </tr>
    <tr><td><b>پتہ مستقل</b></td><td colspan="5">{_esc(c.get('permanent_address') or '')}</td></tr>
    <tr><td><b>پتہ موجودہ</b></td><td colspan="5">{_esc(c.get('present_address') or '')}</td></tr>
    <tr><td><b>کام یا ملازمت کا پتہ</b></td><td colspan="5">{_esc(c.get('work_address') or '')}</td></tr>
    <tr><td><b>فون نمبر</b></td><td colspan="5"><span class="num">{_esc(c.get('phone') or '')}</span></td></tr>
  </table>

  <div class="small" style="margin-top:3px;"><b>این آئی سی نمبر (درخواست دہندہ):</b></div>
  {nic_cells(nic)}

  <table style="margin-top:5px;">
    <tr>
      <td style="width:12%"><b>نام اشیاء</b></td>
      <td style="width:26%">{_esc(c.get('item_name') or '')}</td>
      <td style="width:10%"><b>ماڈل</b></td>
      <td style="width:20%">{_esc(c.get('model') or '')}</td>
      <td style="width:12%"><b>تاریخ جمع</b></td>
      <td class="num">{_esc(utils.fmt_date(c.get('date_joined')))}</td>
    </tr>
    <tr>
      <td><b>کل رقم</b></td><td class="num">{_money(c.get('total_amount'))}</td>
      <td><b>ایڈوانس</b></td><td class="num">{_money(c.get('advance'))}</td>
      <td><b>بقایا رقم</b></td><td class="num">{_money(c.get('remaining_amount'))}</td>
    </tr>
    <tr>
      <td><b>رسید نمبر</b></td><td class="num">{_esc(c.get('opening_receipt_no') or '')}</td>
      <td><b>کیش ریٹ</b></td><td class="num">{_money(c.get('cash_rate'))}</td>
      <td><b>ہارڈ کیش ریٹ</b></td><td class="num">{_money(c.get('hard_cash_rate'))}</td>
    </tr>
  </table>

  <div style="border-top:1.4px solid #000; margin-top:8px; padding-top:3px; font-weight:700; font-size:13px;">
    ضامن کی تفصیل
  </div>

  <table style="margin-top:4px;">
    <tr>
      <td style="width:12%"><b>نام ضامنی</b></td>
      <td style="width:30%">{_esc(c.get('g_name') or '')}</td>
      <td style="width:12%"><b>ولدیت</b></td>
      <td style="width:24%">{_esc(c.get('g_father_name') or '')}</td>
      <td style="width:8%"><b>قوم</b></td>
      <td>{_esc(c.get('g_caste') or '')}</td>
    </tr>
    <tr><td><b>پتہ مستقل</b></td><td colspan="5">{_esc(c.get('g_permanent_address') or '')}</td></tr>
    <tr><td><b>پتہ موجودہ</b></td><td colspan="5">{_esc(c.get('g_present_address') or '')}</td></tr>
    <tr>
      <td><b>فون نمبر</b></td><td class="num">{_esc(c.get('g_phone1') or '')}</td>
      <td><b>فون نمبر</b></td><td colspan="3" class="num">{_esc(c.get('g_phone2') or '')}</td>
    </tr>
    <tr>
      <td><b>مراسم / درخواست دہندہ سے مراسم</b></td>
      <td colspan="5">{_esc(c.get('g_relation') or '')}</td>
    </tr>
  </table>

  <div class="small" style="margin-top:3px;"><b>این آئی سی نمبر (ضامن):</b></div>
  {nic_cells(gnic)}

  {sig_block}
</div>"""

    # ------------------------------------------------------------------
    # 3. LEDGER CARD  (کھاتا کارڈ)
    # ------------------------------------------------------------------
    @staticmethod
    def ledger_html(c: dict) -> str:
        n_rows = config.ledger_rows()
        entries = models.CustomerService.ledger(c["id"])
        by_sr = {utils.to_int(e.get("sr_no")): e for e in entries}
        rows_html = []
        for i in range(1, n_rows + 1):
            e = by_sr.get(i, {})
            rows_html.append(
                "<tr>"
                f"<td class='ct num' style='width:5%'>{i}</td>"
                f"<td style='width:11%'>{_esc(e.get('signature') or '')}</td>"
                f"<td class='ct' style='width:9%'>{_esc(e.get('month') or '')}</td>"
                f"<td class='ct num' style='width:12%'>"
                f"{_money(e.get('deposit')) if e.get('deposit') else ''}</td>"
                f"<td class='ct num' style='width:13%'>"
                f"{_money(e.get('balance')) if e.get('balance') not in (None, '') else ''}</td>"
                f"<td class='ct num' style='width:11%'>{_esc(e.get('receipt_no') or '')}</td>"
                f"<td class='ct num' style='width:9%'>"
                f"{_esc(utils.fmt_date(e.get('pay_date')) if e.get('pay_date') else '')}</td>"
                f"<td style='width:11%'>{_esc(e.get('om_signature') or '')}</td>"
                "</tr>")

        return f"""
<div class="sheet">
  <div class="header" style="border-bottom:1.2px solid #000;">
    <div class="rt" style="flex:1;">
      <div class="co-name" style="font-size:17px;">
        {_esc(config.setting('company_name', config.DEFAULT_SETTINGS['company_name']))}
      </div>
      <div class="co-sub">{_esc(c.get('office_name') or config.setting('head_office'))}</div>
    </div>
    <div class="logo">HF<br>TC</div>
  </div>

  <table class="nolabel" style="margin-bottom:3px;">
    <tr>
      <td style="width:34%"><b>نام:</b> {_esc(c.get('name'))}</td>
      <td style="width:33%"><b>نام اشیاء:</b> {_esc(c.get('item_name') or '')}
        {('(' + _esc(c.get('model')) + ')') if c.get('model') else ''}</td>
      <td style="width:33%"><b>کھاتا نمبر:</b>
        <span class="num">{_esc(c.get('card_no'))}</span></td>
    </tr>
    <tr>
      <td><b>کل رقم:</b> <span class="num">{_money(c.get('total_amount'))}</span></td>
      <td><b>قسط ماہانہ:</b> <span class="num">{_money(c.get('monthly_installment'))}</span></td>
      <td><b>تاریخ قسط:</b> <span class="num">{_esc(c.get('due_day') or '')}</span></td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th>نمبر</th><th>دستخط</th><th>ماہ</th><th>جمع</th>
        <th>بقایا</th><th>رسید</th><th>تاریخ</th><th>دستخط OM</th>
      </tr>
    </thead>
    <tbody>{''.join(rows_html)}</tbody>
  </table>

  <table class="nolabel" style="margin-top:4px;">
    <tr>
      <td style="width:50%"><b>کل وصولی:</b>
        <span class="num">{_money(models.CustomerService.total_paid(c['id']))}</span></td>
      <td><b>موجودہ بقایا:</b>
        <span class="num">{_money(models.CustomerService.balance(c['id']))}</span></td>
    </tr>
  </table>
</div>"""

    # ------------------------------------------------------------------
    # 4. Professional reports
    # ------------------------------------------------------------------
    @staticmethod
    def report_html(title: str, columns: list[tuple[str, str]],
                    rows: Iterable[dict], footer: Optional[dict] = None,
                    subtitle: str = "", landscape: bool = False) -> str:
        """Generic tabular report.

        columns: list of (key, heading).  ``key`` may start with '#' for a
        running row number, or use 'money:<key>' to format as currency.
        """
        head = "".join(f"<th>{_esc(h)}</th>" for _, h in columns)
        body_rows = []
        for idx, r in enumerate(rows, 1):
            cells = []
            for key, _h in columns:
                if key == "#":
                    val = idx
                elif key.startswith("money:"):
                    val = _money(r.get(key.split(":", 1)[1]))
                elif key.startswith("num:"):
                    val = _money(r.get(key.split(":", 1)[1]))
                else:
                    val = r.get(key, "")
                cls = "num" if (key.startswith("money:") or key.startswith("num:")) else ""
                cells.append(f"<td class='{'ct ' if cls else ''}{cls}'>{_esc(val)}</td>")
            body_rows.append("<tr>" + "".join(cells) + "</tr>")

        foot = ""
        if footer:
            cells = []
            for i, (key, _h) in enumerate(columns):
                if i == 0:
                    cells.append("<td class='ct'><b>کل</b></td>")
                else:
                    val = footer.get(key)
                    if val is None and key.startswith("money:"):
                        val = footer.get(key.split(":", 1)[1])
                    cls = "num" if (key.startswith("money:") or key.startswith("num:")) else ""
                    cells.append(f"<td class='ct {cls}'><b>{_esc(_money(val) if cls and val is not None else (val if val is not None else ''))}</b></td>")
            foot = "<tfoot><tr>" + "".join(cells) + "</tr></tfoot>"

        size_cls = "sheet a4"
        orient = "size: A4 landscape;" if landscape else "size: A4 portrait;"
        return f"""
<div class="{size_cls}" style="direction:rtl;">
  <div class="header">
    <div class="rt" style="flex:1;">
      <div class="co-name" style="font-size:18px;">
        {_esc(config.setting('company_name', config.DEFAULT_SETTINGS['company_name']))}</div>
      <div class="co-sub">{_esc(config.setting('head_office'))}</div>
    </div>
    <div class="logo">HF<br>TC</div>
  </div>
  <div class="ct" style="font-weight:700; font-size:15px; margin:4px 0;">{_esc(title)}</div>
  <div class="small muted ct" style="margin-bottom:5px;">{_esc(subtitle)}</div>
  <table><thead><tr>{head}</tr></thead><tbody>{''.join(body_rows)}</tbody>{foot}</table>
  <div class="small" style="margin-top:6px;">
    پرنٹ کی تاریخ: <span class="num">{_esc(utils.today_str())}</span>
  </div>
</div>"""

    # ------------------------------------------------------------------
    # Public entry points
    # ------------------------------------------------------------------
    @staticmethod
    def print_receipt(receipt: dict, open_browser: bool = True) -> Path:
        name = f"receipt_{receipt.get('receipt_no', 'x')}".replace(" ", "_")
        path = PrintService._save(name, PrintService.receipt_html(receipt))
        if open_browser:
            PrintService.open_document(path)
        return path

    @staticmethod
    def print_agreement(customer: dict, open_browser: bool = True) -> Path:
        name = f"agreement_{customer.get('card_no', 'x')}".replace(" ", "_")
        path = PrintService._save(name, PrintService.agreement_html(customer))
        if open_browser:
            PrintService.open_document(path)
        return path

    @staticmethod
    def print_ledger(customer: dict, open_browser: bool = True) -> Path:
        name = f"ledger_{customer.get('card_no', 'x')}".replace(" ", "_")
        path = PrintService._save(name, PrintService.ledger_html(customer))
        if open_browser:
            PrintService.open_document(path)
        return path

    @staticmethod
    def print_report(name: str, title: str, columns, rows,
                     footer: Optional[dict] = None, subtitle: str = "",
                     landscape: bool = False, open_browser: bool = True) -> Path:
        path = PrintService._save(
            name, PrintService.report_html(title, columns, rows, footer,
                                           subtitle, landscape))
        if open_browser:
            PrintService.open_document(path)
        return path
