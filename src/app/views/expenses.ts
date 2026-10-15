import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from '../services/data-store';
import { Expense } from '../models/types';
import { fmtMoney, fmtDate, todayStr, toFloat } from '../utils/accounting';

@Component({
  selector: 'app-expenses',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold font-nastaliq text-slate-900">اخراجات و دفتری اخراج (Office Expenses)</h1>
          <p class="text-xs text-slate-500 mt-0.5">تنخواہیں، کرایہ، پٹرول، اسٹیشنری اور دفتری اخراجات کا اندراج</p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            (click)="showExpenseModal.set(true)"
            class="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer">
            <mat-icon class="text-lg">add_circle</mat-icon>
            <span>نیا خرچ درج کریں</span>
          </button>
        </div>
      </div>

      <!-- Expense Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">کل دفتری اخراجات</div>
            <div class="text-2xl font-bold text-rose-700 font-num">Rs. {{ fmtMoney(totalExpenses()) }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <mat-icon>receipt</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">تنخواہیں (Salaries)</div>
            <div class="text-2xl font-bold text-slate-800 font-num">Rs. {{ fmtMoney(categoryTotal('تنخواہ')) }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <mat-icon>badge</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">دفتر کرایہ (Rent)</div>
            <div class="text-2xl font-bold text-slate-800 font-num">Rs. {{ fmtMoney(categoryTotal('کرایہ')) }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <mat-icon>store</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">پٹرول و سفر (Travel)</div>
            <div class="text-2xl font-bold text-slate-800 font-num">Rs. {{ fmtMoney(categoryTotal('پٹرول/سفر')) }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <mat-icon>two_wheeler</mat-icon>
          </div>
        </div>
      </div>

      <!-- Expenses List Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70">
          <div class="flex flex-1 items-center gap-3">
            <input
              [formControl]="searchControl"
              type="text"
              placeholder="تلاش خرچ: تفصیل، نام..."
              class="w-full sm:w-64 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-rose-500">

            <select
              [formControl]="categoryFilter"
              class="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-rose-500">
              <option value="">تمام کیٹیگریز</option>
              <option value="تنخواہ">تنخواہ</option>
              <option value="کرایہ">کرایہ</option>
              <option value="پٹرول/سفر">پٹرول/سفر</option>
              <option value="دفتری خرچ">دفتری خرچ</option>
              <option value="متفرق">متفرق</option>
            </select>
          </div>

          <div class="text-xs text-slate-500">
            فلٹر شدہ مجموعہ: <span class="font-num font-bold text-rose-700">Rs. {{ fmtMoney(filteredExpensesTotal()) }}</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th class="p-3 pr-4">تاریخ</th>
                <th class="p-3">کیٹیگری</th>
                <th class="p-3">تفصیل خرچ</th>
                <th class="p-3">ادائیگی برائے (Paid To)</th>
                <th class="p-3">رقم خرچ</th>
                <th class="p-3 pl-4">صارف</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (filteredExpenses().length === 0) {
                <tr>
                  <td colspan="6" class="p-8 text-center text-slate-400">کوئی خرچ نہیں ملا</td>
                </tr>
              } @else {
                @for (exp of filteredExpenses(); track exp.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="p-3 pr-4 font-num text-slate-600">{{ fmtDate(exp.expenseDate) }}</td>
                    <td class="p-3 font-semibold text-slate-800">
                      <span class="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{{ exp.category }}</span>
                    </td>
                    <td class="p-3 font-bold text-slate-900">{{ exp.description }}</td>
                    <td class="p-3 text-slate-700">{{ exp.paidTo || '—' }}</td>
                    <td class="p-3 font-num font-bold text-rose-700">Rs. {{ fmtMoney(exp.amount) }}</td>
                    <td class="p-3 pl-4 text-slate-500 text-[11px]">{{ exp.userName || '—' }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

      </div>

      <!-- ============================================================= -->
      <!-- MODAL: ADD EXPENSE                                            -->
      <!-- ============================================================= -->
      @if (showExpenseModal()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
            <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 class="font-bold text-base font-nastaliq">نیا خرچ درج کریں</h3>
              <button (click)="showExpenseModal.set(false)" class="text-slate-400 hover:text-white p-1 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="expenseForm" (ngSubmit)="onSubmitExpense()" class="p-6 space-y-4 text-right text-xs">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 font-bold mb-1">کیٹیگری *</label>
                  <select formControlName="category" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="تنخواہ">تنخواہ (Salary)</option>
                    <option value="کرایہ">دفتر کرایہ (Rent)</option>
                    <option value="پٹرول/سفر">پٹرول و سفری خرچ</option>
                    <option value="دفتری خرچ">اسٹیشنری و دفتری سامان</option>
                    <option value="بجلی/بل">یوٹیلٹی بلز</option>
                    <option value="چائے/ریفریشمنٹ">چائے و طعام</option>
                    <option value="متفرق">دیگر متفرق خرچ</option>
                  </select>
                </div>
                <div>
                  <label class="block text-slate-700 font-bold mb-1">رقم خرچ *</label>
                  <input formControlName="amount" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num font-bold text-rose-700 text-sm">
                </div>
              </div>

              <div>
                <label class="block text-slate-700 font-bold mb-1">تفصیل خرچ *</label>
                <input formControlName="description" type="text" placeholder="مثلاً: بائیک پٹرول خرچ" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">کس کو ادا کیا (Paid To)</label>
                  <input formControlName="paidTo" type="text" placeholder="نام شخص یا دکان" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">تاریخ</label>
                  <input formControlName="expenseDate" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button type="button" (click)="showExpenseModal.set(false)" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer">منسوخ</button>
                <button type="submit" [disabled]="expenseForm.invalid || (expenseForm.get('amount')?.value ?? 0) <= 0" class="bg-rose-700 hover:bg-rose-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">خرچ درج کریں</button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
})
export class Expenses {
  readonly store = inject(DataStore);

  searchControl = new FormControl('');
  categoryFilter = new FormControl('');
  showExpenseModal = signal<boolean>(false);

  expenseForm = new FormGroup({
    category: new FormControl('پٹرول/سفر', [Validators.required]),
    amount: new FormControl(500, [Validators.required, Validators.min(1)]),
    description: new FormControl('', [Validators.required]),
    paidTo: new FormControl(''),
    expenseDate: new FormControl(todayStr(), [Validators.required]),
  });

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;

  filteredExpenses = computed(() => {
    let list = this.store.expenses();
    const query = (this.searchControl.value || '').trim().toLowerCase();
    const cat = this.categoryFilter.value;

    if (query) {
      list = list.filter((e) => {
        return (
          e.description.toLowerCase().includes(query) ||
          e.category.toLowerCase().includes(query) ||
          (e.paidTo && e.paidTo.toLowerCase().includes(query))
        );
      });
    }

    if (cat) {
      list = list.filter((e) => e.category === cat);
    }

    return list;
  });

  totalExpenses = computed(() => {
    return this.store.expenses().reduce((sum, e) => sum + (e.amount || 0), 0);
  });

  filteredExpensesTotal = computed(() => {
    return this.filteredExpenses().reduce((sum, e) => sum + (e.amount || 0), 0);
  });

  categoryTotal(cat: string): number {
    return this.store
      .expenses()
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  onSubmitExpense() {
    if (this.expenseForm.invalid) return;
    const val = this.expenseForm.value;
    this.store.recordExpense({
      category: val.category || 'متفرق',
      amount: toFloat(val.amount, 0),
      description: val.description || '',
      paidTo: val.paidTo || '',
      expenseDate: val.expenseDate || todayStr(),
    });
    this.showExpenseModal.set(false);
  }
}
