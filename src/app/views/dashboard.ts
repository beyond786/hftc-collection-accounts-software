import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from '../services/data-store';
import { Customer, Receipt } from '../models/types';
import { fmtMoney, fmtDate } from '../utils/accounting';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      
      <!-- Top Welcome Banner -->
      <div class="bg-gradient-to-l from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden border border-slate-700/50">
        <div class="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
                {{ store.settings().headOffice }}
              </span>
              <span class="text-xs text-slate-400">سافٹ ویئر ورژن 1.0.0</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold font-nastaliq text-emerald-100">
              {{ store.settings().companyName }}
            </h1>
            <p class="text-slate-300 text-xs sm:text-sm mt-1">
              مرکزی ڈیش بورڈ برائے وصولی، کھاتہ جات، روزنامچہ اور اسٹاک اکاؤنٹس
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              (click)="navigateTo.emit('collection')"
              class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95 cursor-pointer">
              <mat-icon class="text-lg">payments</mat-icon>
              <span>قسط وصولی درج کریں</span>
            </button>
            <button
              (click)="navigateTo.emit('customers')"
              class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 cursor-pointer">
              <mat-icon class="text-lg">person_add</mat-icon>
              <span>نیا کھاتا (اقرار نامہ)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Stat Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Total Receivable -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-slate-500 mb-1">کل وصولی باقی (بقایا جات)</div>
            <div class="text-2xl font-bold text-slate-900 font-num">
              Rs. {{ fmtMoney(store.totalReceivable()) }}
            </div>
            <div class="text-[11px] text-emerald-600 mt-1 font-medium">
              {{ store.dashboardStats().activeCustomers }} فعال کھاتے
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <mat-icon>account_balance</mat-icon>
          </div>
        </div>

        <!-- Cash In Hand -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-slate-500 mb-1">کیش بیلنس (روزنامچہ)</div>
            <div class="text-2xl font-bold text-slate-900 font-num" [class.text-red-600]="store.cashBalance() < 0">
              Rs. {{ fmtMoney(store.cashBalance()) }}
            </div>
            <div class="text-[11px] text-slate-500 mt-1">موجودہ نقدی دفتر</div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <mat-icon>savings</mat-icon>
          </div>
        </div>

        <!-- Today's Collection -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-slate-500 mb-1">آج کی کل وصولی</div>
            <div class="text-2xl font-bold text-emerald-700 font-num">
              Rs. {{ fmtMoney(store.todayCollection()) }}
            </div>
            <div class="text-[11px] text-slate-500 mt-1">
              اس ماہ: <span class="font-num font-semibold text-slate-700">Rs. {{ fmtMoney(store.monthCollection()) }}</span>
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <mat-icon>point_of_sale</mat-icon>
          </div>
        </div>

        <!-- Overdue Accounts -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-slate-500 mb-1">واجب الادا / لیٹ اقساط</div>
            <div class="text-2xl font-bold text-amber-600 font-num">
              {{ store.dashboardStats().overdueCount }}
            </div>
            <div class="text-[11px] text-amber-700 mt-1 font-medium">
              جرمانہ لاگو: Rs. {{ store.settings().lateFine }}/چکر
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <mat-icon>notification_important</mat-icon>
          </div>
        </div>

      </div>

      <!-- Second Tier Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">people</mat-icon>
          </div>
          <div>
            <div class="text-[11px] text-slate-500">کل رجسٹرڈ گاہک</div>
            <div class="text-base font-bold text-slate-800 font-num">{{ store.dashboardStats().totalCustomers }}</div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">check_circle</mat-icon>
          </div>
          <div>
            <div class="text-[11px] text-slate-500">مکمل ادا شدہ کھاتے</div>
            <div class="text-base font-bold text-slate-800 font-num">{{ store.dashboardStats().closedCustomers }}</div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">inventory_2</mat-icon>
          </div>
          <div>
            <div class="text-[11px] text-slate-500">اسٹاک کی کل مالیت</div>
            <div class="text-base font-bold text-slate-800 font-num">Rs. {{ fmtMoney(store.stockValue()) }}</div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">warning</mat-icon>
          </div>
          <div>
            <div class="text-[11px] text-slate-500">کم اسٹاک الرٹ</div>
            <div class="text-base font-bold text-rose-600 font-num">{{ store.dashboardStats().lowStockCount }} اشیاء</div>
          </div>
        </div>
      </div>

      <!-- Main Tables Grid: Overdue Customers + Recent Collections -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- 1. Overdue Accounts Alert Panel -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div class="flex items-center gap-2">
              <mat-icon class="text-amber-500 text-xl">warning</mat-icon>
              <h2 class="font-bold text-slate-800 text-sm sm:text-base">واجب الادا اقساط (Overdue Accounts)</h2>
            </div>
            <button
              (click)="navigateTo.emit('collection')"
              class="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer">
              سب دیکھیں &larr;
            </button>
          </div>

          <div class="divide-y divide-slate-100 flex-1 overflow-x-auto">
            @if (store.overdueCustomers().length === 0) {
              <div class="p-8 text-center text-slate-400 text-xs">
                کوئی واجب الادا قسط نہیں ہے۔ تمام کھاتے اپ ٹو ڈیٹ ہیں!
              </div>
            } @else {
              <table class="w-full text-right text-xs">
                <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th class="p-2.5 pr-4">کارڈ</th>
                    <th class="p-2.5">گاہک کا نام</th>
                    <th class="p-2.5">ماہانہ قسط</th>
                    <th class="p-2.5">بقایا رقم</th>
                    <th class="p-2.5 pl-4 text-center">ایکشن</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (c of store.overdueCustomers().slice(0, 5); track c.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="p-2.5 pr-4 font-num font-bold text-slate-700">{{ c.cardNo }}</td>
                      <td class="p-2.5">
                        <div class="font-bold text-slate-900">{{ c.name }}</div>
                        <div class="text-[10px] text-slate-400 font-num">{{ c.phone }}</div>
                      </td>
                      <td class="p-2.5 font-num font-semibold text-slate-700">Rs. {{ fmtMoney(c.monthlyInstallment) }}</td>
                      <td class="p-2.5 font-num font-bold text-red-600">Rs. {{ fmtMoney(c.remainingAmount) }}</td>
                      <td class="p-2.5 pl-4 text-center">
                        <button
                          (click)="onSelectOverdue(c)"
                          class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1">
                          <mat-icon class="text-sm">receipt</mat-icon>
                          <span>وصول</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>

        <!-- 2. Recent Collection Receipts -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-600 text-xl">receipt_long</mat-icon>
              <h2 class="font-bold text-slate-800 text-sm sm:text-base">حالیہ وصولیاں و رسیدات</h2>
            </div>
            <button
              (click)="navigateTo.emit('collection')"
              class="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer">
              وصولی رجسٹر &larr;
            </button>
          </div>

          <div class="divide-y divide-slate-100 flex-1 overflow-x-auto">
            @if (store.receipts().length === 0) {
              <div class="p-8 text-center text-slate-400 text-xs">
                ابھی تک کوئی رسید جاری نہیں ہوئی
              </div>
            } @else {
              <table class="w-full text-right text-xs">
                <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th class="p-2.5 pr-4">رسید نمبر</th>
                    <th class="p-2.5">گاہک</th>
                    <th class="p-2.5">تاریخ</th>
                    <th class="p-2.5">مبلغ وصولی</th>
                    <th class="p-2.5 pl-4 text-center">پرنٹ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (r of store.receipts().slice(0, 5); track r.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="p-2.5 pr-4 font-num font-bold text-slate-800">{{ r.receiptNo }}</td>
                      <td class="p-2.5">
                        <div class="font-bold text-slate-900">{{ r.customerName }}</div>
                        <div class="text-[10px] text-slate-400">کارڈ: <span class="font-num">{{ r.cardNo }}</span></div>
                      </td>
                      <td class="p-2.5 font-num text-slate-600">{{ fmtDate(r.payDate) }}</td>
                      <td class="p-2.5 font-num font-bold text-emerald-700">
                        Rs. {{ fmtMoney(r.amount) }}
                        @if (r.fine > 0) {
                          <span class="text-[10px] text-amber-600 block">(+{{ r.fine }} جرمانہ)</span>
                        }
                      </td>
                      <td class="p-2.5 pl-4 text-center">
                        <button
                          (click)="printReceipt.emit(r)"
                          class="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="رسید پرنٹ کریں">
                          <mat-icon class="text-base">print</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>

      </div>

      <!-- Low Stock Warning Row (if any) -->
      @if (store.lowStockItems().length > 0) {
        <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <mat-icon>inventory</mat-icon>
            </div>
            <div>
              <div class="font-bold text-rose-950 text-sm">کم اسٹاک تنبیہ! ({{ store.lowStockItems().length }} اشیاء)</div>
              <div class="text-xs text-rose-800">
                مندرجہ ذیل اشیاء کا اسٹاک ری آرڈر لیول سے نیچے آ گیا ہے:
                <span class="font-bold">
                  {{ getLowStockNames() }}
                </span>
              </div>
            </div>
          </div>
          <button
            (click)="navigateTo.emit('inventory')"
            class="bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0">
            اسٹاک چیک کریں
          </button>
        </div>
      }

    </div>
  `,
})
export class Dashboard {
  readonly store = inject(DataStore);

  readonly navigateTo = output<string>();
  readonly printReceipt = output<Receipt>();
  readonly selectCustomerForCollection = output<Customer>();

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;

  getLowStockNames(): string {
    return this.store.lowStockItems().map((i) => `${i.name} (${i.qtyInStock} باقی)`).join('، ');
  }

  onSelectOverdue(c: Customer) {
    this.selectCustomerForCollection.emit(c);
    this.navigateTo.emit('collection');
  }
}
