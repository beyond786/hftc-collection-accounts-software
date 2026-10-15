import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from '../services/data-store';
import { Customer, CustomerStatus, Installment } from '../models/types';
import { fmtMoney, fmtDate, todayStr, toFloat, toInt, formatNic, cleanNic } from '../utils/accounting';

@Component({
  selector: 'app-customers',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold font-nastaliq text-slate-900">کھاتے و گاہک (Customers &amp; Accounts)</h1>
          <p class="text-xs text-slate-500 mt-0.5">اقرار نامہ رجسٹریشن، کھاتا کارڈ، بقایا حساب اور گاہک تفصیلات</p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            (click)="openNewCustomerModal()"
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95 cursor-pointer">
            <mat-icon class="text-lg">person_add</mat-icon>
            <span>نیا کھاتا (اقرار نامہ)</span>
          </button>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Search box -->
        <div class="relative">
          <span class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
            <mat-icon class="text-lg">search</mat-icon>
          </span>
          <input
            [formControl]="searchControl"
            type="text"
            placeholder="تلاش: نام، کارڈ، فون، شناختی کارڈ..."
            class="w-full pr-9 pl-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
        </div>

        <!-- Status Filter -->
        <div>
          <select
            [formControl]="statusControl"
            class="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
            <option value="">تمام حالتیں (All Status)</option>
            <option value="active">فعال کھاتے (Active)</option>
            <option value="closed">مکمل ادا شدہ (Closed)</option>
            <option value="defaulter">ڈیفالٹر / لیٹ (Defaulter)</option>
          </select>
        </div>

        <!-- Office Filter -->
        <div>
          <select
            [formControl]="officeControl"
            class="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
            <option value="">تمام دفاتر / برانچیں</option>
            @for (off of store.offices(); track off.id) {
              <option [value]="off.id">{{ off.name }}</option>
            }
          </select>
        </div>

        <!-- Summary badge -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>نتائج: <span class="font-num text-emerald-700 font-bold">{{ filteredCustomers().length }}</span> گاہک</span>
          <span>بقایا: <span class="font-num text-red-600 font-bold">Rs. {{ fmtMoney(filteredReceivable()) }}</span></span>
        </div>
      </div>

      <!-- Customers Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th class="p-3 pr-4">کارڈ نمبر</th>
                <th class="p-3">نام و ولدیت</th>
                <th class="p-3">نام اشیاء / ماڈل</th>
                <th class="p-3">فون و این آئی سی</th>
                <th class="p-3">کل رقم</th>
                <th class="p-3">ادا شدہ</th>
                <th class="p-3">بقایا رقم</th>
                <th class="p-3">تاریخ قسط</th>
                <th class="p-3 text-center">حالت</th>
                <th class="p-3 pl-4 text-center">کارروائی</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (filteredCustomers().length === 0) {
                <tr>
                  <td colspan="10" class="p-8 text-center text-slate-400">
                    کوئی کھاتا نہیں ملا۔ نیا کھاتا درج کرنے کے لیے اوپر دیا گیا بٹن دبائیں۔
                  </td>
                </tr>
              } @else {
                @for (c of filteredCustomers(); track c.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="p-3 pr-4 font-num font-bold text-slate-900">{{ c.cardNo }}</td>
                    <td class="p-3">
                      <div class="font-bold text-slate-900 text-sm">{{ c.name }}</div>
                      <div class="text-[11px] text-slate-500">ولد {{ c.fatherName || '—' }} ({{ c.caste || '—' }})</div>
                    </td>
                    <td class="p-3">
                      <div class="font-semibold text-slate-800">{{ c.itemName }}</div>
                      <div class="text-[10px] text-slate-400 font-mono">{{ c.model }}</div>
                    </td>
                    <td class="p-3 font-num">
                      <div class="font-bold text-slate-700">{{ c.phone }}</div>
                      <div class="text-[10px] text-slate-400">{{ formatNic(c.nicNo) }}</div>
                    </td>
                    <td class="p-3 font-num font-semibold text-slate-700">Rs. {{ fmtMoney(c.totalAmount) }}</td>
                    <td class="p-3 font-num text-emerald-700 font-semibold">Rs. {{ fmtMoney(store.getCustomerTotalPaid(c.id)) }}</td>
                    <td class="p-3 font-num font-bold" [class.text-red-600]="c.remainingAmount > 0" [class.text-slate-400]="c.remainingAmount === 0">
                      Rs. {{ fmtMoney(c.remainingAmount) }}
                    </td>
                    <td class="p-3 font-num text-slate-700">
                      ہر ماہ کی <span class="font-bold">{{ c.dueDay }}</span> تاریخ
                    </td>
                    <td class="p-3 text-center">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        [class.bg-emerald-100]="c.status === 'closed'"
                        [class.text-emerald-800]="c.status === 'closed'"
                        [class.bg-blue-100]="c.status === 'active'"
                        [class.text-blue-800]="c.status === 'active'"
                        [class.bg-red-100]="c.status === 'defaulter'"
                        [class.text-red-800]="c.status === 'defaulter'">
                        {{ c.status === 'closed' ? 'مکمل ادا شدہ' : c.status === 'active' ? 'فعال' : 'ڈیفالٹر' }}
                      </span>
                    </td>
                    <td class="p-3 pl-4 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <!-- View Ledger -->
                        <button
                          (click)="openCustomerDetail(c)"
                          class="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="کھاتا کارڈ و تفصیل">
                          <mat-icon class="text-base">credit_card</mat-icon>
                        </button>
                        <!-- Collect Installment -->
                        <button
                          (click)="collectForCustomer(c)"
                          class="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="قسط وصول کریں">
                          <mat-icon class="text-base">payments</mat-icon>
                        </button>
                        <!-- Print Agreement -->
                        <button
                          (click)="printAgreement.emit(c)"
                          class="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="اقرار نامہ پرنٹ">
                          <mat-icon class="text-base">description</mat-icon>
                        </button>
                        <!-- Edit -->
                        <button
                          (click)="editCustomer(c)"
                          class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="ترمیم">
                          <mat-icon class="text-base">edit</mat-icon>
                        </button>
                        <!-- Delete -->
                        <button
                          (click)="confirmDelete(c)"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          title="حذف کریں">
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- MODAL: NEW / EDIT CUSTOMER (اقرار نامہ فارم)                  -->
      <!-- ============================================================= -->
      @if (showFormModal()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
            
            <!-- Header -->
            <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-400">{{ editingId() ? 'edit' : 'assignment' }}</mat-icon>
                <h3 class="font-bold text-base font-nastaliq">
                  {{ editingId() ? 'ترمیم کھاتا — کارڈ ' + customerForm.get('cardNo')?.value : 'نیا کھاتا رجسٹریشن (اقرار نامہ فارم)' }}
                </h3>
              </div>
              <button (click)="closeFormModal()" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Form Content -->
            <form [formGroup]="customerForm" (ngSubmit)="onSubmitCustomer()" class="overflow-y-auto p-5 sm:p-7 space-y-6 flex-1 text-right text-xs">
              
              <!-- Section 1: Customer Identity -->
              <div>
                <div class="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3 font-bold text-sm text-slate-900">
                  <mat-icon class="text-emerald-600 text-lg">person</mat-icon>
                  <span>1. گاہک / درخواست دہندہ کی تفصیل</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">کارڈ نمبر *</label>
                    <input formControlName="cardNo" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num font-bold focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">نام خریدار *</label>
                    <input formControlName="name" type="text" placeholder="مکمل نام" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">ولدیت</label>
                    <input formControlName="fatherName" type="text" placeholder="والد کا نام" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">قوم / ذات</label>
                    <input formControlName="caste" type="text" placeholder="قوم" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">عمر (سال)</label>
                    <input formControlName="age" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">موبائل فون نمبر *</label>
                    <input formControlName="phone" type="text" placeholder="0300-1234567" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">این آئی سی نمبر (13 ہندسے)</label>
                    <input formControlName="nicNo" type="text" placeholder="42201-1234567-1" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">پتہ مستقل *</label>
                    <input formControlName="permanentAddress" type="text" placeholder="مکمل مستقل پتہ مع گاؤں/تحصیل" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">پتہ موجودہ</label>
                    <input formControlName="presentAddress" type="text" placeholder="موجودہ رہائش" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">کام یا ملازمت کا پتہ</label>
                    <input formControlName="workAddress" type="text" placeholder="دکان، آفس یا محکمہ" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                </div>
              </div>

              <!-- Section 2: Deal / Items & Financial Terms -->
              <div>
                <div class="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3 font-bold text-sm text-slate-900">
                  <mat-icon class="text-indigo-600 text-lg">shopping_cart</mat-icon>
                  <span>2. اشیاء، قسط اور رقوم کی تفصیل</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">اشیاء منتخب کریں</label>
                    <select
                      (change)="onSelectItem($event)"
                      class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                      <option value="">دستی نام درج کریں</option>
                      @for (itm of store.items(); track itm.id) {
                        <option [value]="itm.id">{{ itm.name }} ({{ itm.model }}) — سٹاک: {{ itm.qtyInStock }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">نام اشیاء *</label>
                    <input formControlName="itemName" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">ماڈل</label>
                    <input formControlName="model" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">تاریخ جمع (شروع)</label>
                    <input formControlName="dateJoined" type="text" placeholder="DD-MM-YYYY" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">کل رقم *</label>
                    <input formControlName="totalAmount" type="number" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-num font-bold text-slate-900 focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">ایڈوانس رقم</label>
                    <input formControlName="advance" type="number" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-num font-bold text-emerald-700 focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">ماہانہ قسط *</label>
                    <input formControlName="monthlyInstallment" type="number" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-num font-bold text-slate-900 focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-bold mb-1">تاریخ قسط ادائیگی (1 تا 31)</label>
                    <input formControlName="dueDay" type="number" min="1" max="31" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-num font-bold text-slate-900 focus:border-emerald-500">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">کیش ریٹ</label>
                    <input formControlName="cashRate" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">ہارڈ کیش ریٹ</label>
                    <input formControlName="hardCashRate" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">افتتاحی رسید نمبر (اگر ایڈوانس ہے)</label>
                    <input formControlName="openingReceiptNo" type="text" placeholder="R000..." class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                </div>
              </div>

              <!-- Section 3: Guarantor (ضامن کی تفصیل) -->
              <div>
                <div class="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3 font-bold text-sm text-slate-900">
                  <mat-icon class="text-amber-600 text-lg">verified_user</mat-icon>
                  <span>3. ضامن کی تفصیل (Guarantor)</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">نام ضامنی</label>
                    <input formControlName="gName" type="text" placeholder="ضامن کا نام" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">ولدیت</label>
                    <input formControlName="gFatherName" type="text" placeholder="والد کا نام" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">قوم</label>
                    <input formControlName="gCaste" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">درخواست دہندہ سے تعلق / مراسم</label>
                    <input formControlName="gRelation" type="text" placeholder="مثلاً: بھائی، کزن، دوست" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">ضامن فون نمبر 1</label>
                    <input formControlName="gPhone1" type="text" placeholder="0300-..." class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">ضامن فون نمبر 2</label>
                    <input formControlName="gPhone2" type="text" placeholder="اختیاری فون" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-slate-700 font-semibold mb-1">ضامن این آئی سی</label>
                    <input formControlName="gNicNo" type="text" placeholder="13 ہندسے" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num focus:border-emerald-500">
                  </div>
                </div>

                <div class="mt-3">
                  <label class="block text-slate-700 font-semibold mb-1">ضامن مستقل پتہ</label>
                  <input formControlName="gPermanentAddress" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                </div>
              </div>

              <!-- Office / Status -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">برانچ / دفتر</label>
                  <select formControlName="officeId" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                    @for (off of store.offices(); track off.id) {
                      <option [value]="off.id">{{ off.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">حالت کھاتہ</label>
                  <select formControlName="status" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500">
                    <option value="active">فعال (Active)</option>
                    <option value="closed">مکمل ادا شدہ (Closed)</option>
                    <option value="defaulter">ڈیفالٹر (Defaulter)</option>
                  </select>
                </div>
              </div>

              <!-- Footer Buttons -->
              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  (click)="closeFormModal()"
                  class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer">
                  منسوخ
                </button>
                <button
                  type="submit"
                  [disabled]="customerForm.invalid"
                  class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer">
                  {{ editingId() ? 'محفوظ کریں' : 'کھاتا درج کریں' }}
                </button>
              </div>

            </form>
          </div>
        </div>
      }

      <!-- ============================================================= -->
      <!-- MODAL: CUSTOMER DETAIL & 20-ROW LEDGER CARD PREVIEW           -->
      <!-- ============================================================= -->
      @if (selectedCustomer()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
            
            <!-- Header -->
            <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-400">badge</mat-icon>
                <div>
                  <h3 class="font-bold text-base font-nastaliq">
                    کھاتا تفصیل — {{ selectedCustomer()?.name }} (کارڈ: {{ selectedCustomer()?.cardNo }})
                  </h3>
                  <div class="text-[11px] text-slate-400">
                    {{ selectedCustomer()?.officeName }} &bull; فون: {{ selectedCustomer()?.phone }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  (click)="printAgreement.emit(selectedCustomer()!)"
                  class="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer">
                  <mat-icon class="text-sm">description</mat-icon>
                  <span>اقرار نامہ</span>
                </button>
                <button
                  (click)="printLedger.emit(selectedCustomer()!)"
                  class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer">
                  <mat-icon class="text-sm">print</mat-icon>
                  <span>پرنٹ کھاتا کارڈ</span>
                </button>
                <button (click)="selectedCustomer.set(null)" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Details Content -->
            <div class="overflow-y-auto p-5 sm:p-7 space-y-5 flex-1 text-right text-xs">
              
              <!-- Top Stat Cards -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div class="text-slate-500 text-[11px]">کل ڈیل رقم</div>
                  <div class="text-base font-bold font-num text-slate-900">Rs. {{ fmtMoney(selectedCustomer()?.totalAmount) }}</div>
                </div>
                <div>
                  <div class="text-slate-500 text-[11px]">کل ادا شدہ رقم</div>
                  <div class="text-base font-bold font-num text-emerald-700">Rs. {{ fmtMoney(store.getCustomerTotalPaid(selectedCustomer()!.id)) }}</div>
                </div>
                <div>
                  <div class="text-slate-500 text-[11px]">موجودہ بقایا</div>
                  <div class="text-base font-bold font-num text-red-600">Rs. {{ fmtMoney(selectedCustomer()?.remainingAmount) }}</div>
                </div>
                <div>
                  <div class="text-slate-500 text-[11px]">ماہانہ قسط / تاریخ</div>
                  <div class="text-base font-bold font-num text-slate-900">Rs. {{ fmtMoney(selectedCustomer()?.monthlyInstallment) }} ({{ selectedCustomer()?.dueDay }})</div>
                </div>
              </div>

              <!-- Customer info grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-slate-200 p-3 rounded-xl bg-white text-[11px]">
                <div><b>شناختی کارڈ:</b> <span class="font-num font-bold">{{ formatNic(selectedCustomer()?.nicNo) }}</span></div>
                <div><b>ولدیت:</b> {{ selectedCustomer()?.fatherName }}</div>
                <div><b>قوم:</b> {{ selectedCustomer()?.caste }}</div>
                <div class="sm:col-span-2"><b>پتہ مستقل:</b> {{ selectedCustomer()?.permanentAddress }}</div>
                <div><b>تاریخ شمولیت:</b> <span class="font-num">{{ fmtDate(selectedCustomer()?.dateJoined) }}</span></div>
                <div><b>اشیاء و ماڈل:</b> {{ selectedCustomer()?.itemName }} ({{ selectedCustomer()?.model }})</div>
                <div><b>ضامن:</b> {{ selectedCustomer()?.gName }} ({{ selectedCustomer()?.gRelation }})</div>
                <div><b>ضامن فون:</b> <span class="font-num">{{ selectedCustomer()?.gPhone1 }}</span></div>
              </div>

              <!-- 20-Row Ledger Card Entries Table -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <mat-icon class="text-emerald-600 text-lg">list_alt</mat-icon>
                    <span>کھاتا کارڈ درجیاں (Installment Ledger Entries)</span>
                  </div>
                  <button
                    (click)="collectForCustomer(selectedCustomer()!)"
                    class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-semibold text-xs flex items-center gap-1 cursor-pointer">
                    <mat-icon class="text-sm">payments</mat-icon>
                    <span>نئی قسط وصول کریں</span>
                  </button>
                </div>

                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <table class="w-full text-right text-xs">
                    <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                      <tr>
                        <th class="p-2 border-l border-slate-200 w-12">نمبر</th>
                        <th class="p-2 border-l border-slate-200">ماہ</th>
                        <th class="p-2 border-l border-slate-200">جمع شدہ</th>
                        <th class="p-2 border-l border-slate-200">بقایا رقم</th>
                        <th class="p-2 border-l border-slate-200">رسید نمبر</th>
                        <th class="p-2 border-l border-slate-200">تاریخ ادائیگی</th>
                        <th class="p-2 border-l border-slate-200">وصول کنندہ</th>
                        <th class="p-2">نوٹ / تفصیل</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-center">
                      @for (inst of store.getCustomerLedger(selectedCustomer()!.id); track inst.id) {
                        <tr class="hover:bg-slate-50">
                          <td class="p-2 border-l border-slate-100 font-num font-bold bg-slate-50">
                            {{ inst.srNo === 0 ? 'ADV' : inst.srNo }}
                          </td>
                          <td class="p-2 border-l border-slate-100 font-num">{{ inst.month }}</td>
                          <td class="p-2 border-l border-slate-100 font-num font-bold text-emerald-700">
                            Rs. {{ fmtMoney(inst.deposit) }}
                          </td>
                          <td class="p-2 border-l border-slate-100 font-num font-bold text-slate-800">
                            Rs. {{ fmtMoney(inst.balance) }}
                          </td>
                          <td class="p-2 border-l border-slate-100 font-num">{{ inst.receiptNo || '—' }}</td>
                          <td class="p-2 border-l border-slate-100 font-num">{{ fmtDate(inst.payDate) }}</td>
                          <td class="p-2 border-l border-slate-100">{{ inst.collector || '—' }}</td>
                          <td class="p-2 text-right text-slate-500">{{ inst.remarks || '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        </div>
      }

    </div>
  `,
})
export class Customers {
  readonly store = inject(DataStore);

  readonly printReceipt = output<any>();
  readonly printAgreement = output<Customer>();
  readonly printLedger = output<Customer>();
  readonly navigateTo = output<string>();
  readonly selectCustomerForCollection = output<Customer>();

  searchControl = new FormControl('');
  statusControl = new FormControl('');
  officeControl = new FormControl('');

  showFormModal = signal<boolean>(false);
  editingId = signal<number | null>(null);
  selectedCustomer = signal<Customer | null>(null);

  customerForm = new FormGroup({
    cardNo: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    fatherName: new FormControl(''),
    caste: new FormControl(''),
    age: new FormControl(30),
    phone: new FormControl('', [Validators.required]),
    nicNo: new FormControl(''),
    permanentAddress: new FormControl('', [Validators.required]),
    presentAddress: new FormControl(''),
    workAddress: new FormControl(''),
    itemId: new FormControl<number | null>(null),
    itemName: new FormControl('', [Validators.required]),
    model: new FormControl(''),
    dateJoined: new FormControl(todayStr()),
    totalAmount: new FormControl(0, [Validators.required, Validators.min(1)]),
    advance: new FormControl(0),
    monthlyInstallment: new FormControl(0, [Validators.required, Validators.min(1)]),
    dueDay: new FormControl(10, [Validators.required, Validators.min(1), Validators.max(31)]),
    cashRate: new FormControl(0),
    hardCashRate: new FormControl(0),
    openingReceiptNo: new FormControl(''),
    gName: new FormControl(''),
    gFatherName: new FormControl(''),
    gCaste: new FormControl(''),
    gPermanentAddress: new FormControl(''),
    gPresentAddress: new FormControl(''),
    gPhone1: new FormControl(''),
    gPhone2: new FormControl(''),
    gRelation: new FormControl(''),
    gNicNo: new FormControl(''),
    officeId: new FormControl<number>(1),
    status: new FormControl<CustomerStatus>('active'),
    remarks: new FormControl(''),
  });

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;
  formatNic = formatNic;

  filteredCustomers = computed(() => {
    let list = this.store.customers();
    const search = (this.searchControl.value || '').trim().toLowerCase();
    const status = this.statusControl.value;
    const office = this.officeControl.value;

    if (search) {
      list = list.filter((c) => {
        return (
          c.name.toLowerCase().includes(search) ||
          c.cardNo.toLowerCase().includes(search) ||
          c.phone.toLowerCase().includes(search) ||
          cleanNic(c.nicNo).includes(cleanNic(search)) ||
          c.itemName.toLowerCase().includes(search)
        );
      });
    }

    if (status) {
      list = list.filter((c) => c.status === status);
    }

    if (office) {
      const oid = parseInt(office, 10);
      list = list.filter((c) => c.officeId === oid);
    }

    return list;
  });

  filteredReceivable = computed(() => {
    return this.filteredCustomers()
      .filter((c) => c.status !== 'closed')
      .reduce((sum, c) => sum + (c.remainingAmount || 0), 0);
  });

  openNewCustomerModal() {
    this.editingId.set(null);
    this.customerForm.reset({
      cardNo: this.store.nextCardNo(),
      name: '',
      fatherName: '',
      caste: '',
      age: 32,
      phone: '',
      nicNo: '',
      permanentAddress: '',
      presentAddress: '',
      workAddress: '',
      itemId: null,
      itemName: '',
      model: '',
      dateJoined: todayStr(),
      totalAmount: 15000,
      advance: 1500,
      monthlyInstallment: 1500,
      dueDay: 10,
      cashRate: 1500,
      hardCashRate: 1500,
      openingReceiptNo: '',
      gName: '',
      gFatherName: '',
      gCaste: '',
      gPermanentAddress: '',
      gPresentAddress: '',
      gPhone1: '',
      gPhone2: '',
      gRelation: '',
      gNicNo: '',
      officeId: 1,
      status: 'active',
      remarks: '',
    });
    this.showFormModal.set(true);
  }

  editCustomer(c: Customer) {
    this.editingId.set(c.id);
    this.customerForm.patchValue({
      cardNo: c.cardNo,
      name: c.name,
      fatherName: c.fatherName,
      caste: c.caste,
      age: c.age,
      phone: c.phone,
      nicNo: c.nicNo,
      permanentAddress: c.permanentAddress,
      presentAddress: c.presentAddress,
      workAddress: c.workAddress,
      itemId: c.itemId || null,
      itemName: c.itemName,
      model: c.model,
      dateJoined: c.dateJoined,
      totalAmount: c.totalAmount,
      advance: c.advance,
      monthlyInstallment: c.monthlyInstallment,
      dueDay: c.dueDay,
      cashRate: c.cashRate,
      hardCashRate: c.hardCashRate,
      openingReceiptNo: c.openingReceiptNo,
      gName: c.gName,
      gFatherName: c.gFatherName,
      gCaste: c.gCaste,
      gPermanentAddress: c.gPermanentAddress,
      gPresentAddress: c.gPresentAddress,
      gPhone1: c.gPhone1,
      gPhone2: c.gPhone2,
      gRelation: c.gRelation,
      gNicNo: c.gNicNo,
      officeId: c.officeId || 1,
      status: c.status,
      remarks: c.remarks || '',
    });
    this.showFormModal.set(true);
  }

  onSelectItem(event: Event) {
    const target = event.target as HTMLSelectElement;
    const itemId = parseInt(target.value, 10);
    if (!itemId) return;
    const item = this.store.items().find((i) => i.id === itemId);
    if (item) {
      this.customerForm.patchValue({
        itemId: item.id,
        itemName: item.name,
        model: item.model,
        totalAmount: item.salePrice,
        cashRate: item.cashRate,
        hardCashRate: item.hardCashRate,
        monthlyInstallment: item.cashRate || Math.round(item.salePrice / 12),
      });
    }
  }

  onSubmitCustomer() {
    if (this.customerForm.invalid) return;
    const val = this.customerForm.value;
    const off = this.store.offices().find((o) => o.id === val.officeId);

    const saved = this.store.saveCustomer({
      id: this.editingId() || undefined,
      cardNo: val.cardNo!,
      name: val.name!,
      fatherName: val.fatherName || '',
      caste: val.caste || '',
      age: toInt(val.age, 30),
      phone: val.phone!,
      nicNo: val.nicNo || '',
      permanentAddress: val.permanentAddress!,
      presentAddress: val.presentAddress || '',
      workAddress: val.workAddress || '',
      itemId: val.itemId || undefined,
      itemName: val.itemName!,
      model: val.model || '',
      dateJoined: val.dateJoined || todayStr(),
      totalAmount: toFloat(val.totalAmount, 0),
      advance: toFloat(val.advance, 0),
      monthlyInstallment: toFloat(val.monthlyInstallment, 0),
      dueDay: toInt(val.dueDay, 10),
      cashRate: toFloat(val.cashRate, 0),
      hardCashRate: toFloat(val.hardCashRate, 0),
      openingReceiptNo: val.openingReceiptNo || '',
      gName: val.gName || '',
      gFatherName: val.gFatherName || '',
      gCaste: val.gCaste || '',
      gPermanentAddress: val.gPermanentAddress || '',
      gPresentAddress: val.gPresentAddress || '',
      gPhone1: val.gPhone1 || '',
      gPhone2: val.gPhone2 || '',
      gRelation: val.gRelation || '',
      gNicNo: val.gNicNo || '',
      officeId: val.officeId || 1,
      officeName: off ? off.name : 'آفس میر پور ماتھیلو',
      status: val.status || 'active',
      remarks: val.remarks || '',
    });

    this.showFormModal.set(false);
    // If newly created, prompt user to view details or print agreement
    this.selectedCustomer.set(saved);
  }

  openCustomerDetail(c: Customer) {
    this.selectedCustomer.set(c);
  }

  collectForCustomer(c: Customer) {
    this.selectCustomerForCollection.emit(c);
    this.selectedCustomer.set(null);
    this.navigateTo.emit('collection');
  }

  confirmDelete(c: Customer) {
    if (confirm(`کیا آپ واقعی کھاتا نمبر ${c.cardNo} (${c.name}) کو حذف کرنا چاہتے ہیں؟`)) {
      this.store.deleteCustomer(c.id);
      if (this.selectedCustomer()?.id === c.id) {
        this.selectedCustomer.set(null);
      }
    }
  }

  closeFormModal() {
    this.showFormModal.set(false);
  }
}
