import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from '../services/data-store';
import { Customer, Receipt } from '../models/types';
import { fmtMoney, fmtDate, todayStr, toFloat, calcLateFine } from '../utils/accounting';

@Component({
  selector: 'app-collection',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold font-nastaliq text-slate-900">وصولی و رسیدات (Installment Collection &amp; Receipts)</h1>
          <p class="text-xs text-slate-500 mt-0.5">قسط وصولی اندراج، خودکار لیٹ جرمانہ حساب، رسید بک پرنٹ اور کیش بک انٹری</p>
        </div>

        <div class="flex items-center gap-2">
          <div class="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <mat-icon class="text-emerald-600 text-lg">today</mat-icon>
            <span>آج کی وصولی: <span class="font-num font-bold text-sm">Rs. {{ fmtMoney(store.todayCollection()) }}</span></span>
          </div>
        </div>
      </div>

      <!-- Main Layout: Collection Form on Left/Top, Receipts Register on Right/Bottom -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- ============================================================= -->
        <!-- FORM: QUICK COLLECTION COUNTER (5 cols)                       -->
        <!-- ============================================================= -->
        <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-400">payments</mat-icon>
              <h2 class="font-bold text-base font-nastaliq">قسط وصولی کاؤنٹر (Fast POS Receipt)</h2>
            </div>
            <span class="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              اگلی رسید: {{ store.nextReceiptNo() }}
            </span>
          </div>

          <form [formGroup]="collectForm" (ngSubmit)="onSubmitCollection()" class="p-4 sm:p-6 space-y-4 text-right text-xs">
            
            <!-- Customer Picker -->
            <div>
              <label class="block text-slate-800 font-bold mb-1">گاہک / کھاتہ منتخب کریں *</label>
              <select
                formControlName="customerId"
                (change)="onCustomerSelected()"
                class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:border-emerald-500 text-xs sm:text-sm">
                <option value="">-- گاہک منتخب کریں --</option>
                @for (c of activeCustomers(); track c.id) {
                  <option [value]="c.id">
                    کارڈ {{ c.cardNo }} &bull; {{ c.name }} ({{ c.itemName }}) — بقایا: Rs. {{ fmtMoney(c.remainingAmount) }}
                  </option>
                }
              </select>
            </div>

            <!-- Customer Live Card Badge -->
            @if (selectedCustomer()) {
              <div class="bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/80 p-4 rounded-xl space-y-2">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="font-bold text-slate-900 text-sm">{{ selectedCustomer()?.name }}</div>
                    <div class="text-[11px] text-slate-500">ولد {{ selectedCustomer()?.fatherName }} &bull; فون: <span class="font-num">{{ selectedCustomer()?.phone }}</span></div>
                  </div>
                  <div class="text-left font-num">
                    <span class="bg-emerald-600 text-white text-[11px] px-2 py-0.5 rounded-md font-bold">
                      کارڈ: {{ selectedCustomer()?.cardNo }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-[11px]">
                  <div><b>نام اشیاء:</b> {{ selectedCustomer()?.itemName }}</div>
                  <div><b>تاریخ قسط:</b> ہر ماہ کی {{ selectedCustomer()?.dueDay }} تاریخ</div>
                  <div><b>ماہانہ قسط:</b> <span class="font-num font-bold">Rs. {{ fmtMoney(selectedCustomer()?.monthlyInstallment) }}</span></div>
                  <div><b>موجودہ بقایا:</b> <span class="font-num font-bold text-red-600">Rs. {{ fmtMoney(selectedCustomer()?.remainingAmount) }}</span></div>
                </div>

                <!-- Late Fine Notification if overdue -->
                @if (detectedLateFine() > 0) {
                  <div class="bg-amber-100/80 border border-amber-300 text-amber-900 p-2 rounded-lg text-[11px] flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="text-amber-600 text-sm">schedule</mat-icon>
                      <span>قسط لیٹ ہے! تجویز کردہ جرمانہ:</span>
                    </div>
                    <span class="font-num font-bold text-red-700">Rs. {{ detectedLateFine() }}</span>
                  </div>
                }
              </div>
            }

            <!-- Quick Amount Presets -->
            @if (selectedCustomer()) {
              <div class="flex flex-wrap items-center gap-1.5 pt-1">
                <span class="text-slate-500 text-[11px] font-semibold">فوری رقم:</span>
                <button
                  type="button"
                  (click)="setAmount(selectedCustomer()!.monthlyInstallment)"
                  class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer">
                  ایک قسط (Rs. {{ fmtMoney(selectedCustomer()!.monthlyInstallment) }})
                </button>
                <button
                  type="button"
                  (click)="setAmount(selectedCustomer()!.monthlyInstallment * 2)"
                  class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer">
                  2 اقساط
                </button>
                <button
                  type="button"
                  (click)="setAmount(selectedCustomer()!.remainingAmount)"
                  class="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded text-[11px] font-bold cursor-pointer">
                  مکمل بقایا (Rs. {{ fmtMoney(selectedCustomer()!.remainingAmount) }})
                </button>
              </div>
            }

            <!-- Amount & Fine Inputs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-800 font-bold mb-1">وصول شدہ رقم (قسط) *</label>
                <input
                  formControlName="amount"
                  type="number"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num font-bold text-sm focus:border-emerald-500">
              </div>

              <div>
                <label class="block text-slate-800 font-bold mb-1">لیٹ قسط جرمانہ</label>
                <input
                  formControlName="fine"
                  type="number"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num font-semibold text-amber-700 focus:border-emerald-500">
              </div>
            </div>

            <!-- Date & Collector -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-800 font-semibold mb-1">تاریخ ادائیگی</label>
                <input
                  formControlName="payDate"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
              </div>

              <div>
                <label class="block text-slate-800 font-semibold mb-1">باکس کوڈ (Box Code)</label>
                <input
                  formControlName="boxCode"
                  type="text"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-800 font-semibold mb-1">وصول کنندہ / ریکوری آفیسر</label>
                <input
                  formControlName="collector"
                  type="text"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
              </div>
              <div>
                <label class="block text-slate-800 font-semibold mb-1">نوٹ / تفصیل</label>
                <input
                  formControlName="remarks"
                  type="text"
                  placeholder="اختیاری نوٹ"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
              </div>
            </div>

            <!-- Live Projected Calculation -->
            @if (selectedCustomer()) {
              <div class="bg-slate-100 p-3 rounded-xl flex justify-between items-center text-xs font-semibold">
                <span>اس وصولی کے بعد نیا بقایا:</span>
                <span class="font-num text-sm font-bold" [class.text-emerald-700]="projectedRemaining() === 0" [class.text-red-700]="projectedRemaining() > 0">
                  Rs. {{ fmtMoney(projectedRemaining()) }}
                  @if (projectedRemaining() === 0) {
                    <span class="text-[10px] text-emerald-800 block">(کھاتا مکمل ہو جائے گا!)</span>
                  }
                </span>
              </div>
            }

            <!-- Action Button -->
            <button
              type="submit"
              [disabled]="collectForm.invalid || !selectedCustomer() || (collectForm.get('amount')?.value ?? 0) <= 0"
              class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer">
              <mat-icon>print</mat-icon>
              <span>قسط وصول کریں اور رسید پرنٹ کریں</span>
            </button>

          </form>
        </div>

        <!-- ============================================================= -->
        <!-- LIST: RECEIPTS REGISTER (7 cols)                             -->
        <!-- ============================================================= -->
        <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          
          <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70">
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-600">receipt_long</mat-icon>
              <h2 class="font-bold text-slate-800 text-sm sm:text-base">وصولی رسیدات رجسٹر (Receipts History)</h2>
            </div>

            <!-- Search in receipts -->
            <div class="w-full sm:w-64">
              <input
                [formControl]="receiptSearchControl"
                type="text"
                placeholder="تلاش رسید، کارڈ، گاہک..."
                class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-emerald-500">
            </div>
          </div>

          <!-- Total in filtered register -->
          <div class="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>تعداد رسیدات: <span class="font-num text-slate-900 font-bold">{{ filteredReceipts().length }}</span></span>
            <span>کل وصول شدہ رقم: <span class="font-num text-emerald-700 font-bold text-sm">Rs. {{ fmtMoney(filteredReceiptsTotal()) }}</span></span>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-right text-xs">
              <thead class="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th class="p-2.5 pr-4">رسید نمبر</th>
                  <th class="p-2.5">کارڈ نمبر</th>
                  <th class="p-2.5">گاہک</th>
                  <th class="p-2.5">تاریخ</th>
                  <th class="p-2.5">مبلغ قسط</th>
                  <th class="p-2.5">نیا بقایا</th>
                  <th class="p-2.5">وصول کنندہ</th>
                  <th class="p-2.5 pl-4 text-center">پرنٹ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @if (filteredReceipts().length === 0) {
                  <tr>
                    <td colspan="8" class="p-8 text-center text-slate-400">
                      کوئی رسید نہیں ملی
                    </td>
                  </tr>
                } @else {
                  @for (r of filteredReceipts(); track r.id) {
                    <tr class="hover:bg-slate-50 transition-colors">
                      <td class="p-2.5 pr-4 font-num font-bold text-slate-900">{{ r.receiptNo }}</td>
                      <td class="p-2.5 font-num font-semibold text-slate-700">{{ r.cardNo }}</td>
                      <td class="p-2.5 font-bold text-slate-900">{{ r.customerName }}</td>
                      <td class="p-2.5 font-num text-slate-600">{{ fmtDate(r.payDate) }}</td>
                      <td class="p-2.5 font-num font-bold text-emerald-700">
                        Rs. {{ fmtMoney(r.amount) }}
                        @if (r.fine > 0) {
                          <span class="text-[10px] text-amber-600 block">(+{{ r.fine }} جرمانہ)</span>
                        }
                      </td>
                      <td class="p-2.5 font-num font-semibold text-slate-800">Rs. {{ fmtMoney(r.balanceAfter) }}</td>
                      <td class="p-2.5 text-slate-600">{{ r.collector || '—' }}</td>
                      <td class="p-2.5 pl-4 text-center">
                        <button
                          (click)="printReceipt.emit(r)"
                          class="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="رسید پرنٹ کریں">
                          <mat-icon class="text-base">print</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  `,
})
export class Collection {
  readonly store = inject(DataStore);

  readonly initialCustomer = input<Customer | null>(null);
  readonly printReceipt = output<Receipt>();

  receiptSearchControl = new FormControl('');

  collectForm = new FormGroup({
    customerId: new FormControl<number | ''>('', [Validators.required]),
    amount: new FormControl(0, [Validators.required, Validators.min(1)]),
    fine: new FormControl(0),
    payDate: new FormControl(todayStr(), [Validators.required]),
    collector: new FormControl(''),
    boxCode: new FormControl('U-01'),
    remarks: new FormControl(''),
  });

  selectedCustomerId = signal<number | null>(null);

  selectedCustomer = computed(() => {
    const id = this.selectedCustomerId();
    if (!id) return null;
    return this.store.getCustomer(id) || null;
  });

  activeCustomers = computed(() => {
    return this.store.customers().filter((c) => c.status !== 'closed' && c.remainingAmount > 0);
  });

  detectedLateFine = computed(() => {
    const c = this.selectedCustomer();
    if (!c) return 0;
    const payDate = this.collectForm.get('payDate')?.value || todayStr();
    return calcLateFine(c, payDate, this.store.settings().lateFine || 300);
  });

  projectedRemaining = computed(() => {
    const c = this.selectedCustomer();
    if (!c) return 0;
    const amt = toFloat(this.collectForm.get('amount')?.value, 0);
    return Math.max(0, Math.round(c.remainingAmount - amt));
  });

  filteredReceipts = computed(() => {
    let list = this.store.receipts();
    const query = (this.receiptSearchControl.value || '').trim().toLowerCase();
    if (query) {
      list = list.filter((r) => {
        return (
          r.receiptNo.toLowerCase().includes(query) ||
          r.cardNo.toLowerCase().includes(query) ||
          r.customerName.toLowerCase().includes(query) ||
          (r.collector && r.collector.toLowerCase().includes(query))
        );
      });
    }
    return list;
  });

  filteredReceiptsTotal = computed(() => {
    return this.filteredReceipts().reduce((sum, r) => sum + (r.amount || 0) + (r.fine || 0), 0);
  });

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;

  constructor() {
    effect(() => {
      const init = this.initialCustomer();
      if (init) {
        this.selectCustomer(init);
      }
    });
  }

  selectCustomer(c: Customer) {
    this.selectedCustomerId.set(c.id);
    const fine = calcLateFine(c, todayStr(), this.store.settings().lateFine || 300);
    const amount = Math.min(c.monthlyInstallment, c.remainingAmount);

    this.collectForm.patchValue({
      customerId: c.id,
      amount: amount,
      fine: fine,
      payDate: todayStr(),
      collector: this.store.currentUser().fullName || 'فیلڈ ریکوری افسر',
      boxCode: 'U-01',
      remarks: 'قسط وصولی',
    });
  }

  onCustomerSelected() {
    const val = this.collectForm.get('customerId')?.value;
    if (!val) {
      this.selectedCustomerId.set(null);
      return;
    }
    const c = this.store.getCustomer(Number(val));
    if (c) {
      this.selectCustomer(c);
    }
  }

  setAmount(amt: number) {
    const c = this.selectedCustomer();
    if (!c) return;
    const finalAmt = Math.min(amt, c.remainingAmount);
    this.collectForm.patchValue({ amount: finalAmt });
  }

  onSubmitCollection() {
    if (this.collectForm.invalid) return;
    const val = this.collectForm.value;
    const customerId = Number(val.customerId);
    if (!customerId) return;

    try {
      const receipt = this.store.collectInstallment({
        customerId,
        amount: toFloat(val.amount, 0),
        fine: toFloat(val.fine, 0),
        payDate: val.payDate || todayStr(),
        collector: val.collector || this.store.currentUser().fullName,
        boxCode: val.boxCode || 'U-01',
        remarks: val.remarks || '',
      });

      // Clear selection or update
      const updatedCustomer = this.store.getCustomer(customerId);
      if (updatedCustomer && updatedCustomer.remainingAmount > 0) {
        this.selectCustomer(updatedCustomer);
      } else {
        this.selectedCustomerId.set(null);
        this.collectForm.reset({
          customerId: '',
          amount: 0,
          fine: 0,
          payDate: todayStr(),
          collector: '',
          boxCode: 'U-01',
          remarks: '',
        });
      }

      // Automatically open receipt print dialog!
      this.printReceipt.emit(receipt);
    } catch (err: any) {
      alert(err.message || 'وصولی محفوظ کرنے میں خرابی ہوئی');
    }
  }
}
