import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from '../services/data-store';
import { Item, StockMovement, StockMoveType } from '../models/types';
import { fmtMoney, fmtDate, todayStr, toFloat, toInt } from '../utils/accounting';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold font-nastaliq text-slate-900">اسٹاک و اشیاء (Stock &amp; Inventory Master)</h1>
          <p class="text-xs text-slate-500 mt-0.5">اشیاء ماسٹر، خریداری و فروخت اسٹاک لین دین، کم اسٹاک الرٹس اور اسٹاک مالیت</p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            (click)="openMovementModal()"
            class="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer">
            <mat-icon class="text-base">swap_horiz</mat-icon>
            <span>اسٹاک انٹری / نقل و حرکت</span>
          </button>

          <button
            (click)="openNewItemModal()"
            class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer">
            <mat-icon class="text-lg">add_box</mat-icon>
            <span>نئی شے شامل کریں</span>
          </button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">کل رجسٹرڈ اشیاء</div>
            <div class="text-2xl font-bold text-slate-900 font-num">{{ store.items().length }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <mat-icon>category</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">اسٹاک کی کل مالیت (خریداری ریٹ پر)</div>
            <div class="text-2xl font-bold text-emerald-700 font-num">Rs. {{ fmtMoney(store.stockValue()) }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <mat-icon>payments</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500 font-semibold mb-1">کم اسٹاک تنبیہ (Low Stock)</div>
            <div class="text-2xl font-bold font-num" [class.text-rose-600]="store.lowStockItems().length > 0" [class.text-slate-900]="store.lowStockItems().length === 0">
              {{ store.lowStockItems().length }} اشیاء
            </div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <mat-icon>warning</mat-icon>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs: Items Master vs Movement Log -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            (click)="activeTab.set('items')"
            class="px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2"
            [class.border-emerald-600]="activeTab() === 'items'"
            [class.bg-white]="activeTab() === 'items'"
            [class.text-emerald-800]="activeTab() === 'items'"
            [class.border-transparent]="activeTab() !== 'items'"
            [class.text-slate-600]="activeTab() !== 'items'">
            <mat-icon class="text-base">inventory_2</mat-icon>
            <span>اشیاء ماسٹر لسٹ ({{ store.items().length }})</span>
          </button>

          <button
            (click)="activeTab.set('movements')"
            class="px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2"
            [class.border-emerald-600]="activeTab() === 'movements'"
            [class.bg-white]="activeTab() === 'movements'"
            [class.text-emerald-800]="activeTab() === 'movements'"
            [class.border-transparent]="activeTab() !== 'movements'"
            [class.text-slate-600]="activeTab() !== 'movements'">
            <mat-icon class="text-base">history</mat-icon>
            <span>اسٹاک نقل و حرکت تاریخچہ ({{ store.stockMovements().length }})</span>
          </button>
        </div>

        <!-- 1. TAB: ITEMS MASTER -->
        @if (activeTab() === 'items') {
          <div class="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div class="w-full sm:w-80">
              <input
                [formControl]="searchControl"
                type="text"
                placeholder="تلاش شے: نام، کوڈ، ماڈل..."
                class="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-emerald-500">
            </div>
            <div class="text-xs text-slate-500">
              کل اشیاء: <span class="font-bold text-slate-800">{{ filteredItems().length }}</span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-right text-xs">
              <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th class="p-3 pr-4">کوڈ</th>
                  <th class="p-3">نام اشیاء</th>
                  <th class="p-3">ماڈل / تفصیل</th>
                  <th class="p-3">کیٹیگری</th>
                  <th class="p-3">خریداری قیمت</th>
                  <th class="p-3">فروخت قیمت</th>
                  <th class="p-3">کیش ریٹ</th>
                  <th class="p-3 text-center">موجودہ اسٹاک</th>
                  <th class="p-3 text-center">ری آرڈر لیول</th>
                  <th class="p-3 pl-4 text-center">کارروائی</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of filteredItems(); track item.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="p-3 pr-4 font-num font-bold text-slate-700">{{ item.code }}</td>
                    <td class="p-3 font-bold text-slate-900 text-sm">{{ item.name }}</td>
                    <td class="p-3 text-slate-600 font-mono">{{ item.model || '—' }}</td>
                    <td class="p-3"><span class="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{{ item.category }}</span></td>
                    <td class="p-3 font-num font-semibold text-slate-700">Rs. {{ fmtMoney(item.purchasePrice) }}</td>
                    <td class="p-3 font-num font-bold text-emerald-800">Rs. {{ fmtMoney(item.salePrice) }}</td>
                    <td class="p-3 font-num text-slate-700">Rs. {{ fmtMoney(item.cashRate) }}</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex items-center gap-1 font-num font-bold px-2 py-0.5 rounded-full text-xs"
                        [class.bg-rose-100]="item.qtyInStock <= item.reorderLevel"
                        [class.text-rose-800]="item.qtyInStock <= item.reorderLevel"
                        [class.bg-emerald-100]="item.qtyInStock > item.reorderLevel"
                        [class.text-emerald-800]="item.qtyInStock > item.reorderLevel">
                        {{ item.qtyInStock }} {{ item.unit }}
                        @if (item.qtyInStock <= item.reorderLevel) {
                          <mat-icon class="text-xs">warning</mat-icon>
                        }
                      </span>
                    </td>
                    <td class="p-3 text-center font-num text-slate-500">{{ item.reorderLevel }}</td>
                    <td class="p-3 pl-4 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <button
                          (click)="openMovementForItem(item)"
                          class="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="اسٹاک اضافہ / اخراج">
                          <mat-icon class="text-base">add_shopping_cart</mat-icon>
                        </button>
                        <button
                          (click)="editItem(item)"
                          class="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="ترمیم">
                          <mat-icon class="text-base">edit</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- 2. TAB: MOVEMENTS LOG -->
        @if (activeTab() === 'movements') {
          <div class="overflow-x-auto">
            <table class="w-full text-right text-xs">
              <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th class="p-3 pr-4">تاریخ</th>
                  <th class="p-3">نام اشیاء</th>
                  <th class="p-3 text-center">نوعیت لین دین</th>
                  <th class="p-3 text-center">مقدار</th>
                  <th class="p-3">ریٹ</th>
                  <th class="p-3">کل رقم</th>
                  <th class="p-3">پارٹی / سپلائر / گاہک</th>
                  <th class="p-3 pl-4">نوٹ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @if (store.stockMovements().length === 0) {
                  <tr>
                    <td colspan="8" class="p-8 text-center text-slate-400">کوئی اسٹاک موومنٹ درج نہیں ہے</td>
                  </tr>
                } @else {
                  @for (m of store.stockMovements(); track m.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="p-3 pr-4 font-num text-slate-600">{{ fmtDate(m.moveDate) }}</td>
                      <td class="p-3 font-bold text-slate-900">{{ m.itemName }}</td>
                      <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded text-[10.5px] font-semibold"
                          [class.bg-emerald-100]="m.moveType === 'purchase'"
                          [class.text-emerald-800]="m.moveType === 'purchase'"
                          [class.bg-blue-100]="m.moveType === 'sale'"
                          [class.text-blue-800]="m.moveType === 'sale'"
                          [class.bg-purple-100]="m.moveType === 'return'"
                          [class.text-purple-800]="m.moveType === 'return'"
                          [class.bg-amber-100]="m.moveType === 'adjust'"
                          [class.text-amber-800]="m.moveType === 'adjust'">
                          {{ getMoveTypeLabel(m.moveType) }}
                        </span>
                      </td>
                      <td class="p-3 text-center font-num font-bold text-slate-800">
                        {{ m.moveType === 'purchase' || m.moveType === 'return' ? '+' : '-' }}{{ m.qty }}
                      </td>
                      <td class="p-3 font-num text-slate-700">Rs. {{ fmtMoney(m.rate) }}</td>
                      <td class="p-3 font-num font-bold text-emerald-800">Rs. {{ fmtMoney(m.amount) }}</td>
                      <td class="p-3 text-slate-700">{{ m.party || '—' }}</td>
                      <td class="p-3 pl-4 text-slate-500">{{ m.remarks || '—' }}</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }

      </div>

      <!-- ============================================================= -->
      <!-- MODAL: ADD / EDIT ITEM                                        -->
      <!-- ============================================================= -->
      @if (showItemModal()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden">
            <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 class="font-bold text-base font-nastaliq">
                {{ editingItemId() ? 'ترمیم شے' : 'نئی شے شامل کریں' }}
              </h3>
              <button (click)="showItemModal.set(false)" class="text-slate-400 hover:text-white p-1 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="itemForm" (ngSubmit)="onSubmitItem()" class="p-6 space-y-4 text-right text-xs">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 font-bold mb-1">کوڈ *</label>
                  <input formControlName="code" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
                </div>
                <div>
                  <label class="block text-slate-700 font-bold mb-1">نام اشیاء *</label>
                  <input formControlName="name" type="text" placeholder="مثلاً: ACDC پنکھا" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">ماڈل / سائز</label>
                  <input formControlName="model" type="text" placeholder="ACDC-1" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">کیٹیگری</label>
                  <input formControlName="category" type="text" placeholder="الیکٹرانکس" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">یونٹ</label>
                  <input formControlName="unit" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-slate-700 font-bold mb-1">خریداری قیمت (لاگت)</label>
                  <input formControlName="purchasePrice" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
                </div>
                <div>
                  <label class="block text-slate-700 font-bold mb-1">فروخت قیمت (قسط ڈیل)</label>
                  <input formControlName="salePrice" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num font-bold">
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">کیش ریٹ</label>
                  <input formControlName="cashRate" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 font-bold mb-1">موجودہ اسٹاک تعداد</label>
                  <input formControlName="qtyInStock" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num font-bold text-slate-900">
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">کم از کم ری آرڈر لیول</label>
                  <input formControlName="reorderLevel" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button type="button" (click)="showItemModal.set(false)" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer">منسوخ</button>
                <button type="submit" [disabled]="itemForm.invalid" class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">محفوظ کریں</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ============================================================= -->
      <!-- MODAL: STOCK MOVEMENT                                         -->
      <!-- ============================================================= -->
      @if (showMovementModal()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden">
            <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 class="font-bold text-base font-nastaliq">اسٹاک انٹری / نقل و حرکت اندراج</h3>
              <button (click)="showMovementModal.set(false)" class="text-slate-400 hover:text-white p-1 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="movementForm" (ngSubmit)="onSubmitMovement()" class="p-6 space-y-4 text-right text-xs">
              <div>
                <label class="block text-slate-700 font-bold mb-1">شے منتخب کریں *</label>
                <select formControlName="itemId" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                  @for (i of store.items(); track i.id) {
                    <option [value]="i.id">{{ i.name }} ({{ i.model }}) — موجودہ اسٹاک: {{ i.qtyInStock }} {{ i.unit }}</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 font-bold mb-1">نوعیت لین دین *</label>
                  <select formControlName="moveType" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="purchase">خریداری (Purchase / اسٹاک آمد)</option>
                    <option value="sale">فروخت (Sale / گاہک کو ترسیل)</option>
                    <option value="return">گاہک واپسی (Return)</option>
                    <option value="adjust">ایڈجسٹمنٹ / درستگی (Adjustment)</option>
                    <option value="damage">ڈیمج / خرابی (Damage)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-slate-700 font-bold mb-1">مقدار (تعداد) *</label>
                  <input formControlName="qty" type="number" min="1" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num font-bold">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 font-bold mb-1">ریٹ فی عدد (خریداری / لاگت)</label>
                  <input formControlName="rate" type="number" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">تاریخ</label>
                  <input formControlName="moveDate" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">پارٹی / سپلائر / گاہک کا نام</label>
                  <input formControlName="party" type="text" placeholder="نام" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">ریفرنس نمبر (بل / انوائس)</label>
                  <input formControlName="refNo" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
                </div>
              </div>

              <div>
                <label class="block text-slate-700 font-semibold mb-1">تفصیل / نوٹ</label>
                <input formControlName="remarks" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
              </div>

              <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button type="button" (click)="showMovementModal.set(false)" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer">منسوخ</button>
                <button type="submit" [disabled]="movementForm.invalid" class="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">اسٹاک محفوظ کریں</button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
})
export class Inventory {
  readonly store = inject(DataStore);

  activeTab = signal<'items' | 'movements'>('items');
  searchControl = new FormControl('');

  showItemModal = signal<boolean>(false);
  editingItemId = signal<number | null>(null);

  showMovementModal = signal<boolean>(false);

  itemForm = new FormGroup({
    code: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    model: new FormControl(''),
    category: new FormControl('الیکٹرانکس'),
    unit: new FormControl('عدد'),
    purchasePrice: new FormControl(0, [Validators.required]),
    salePrice: new FormControl(0, [Validators.required]),
    cashRate: new FormControl(0),
    qtyInStock: new FormControl(0, [Validators.required]),
    reorderLevel: new FormControl(2, [Validators.required]),
  });

  movementForm = new FormGroup({
    itemId: new FormControl<number>(1, [Validators.required]),
    moveType: new FormControl<StockMoveType>('purchase', [Validators.required]),
    qty: new FormControl(1, [Validators.required, Validators.min(1)]),
    rate: new FormControl(0),
    moveDate: new FormControl(todayStr()),
    party: new FormControl(''),
    refNo: new FormControl(''),
    remarks: new FormControl(''),
  });

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;

  filteredItems = computed(() => {
    let list = this.store.items();
    const query = (this.searchControl.value || '').trim().toLowerCase();
    if (query) {
      list = list.filter((i) => {
        return (
          i.name.toLowerCase().includes(query) ||
          i.code.toLowerCase().includes(query) ||
          i.model.toLowerCase().includes(query) ||
          i.category.toLowerCase().includes(query)
        );
      });
    }
    return list;
  });

  getMoveTypeLabel(type: StockMoveType): string {
    switch (type) {
      case 'purchase':
        return 'خریداری (Purchase)';
      case 'sale':
        return 'فروخت (Sale)';
      case 'return':
        return 'واپسی (Return)';
      case 'adjust':
        return 'ایڈجسٹمنٹ';
      case 'damage':
        return 'ڈیمج / نقصان';
      default:
        return type;
    }
  }

  openNewItemModal() {
    this.editingItemId.set(null);
    const count = this.store.items().length + 1;
    this.itemForm.reset({
      code: `ITM-${count}`,
      name: '',
      model: '',
      category: 'الیکٹرانکس',
      unit: 'عدد',
      purchasePrice: 5000,
      salePrice: 8000,
      cashRate: 800,
      qtyInStock: 5,
      reorderLevel: 2,
    });
    this.showItemModal.set(true);
  }

  editItem(item: Item) {
    this.editingItemId.set(item.id);
    this.itemForm.patchValue({
      code: item.code,
      name: item.name,
      model: item.model,
      category: item.category,
      unit: item.unit,
      purchasePrice: item.purchasePrice,
      salePrice: item.salePrice,
      cashRate: item.cashRate,
      qtyInStock: item.qtyInStock,
      reorderLevel: item.reorderLevel,
    });
    this.showItemModal.set(true);
  }

  onSubmitItem() {
    if (this.itemForm.invalid) return;
    const val = this.itemForm.value;
    this.store.saveItem({
      id: this.editingItemId() || undefined,
      code: val.code!,
      name: val.name!,
      model: val.model || '',
      category: val.category || 'متفرق',
      unit: val.unit || 'عدد',
      purchasePrice: toFloat(val.purchasePrice, 0),
      salePrice: toFloat(val.salePrice, 0),
      cashRate: toFloat(val.cashRate, 0),
      qtyInStock: toInt(val.qtyInStock, 0),
      reorderLevel: toInt(val.reorderLevel, 2),
    });
    this.showItemModal.set(false);
  }

  openMovementModal() {
    const firstItem = this.store.items()[0];
    this.movementForm.reset({
      itemId: firstItem ? firstItem.id : 1,
      moveType: 'purchase',
      qty: 1,
      rate: firstItem ? firstItem.purchasePrice : 0,
      moveDate: todayStr(),
      party: '',
      refNo: '',
      remarks: '',
    });
    this.showMovementModal.set(true);
  }

  openMovementForItem(item: Item) {
    this.movementForm.reset({
      itemId: item.id,
      moveType: 'purchase',
      qty: 5,
      rate: item.purchasePrice,
      moveDate: todayStr(),
      party: 'مرکزی سپلائر',
      refNo: '',
      remarks: 'اسٹاک اضافہ',
    });
    this.showMovementModal.set(true);
  }

  onSubmitMovement() {
    if (this.movementForm.invalid) return;
    const val = this.movementForm.value;
    try {
      this.store.recordStockMovement({
        itemId: Number(val.itemId),
        moveType: val.moveType as StockMoveType,
        qty: toInt(val.qty, 1),
        rate: toFloat(val.rate, 0),
        moveDate: val.moveDate || todayStr(),
        party: val.party || '',
        refNo: val.refNo || '',
        remarks: val.remarks || '',
      });
      this.showMovementModal.set(false);
    } catch (err: any) {
      alert(err.message || 'اسٹاک محفوظ کرنے میں مسئلہ ہوا');
    }
  }
}
