"""Render sample printouts to docs/samples for review without a GUI."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main() -> int:
    from hftc import config, database as db, models, printing, reports, seed, utils

    db.init_db()
    seed.seed_demo()

    out = Path(config.BASE_DIR) / "docs" / "samples"
    out.mkdir(parents=True, exist_ok=True)

    # point the printer at the samples folder
    config.PRINT_DIR = out

    c = models.CustomerService.get_by_card("1001")
    receipts = models.CollectionService.list_receipts(search="1001")

    written = []
    written.append(printing.PrintService.print_receipt(receipts[0], open_browser=False))
    written.append(printing.PrintService.print_agreement(c, open_browser=False))
    written.append(printing.PrintService.print_ledger(c, open_browser=False))

    day = utils.today_str()
    d1 = utils.month_start().strftime(utils.DATE_FMT)
    for fn in (
        lambda: reports.Reports.daily_report(day, open_browser=False),
        lambda: reports.Reports.collection_sheet(day, open_browser=False),
        lambda: reports.Reports.outstanding(open_browser=False),
        lambda: reports.Reports.overdue(open_browser=False),
        lambda: reports.Reports.inventory(open_browser=False),
        lambda: reports.Reports.cash_book(d1, day, open_browser=False),
        lambda: reports.Reports.expenses(d1, day, open_browser=False),
        lambda: reports.Reports.profit(d1, day, open_browser=False),
    ):
        written.append(fn())

    for p in written:
        print(f"  {p.name}  ({p.stat().st_size} bytes)")
    print(f"\n{len(written)} sample documents in {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
