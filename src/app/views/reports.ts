import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from '../services/data-store';
import { fmtMoney, fmtDate, todayStr, toFloat, formatNic } from '../utils/accounting';

export type ReportType = 'daily_collection' | 'outstanding' | 'defaulters' | 'stock' | 'profit_loss' | 'collectors';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold font-nastaliq text-slate-900">رپورٹس و گوشوارے (Financial &amp; Accounts Reports)</h1>
          <p class="text-xs text-slate-500 mt-0.5">روزانہ وصولی شیٹ، بقایا کھاتے، ڈیفالٹرز، اسٹاک رپورٹ اور منافع و نقصان خلاصہ</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="triggerPrint()"
            class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm shadow-md active:scale-95 cursor-pointer">
            <mat-icon class="text-base">print</mat-icon>
            <span>رپورٹ پرنٹ کریں (Ctrl+P)</span>
          </button>
        </div>
      </div>

      <!-- Report Selector Pills -->
      <div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-wrap gap-2 text-xs font-bold no-print">
        <button
          (click)="selectedReport.set('daily_collection')"
          class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          [class.bg-emerald-600]="selectedReport() === 'daily_collection'"
          [class.text-white]="selectedReport() === 'daily_collection'"
          [class.bg-slate-100]="selectedReport() !== 'daily_collection'"
          [class.text-slate-700]="selectedReport() !== 'daily_collection'">
          <mat-icon class="text-base">today</mat-icon>
          <span>روزانہ وصولی شیٹ</span>
        </button>

        <button
          (click)="selectedReport.set('outstanding')"
          class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          [class.bg-emerald-600]="selectedReport() === 'outstanding'"
          [class.text-white]="selectedReport() === 'outstanding'"
          [class.bg-slate-100]="selectedReport() !== 'outstanding'"
          [class.text-slate-700]="selectedReport() !== 'outstanding'">
          <mat-icon class="text-base">account_balance</mat-icon>
          <span>بقایا کھاتے (Outstanding)</span>
        </button>

        <button
          (click)="selectedReport.set('defaulters')"
          class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          [class.bg-emerald-600]="selectedReport() === 'defaulters'"
          [class.text-white]="selectedReport() === 'defaulters'"
          [class.bg-slate-100]="selectedReport() !== 'defaulters'"
          [class.text-slate-700]="selectedReport() !== 'defaulters'">
          <mat-icon class="text-base">warning</mat-icon>
          <span>ڈیفالٹر / لیٹ کھاتے</span>
        </button>

        <button
          (click)="selectedReport.set('stock')"
          class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          [class.bg-emerald-600]="selectedReport() === 'stock'"
          [class.text-white]="selectedReport() === 'stock'"
          [class.bg-slate-100]="selectedReport() !== 'stock'"
          [class.text-slate-700]="selectedReport() !== 'stock'">
          <mat-icon class="text-base">inventory_2</mat-icon>
          <span>اسٹاک مالیت رپورٹ</span>
        </button>

        <button
          (click)="selectedReport.set('profit_loss')"
          class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          [class.bg-emerald-600]="selectedReport() === 'profit_loss'"
          [class.text-white]="selectedReport() === 'profit_loss'"
          [class.bg-slate-100]="selectedReport() !== 'profit_loss'"
          [class.text-slate-700]="selectedReport() !== 'profit_loss'">
          <mat-icon class="text-base">query_stats</mat-icon>
          <span>خلاصہ منافع و نقدی</span>
        </button>

        <button
          (click)="selectedReport.set('collectors')"
          class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          [class.bg-emerald-600]="selectedReport() === 'collectors'"
          [class.text-white]="selectedReport() === 'collectors'"
          [class.bg-slate-100]="selectedReport() !== 'collectors'"
          [class.text-slate-700]="selectedReport() !== 'collectors'">
          <mat-icon class="text-base">groups</mat-icon>
          <span>ریکوری افسران کارکردگی</span>
        </button>
      </div>

      <!-- Report Sheet Area -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print:p-0 print:border-none print:shadow-none text-right">
        
        <!-- Header (Rendered on screen & print) -->
        <div class="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
          <div>
            <h2 class="text-2xl font-bold font-nastaliq text-slate-900">{{ store.settings().companyName }}</h2>
            <div class="text-xs font-semibold text-slate-700">{{ store.settings().headOffice }}</div>
            <div class="text-xs text-slate-500 font-num">فون: {{ store.settings().phone1 }} &bull; {{ store.settings().phone2 }}</div>
          </div>
          <div class="text-left font-sans">
            <div class="text-lg font-bold text-slate-900">{{ getReportTitle() }}</div>
            <div class="text-xs text-slate-500 font-num">تاریخ رپورٹ: {{ todayStr() }}</div>
          </div>
        </div>

        <!-- 1. DAILY COLLECTION SHEET -->
        @if (selectedReport() === 'daily_collection') {
          <div class="space-y-4">
            <div class="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 no-print">
              <div class="flex items-center gap-2 text-xs font-bold">
                <span>تاریخ منتخب کریں:</span>
                <input [formControl]="dateFilter" type="text" class="px-3 py-1 bg-white border border-slate-300 rounded-lg font-num">
              </div>
              <div class="text-xs font-semibold">
                کل وصولی برائے منتخب تاریخ: <span class="font-num font-bold text-emerald-700 text-sm">Rs. {{ fmtMoney(dailyCollectionTotal()) }}</span>
              </div>
            </div>

            <table class="w-full text-right text-xs border border-slate-300">
              <thead class="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th class="p-2 border-l border-slate-300">رسید #</th>
                  <th class="p-2 border-l border-slate-300">کارڈ #</th>
                  <th class="p-2 border-l border-slate-300">گاہک کا نام</th>
                  <th class="p-2 border-l border-slate-300">اشیاء</th>
                  <th class="p-2 border-l border-slate-300">قسط رقم</th>
                  <th class="p-2 border-l border-slate-300">جرمانہ</th>
                  <th class="p-2 border-l border-slate-300">کل وصولی</th>
                  <th class="p-2">بقایا</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (r of dailyReceipts(); track r.id) {
                  <tr>
                    <td class="p-2 border-l border-slate-200 font-num font-bold">{{ r.receiptNo }}</td>
                    <td class="p-2 border-l border-slate-200 font-num">{{ r.cardNo }}</td>
                    <td class="p-2 border-l border-slate-200 font-bold">{{ r.customerName }}</td>
                    <td class="p-2 border-l border-slate-200">{{ r.itemName }}</td>
                    <td class="p-2 border-l border-slate-200 font-num">Rs. {{ fmtMoney(r.amount) }}</td>
                    <td class="p-2 border-l border-slate-200 font-num text-amber-700">{{ r.fine ? 'Rs. ' + fmtMoney(r.fine) : '—' }}</td>
                    <td class="p-2 border-l border-slate-200 font-num font-bold text-emerald-800">Rs. {{ fmtMoney(r.amount + r.fine) }}</td>
                    <td class="p-2 font-num">Rs. {{ fmtMoney(r.balanceAfter) }}</td>
                  </tr>
                }
                @if (dailyReceipts().length === 0) {
                  <tr>
                    <td colspan="8" class="p-6 text-center text-slate-400">اس تاریخ کی کوئی وصولی درج نہیں ہے</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- 2. OUTSTANDING BALANCES REPORT -->
        @if (selectedReport() === 'outstanding') {
          <div class="space-y-4">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-semibold">
              <span>کل واجب الوصول بقایا جات: <span class="font-num font-bold text-red-600 text-sm">Rs. {{ fmtMoney(store.totalReceivable()) }}</span></span>
              <span>کل کھاتے: <span class="font-num font-bold text-slate-900">{{ outstandingCustomers().length }}</span></span>
            </div>

            <table class="w-full text-right text-xs border border-slate-300">
              <thead class="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th class="p-2 border-l border-slate-300">کارڈ #</th>
                  <th class="p-2 border-l border-slate-300">گاہک کا نام</th>
                  <th class="p-2 border-l border-slate-300">فون نمبر</th>
                  <th class="p-2 border-l border-slate-300">اشیاء</th>
                  <th class="p-2 border-l border-slate-300">کل ڈیل</th>
                  <th class="p-2 border-l border-slate-300">ادا شدہ</th>
                  <th class="p-2 border-l border-slate-300">بقایا رقم</th>
                  <th class="p-2">ماہانہ قسط</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (c of outstandingCustomers(); track c.id) {
                  <tr>
                    <td class="p-2 border-l border-slate-200 font-num font-bold">{{ c.cardNo }}</td>
                    <td class="p-2 border-l border-slate-200 font-bold">{{ c.name }}</td>
                    <td class="p-2 border-l border-slate-200 font-num">{{ c.phone }}</td>
                    <td class="p-2 border-l border-slate-200">{{ c.itemName }}</td>
                    <td class="p-2 border-l border-slate-200 font-num">Rs. {{ fmtMoney(c.totalAmount) }}</td>
                    <td class="p-2 border-l border-slate-200 font-num text-emerald-700 font-semibold">Rs. {{ fmtMoney(store.getCustomerTotalPaid(c.id)) }}</td>
                    <td class="p-2 border-l border-slate-200 font-num font-bold text-red-600">Rs. {{ fmtMoney(c.remainingAmount) }}</td>
                    <td class="p-2 font-num">Rs. {{ fmtMoney(c.monthlyInstallment) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- 3. DEFAULTERS / OVERDUE -->
        @if (selectedReport() === 'defaulters') {
          <div class="space-y-4">
            <div class="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-xs font-semibold">
              مندرجہ ذیل کھاتوں کی قسط رواں ماہ واجب الادا تاریخ سے تاخیر کا شکار ہے۔ فی چکر مقررہ جرمانہ: Rs. {{ store.settings().lateFine }}
            </div>

            <table class="w-full text-right text-xs border border-slate-300">
              <thead class="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th class="p-2 border-l border-slate-300">کارڈ #</th>
                  <th class="p-2 border-l border-slate-300">نام گاہک</th>
                  <th class="p-2 border-l border-slate-300">فون</th>
                  <th class="p-2 border-l border-slate-300">پتہ</th>
                  <th class="p-2 border-l border-slate-300">قسط تاریخ</th>
                  <th class="p-2 border-l border-slate-300">ماہانہ قسط</th>
                  <th class="p-2">کل بقایا</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (c of store.overdueCustomers(); track c.id) {
                  <tr>
                    <td class="p-2 border-l border-slate-200 font-num font-bold">{{ c.cardNo }}</td>
                    <td class="p-2 border-l border-slate-200 font-bold">{{ c.name }}</td>
                    <td class="p-2 border-l border-slate-200 font-num">{{ c.phone }}</td>
                    <td class="p-2 border-l border-slate-200">{{ c.permanentAddress }}</td>
                    <td class="p-2 border-l border-slate-200 font-bold text-amber-800">ہر ماہ کی {{ c.dueDay }} تاریخ</td>
                    <td class="p-2 border-l border-slate-200 font-num font-bold">Rs. {{ fmtMoney(c.monthlyInstallment) }}</td>
                    <td class="p-2 font-num font-bold text-red-600">Rs. {{ fmtMoney(c.remainingAmount) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- 4. STOCK VALUATION -->
        @if (selectedReport() === 'stock') {
          <div class="space-y-4">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-semibold">
              <span>اسٹاک کی کل مالیت (خریداری ریٹ پر): <span class="font-num font-bold text-emerald-800 text-sm">Rs. {{ fmtMoney(store.stockValue()) }}</span></span>
              <span>کل اشیاء: <span class="font-num font-bold">{{ store.items().length }}</span></span>
            </div>

            <table class="w-full text-right text-xs border border-slate-300">
              <thead class="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th class="p-2 border-l border-slate-300">کوڈ</th>
                  <th class="p-2 border-l border-slate-300">نام اشیاء</th>
                  <th class="p-2 border-l border-slate-300">ماڈل</th>
                  <th class="p-2 border-l border-slate-300">کیٹیگری</th>
                  <th class="p-2 border-l border-slate-300">موجودہ اسٹاک</th>
                  <th class="p-2 border-l border-slate-300">خریداری قیمت</th>
                  <th class="p-2 border-l border-slate-300">فروخت قیمت</th>
                  <th class="p-2">کل مالیت (لاگت)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (i of store.items(); track i.id) {
                  <tr>
                    <td class="p-2 border-l border-slate-200 font-num font-bold">{{ i.code }}</td>
                    <td class="p-2 border-l border-slate-200 font-bold">{{ i.name }}</td>
                    <td class="p-2 border-l border-slate-200 font-mono">{{ i.model }}</td>
                    <td class="p-2 border-l border-slate-200">{{ i.category }}</td>
                    <td class="p-2 border-l border-slate-200 font-num font-bold text-center" [class.text-rose-600]="i.qtyInStock <= i.reorderLevel">
                      {{ i.qtyInStock }} {{ i.unit }}
                    </td>
                    <td class="p-2 border-l border-slate-200 font-num">Rs. {{ fmtMoney(i.purchasePrice) }}</td>
                    <td class="p-2 border-l border-slate-200 font-num">Rs. {{ fmtMoney(i.salePrice) }}</td>
                    <td class="p-2 font-num font-bold text-emerald-800">Rs. {{ fmtMoney(i.qtyInStock * i.purchasePrice) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- 5. PROFIT & LOSS -->
        @if (selectedReport() === 'profit_loss') {
          <div class="space-y-6 max-w-xl mx-auto">
            <div class="border border-slate-300 rounded-xl overflow-hidden">
              <table class="w-full text-right text-xs">
                <tbody>
                  <tr class="bg-emerald-50/50 border-b border-slate-200 font-bold">
                    <td class="p-3">کل وصول شدہ اقساط و ایڈوانس (Total Collection)</td>
                    <td class="p-3 font-num text-emerald-800 text-sm text-left">Rs. {{ fmtMoney(totalCollections()) }}</td>
                  </tr>
                  <tr class="border-b border-slate-200">
                    <td class="p-3 text-slate-700">منہا: کل دفتری اخراجات (Office Expenses)</td>
                    <td class="p-3 font-num text-red-600 text-left">- Rs. {{ fmtMoney(totalExpenses()) }}</td>
                  </tr>
                  <tr class="border-b border-slate-200">
                    <td class="p-3 text-slate-700">منہا: اسٹاک خریداری لاگت (Purchases)</td>
                    <td class="p-3 font-num text-red-600 text-left">- Rs. {{ fmtMoney(totalPurchases()) }}</td>
                  </tr>
                  <tr class="bg-slate-900 text-white font-bold text-sm">
                    <td class="p-4">خالص کیش منافع / سرپلس (Net Performance)</td>
                    <td class="p-4 font-num text-left font-extrabold text-emerald-400">
                      Rs. {{ fmtMoney(totalCollections() - totalExpenses() - totalPurchases()) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div class="font-bold text-slate-800">موجودہ مالیاتی پوزیشن:</div>
              <div class="flex justify-between">
                <span>کیش بیلنس روزنامچہ:</span>
                <span class="font-num font-bold">Rs. {{ fmtMoney(store.cashBalance()) }}</span>
              </div>
              <div class="flex justify-between">
                <span>اسٹاک اثاثہ جات:</span>
                <span class="font-num font-bold">Rs. {{ fmtMoney(store.stockValue()) }}</span>
              </div>
              <div class="flex justify-between text-red-700 font-bold">
                <span>مارکیٹ میں پھنسے بقایا جات:</span>
                <span class="font-num">Rs. {{ fmtMoney(store.totalReceivable()) }}</span>
              </div>
            </div>
          </div>
        }

        <!-- 6. COLLECTORS PERFORMANCE -->
        @if (selectedReport() === 'collectors') {
          <div class="space-y-4">
            <table class="w-full text-right text-xs border border-slate-300">
              <thead class="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th class="p-2 border-l border-slate-300">ریکوری آفیسر / وصول کنندہ</th>
                  <th class="p-2 border-l border-slate-300 text-center">وصول کردہ رسیدات تعداد</th>
                  <th class="p-2 border-l border-slate-300">کل وصول شدہ قسط رقم</th>
                  <th class="p-2 border-l border-slate-300">کل وصول شدہ لیٹ جرمانہ</th>
                  <th class="p-2 font-bold text-emerald-800">کل وصولی رقم</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (col of collectorSummaries(); track col.name) {
                  <tr>
                    <td class="p-2 border-l border-slate-200 font-bold text-slate-900">{{ col.name }}</td>
                    <td class="p-2 border-l border-slate-200 font-num text-center">{{ col.count }}</td>
                    <td class="p-2 border-l border-slate-200 font-num">Rs. {{ fmtMoney(col.amount) }}</td>
                    <td class="p-2 border-l border-slate-200 font-num text-amber-700">{{ col.fine > 0 ? 'Rs. ' + fmtMoney(col.fine) : '—' }}</td>
                    <td class="p-2 font-num font-bold text-emerald-800">Rs. {{ fmtMoney(col.amount + col.fine) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Report Signatures Footer (Visible in Print) -->
        <div class="mt-12 pt-6 border-t border-slate-900 flex justify-between text-xs font-bold">
          <div>دستخط برائے پڑتال (Checked By): ___________________</div>
          <div>دستخط چیف منیجر (Head Office): ___________________</div>
        </div>

      </div>

    </div>
  `,
})
export class Reports {
  readonly store = inject(DataStore);

  selectedReport = signal<ReportType>('daily_collection');
  dateFilter = new FormControl(todayStr());

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;
  todayStr = todayStr;

  getReportTitle(): string {
    switch (this.selectedReport()) {
      case 'daily_collection':
        return 'روزانہ وصولی شیٹ (Daily Collection Sheet)';
      case 'outstanding':
        return 'بقایا کھاتے رپورٹ (Outstanding Accounts)';
      case 'defaulters':
        return 'ڈیفالٹر / لیٹ کھاتے رپورٹ (Defaulters & Overdue)';
      case 'stock':
        return 'اسٹاک مالیت و انوینٹری رپورٹ (Stock Valuation)';
      case 'profit_loss':
        return 'منافع و نقصان خلاصہ (Profit & Loss Summary)';
      case 'collectors':
        return 'ریکوری اسٹاف کارکردگی گوشوارہ (Collectors Summary)';
      default:
        return 'رپورٹ';
    }
  }

  dailyReceipts = computed(() => {
    const d = this.dateFilter.value || todayStr();
    return this.store.receipts().filter((r) => r.payDate === d);
  });

  dailyCollectionTotal = computed(() => {
    return this.dailyReceipts().reduce((sum, r) => sum + (r.amount || 0) + (r.fine || 0), 0);
  });

  outstandingCustomers = computed(() => {
    return this.store.customers().filter((c) => c.status !== 'closed' && c.remainingAmount > 0);
  });

  totalCollections = computed(() => {
    return this.store.receipts().reduce((sum, r) => sum + (r.amount || 0) + (r.fine || 0), 0);
  });

  totalExpenses = computed(() => {
    return this.store.expenses().reduce((sum, e) => sum + (e.amount || 0), 0);
  });

  totalPurchases = computed(() => {
    return this.store
      .stockMovements()
      .filter((m) => m.moveType === 'purchase')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
  });

  collectorSummaries = computed(() => {
    const map = new Map<string, { count: number; amount: number; fine: number }>();
    this.store.receipts().forEach((r) => {
      const col = r.collector || 'دفتر کاؤنٹر';
      const cur = map.get(col) || { count: 0, amount: 0, fine: 0 };
      map.set(col, {
        count: cur.count + 1,
        amount: cur.amount + (r.amount || 0),
        fine: cur.fine + (r.fine || 0),
      });
    });

    const list: Array<{ name: string; count: number; amount: number; fine: number }> = [];
    map.forEach((val, name) => {
      list.push({ name, ...val });
    });
    return list;
  });

  triggerPrint() {
    window.print();
  }
}
