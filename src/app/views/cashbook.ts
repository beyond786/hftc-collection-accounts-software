import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from '../services/data-store';
import { CashBookEntry } from '../models/types';
import { fmtMoney, fmtDate, todayStr, toFloat } from '../utils/accounting';

@Component({
  selector: 'app-cashbook',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold font-nastaliq text-slate-900">روزنامچہ و کیش بک (Daily Cash Book)</h1>
          <p class="text-xs text-slate-500 mt-0.5">آمد و خرچ کا روزانہ کھاتہ، رننگ بیلنس، وصولیاں اور اخراجات کا حساب کتاب</p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            (click)="showEntryModal.set(true)"
            class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer">
            <mat-icon class="text-lg">add_circle</mat-icon>
            <span>دستی کیش اندراج (آمد / خرچ)</span>
          </button>
        </div>
      </div>

      <!-- Financial Totals Summary -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">کل آمد (Total Cash In)</div>
            <div class="text-2xl font-bold text-emerald-700 font-num">Rs. {{ fmtMoney(totalCashIn()) }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <mat-icon>arrow_downward</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">کل خرچ (Total Cash Out)</div>
            <div class="text-2xl font-bold text-red-600 font-num">Rs. {{ fmtMoney(totalCashOut()) }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <mat-icon>arrow_upward</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">موجودہ کیش بیلنس (Net In Hand)</div>
            <div class="text-2xl font-bold text-slate-900 font-num" [class.text-red-700]="store.cashBalance() < 0">
              Rs. {{ fmtMoney(store.cashBalance()) }}
            </div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
        </div>
      </div>

      <!-- Cash Book Ledger Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div class="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70">
          <div class="w-full sm:w-80">
            <input
              [formControl]="searchControl"
              type="text"
              placeholder="تلاش روزنامچہ: تاریخ، تفصیل، حوالہ..."
              class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-emerald-500">
          </div>
          <div class="text-xs text-slate-500">
            کل اندراجات: <span class="font-bold text-slate-800">{{ filteredEntries().length }}</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th class="p-3 pr-4 w-12 text-center">سیریل</th>
                <th class="p-3">تاریخ</th>
                <th class="p-3">تفصیل لین دین (Description)</th>
                <th class="p-3 text-center">نوعیت</th>
                <th class="p-3 text-center">آمد (Cash In)</th>
                <th class="p-3 text-center">خرچ (Cash Out)</th>
                <th class="p-3 text-center">بقایا بیلنس</th>
                <th class="p-3 pl-4">صارف</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (filteredEntries().length === 0) {
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400">کوئی اندراج نہیں ملا</td>
                </tr>
              } @else {
                @for (entry of filteredEntries(); track entry.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="p-3 pr-4 font-num text-center text-slate-400 font-semibold">{{ entry.id }}</td>
                    <td class="p-3 font-num font-semibold text-slate-700">{{ fmtDate(entry.entryDate) }}</td>
                    <td class="p-3 font-bold text-slate-900">{{ entry.description }}</td>
                    <td class="p-3 text-center">
                      <span class="px-2 py-0.5 rounded text-[10.5px] font-semibold"
                        [class.bg-emerald-100]="entry.refType === 'receipt'"
                        [class.text-emerald-800]="entry.refType === 'receipt'"
                        [class.bg-red-100]="entry.refType === 'expense'"
                        [class.text-red-800]="entry.refType === 'expense'"
                        [class.bg-blue-100]="entry.refType === 'capital'"
                        [class.text-blue-800]="entry.refType === 'capital'"
                        [class.bg-purple-100]="entry.refType === 'purchase'"
                        [class.text-purple-800]="entry.refType === 'purchase'">
                        {{ getRefTypeLabel(entry.refType) }}
                      </span>
                    </td>
                    <td class="p-3 text-center font-num font-bold text-emerald-700">
                      {{ entry.cashIn > 0 ? 'Rs. ' + fmtMoney(entry.cashIn) : '—' }}
                    </td>
                    <td class="p-3 text-center font-num font-bold text-red-600">
                      {{ entry.cashOut > 0 ? 'Rs. ' + fmtMoney(entry.cashOut) : '—' }}
                    </td>
                    <td class="p-3 text-center font-num font-bold text-slate-900">
                      Rs. {{ fmtMoney(entry.balance) }}
                    </td>
                    <td class="p-3 pl-4 text-slate-500 font-mono text-[11px]">{{ entry.userName || '—' }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

      </div>

      <!-- ============================================================= -->
      <!-- MODAL: ADD MANUAL CASH ENTRY                                  -->
      <!-- ============================================================= -->
      @if (showEntryModal()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
            <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 class="font-bold text-base font-nastaliq">دستی کیش اندراج (آمد یا اخراج)</h3>
              <button (click)="showEntryModal.set(false)" class="text-slate-400 hover:text-white p-1 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="entryForm" (ngSubmit)="onSubmitCashEntry()" class="p-6 space-y-4 text-right text-xs">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 font-bold mb-1">نوعیت انٹری *</label>
                  <select formControlName="flowType" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold">
                    <option value="in">آمد / کیش وصولی (Cash In)</option>
                    <option value="out">خرچ / ادائیگی (Cash Out)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-slate-700 font-bold mb-1">رقم *</label>
                  <input formControlName="amount" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num font-bold text-sm">
                </div>
              </div>

              <div>
                <label class="block text-slate-700 font-bold mb-1">تفصیل لین دین *</label>
                <input formControlName="description" type="text" placeholder="مثلاً: ابتدائی سرمایہ، متفرق آمدنی یا متفرق خرچ" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
              </div>

              <div>
                <label class="block text-slate-700 font-semibold mb-1">تاریخ</label>
                <input formControlName="entryDate" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
              </div>

              <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button type="button" (click)="showEntryModal.set(false)" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer">منسوخ</button>
                <button type="submit" [disabled]="entryForm.invalid || (entryForm.get('amount')?.value ?? 0) <= 0" class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">اندراج محفوظ کریں</button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
})
export class CashBook {
  readonly store = inject(DataStore);

  searchControl = new FormControl('');
  showEntryModal = signal<boolean>(false);

  entryForm = new FormGroup({
    flowType: new FormControl<'in' | 'out'>('in', [Validators.required]),
    amount: new FormControl(1000, [Validators.required, Validators.min(1)]),
    description: new FormControl('', [Validators.required]),
    entryDate: new FormControl(todayStr(), [Validators.required]),
  });

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;

  filteredEntries = computed(() => {
    let list = this.store.cashbook();
    const query = (this.searchControl.value || '').trim().toLowerCase();
    if (query) {
      list = list.filter((e) => {
        return (
          e.description.toLowerCase().includes(query) ||
          e.entryDate.toLowerCase().includes(query) ||
          (e.userName && e.userName.toLowerCase().includes(query))
        );
      });
    }
    return list;
  });

  totalCashIn = computed(() => {
    return this.store.cashbook().reduce((sum, e) => sum + (e.cashIn || 0), 0);
  });

  totalCashOut = computed(() => {
    return this.store.cashbook().reduce((sum, e) => sum + (e.cashOut || 0), 0);
  });

  getRefTypeLabel(type: string): string {
    switch (type) {
      case 'receipt':
        return 'وصولی رسید';
      case 'expense':
        return 'خرچ';
      case 'capital':
        return 'سرمایہ';
      case 'purchase':
        return 'اسٹاک خریداری';
      default:
        return 'متفرق';
    }
  }

  onSubmitCashEntry() {
    if (this.entryForm.invalid) return;
    const val = this.entryForm.value;
    const isCashIn = val.flowType === 'in';
    const amount = toFloat(val.amount, 0);

    this.store.addCashEntry({
      entryDate: val.entryDate || todayStr(),
      description: val.description || '',
      refType: isCashIn ? 'capital' : 'other',
      cashIn: isCashIn ? amount : 0,
      cashOut: isCashIn ? 0 : amount,
    });

    this.showEntryModal.set(false);
  }
}
