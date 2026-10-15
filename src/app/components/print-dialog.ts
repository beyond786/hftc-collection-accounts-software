import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Customer, Receipt, Installment } from '../models/types';
import { DataStore } from '../services/data-store';
import { fmtMoney, fmtDate, cleanNic, numToWordsUrdu } from '../utils/accounting';

export type PrintDocType = 'receipt' | 'agreement' | 'ledger' | 'report';

@Component({
  selector: 'app-print-dialog',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:block">
      <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        <!-- Modal Toolbar (Hidden during browser print) -->
        <div class="no-print bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800">
          <div class="flex items-center gap-2">
            <mat-icon class="text-emerald-400">print</mat-icon>
            <span class="font-bold text-base">{{ modalTitle() }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              (click)="triggerPrint()"
              class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-medium text-sm transition-colors cursor-pointer shadow-sm">
              <mat-icon class="text-lg">print</mat-icon>
              <span>پرنٹ کریں (Ctrl+P)</span>
            </button>
            <button
              (click)="close.emit()"
              class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="بند کریں">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Printable Document Area -->
        <div class="overflow-y-auto p-4 sm:p-8 bg-slate-200 print:bg-white print:p-0 flex-1 flex justify-center">
          
          <!-- 1. RECEIPT (رسید) -->
          @if (docType() === 'receipt' && receipt()) {
            <div class="sheet bg-white text-black p-6 border-2 border-slate-900 w-[148mm] min-h-[195mm] shadow-md print:shadow-none print:w-full print:border-black font-nastaliq text-right text-sm leading-relaxed">
              <!-- Header -->
              <div class="flex items-start justify-between border-b-2 border-black pb-2 mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-13 h-13 rounded-full border-2 border-black flex flex-col items-center justify-center font-bold text-xs leading-none">
                    <span>HF</span>
                    <span>TC</span>
                  </div>
                  <div class="text-xs text-center font-bold leading-tight">
                    ہمدرد فوجی<br>ٹریڈنگ کارپوریشن
                  </div>
                </div>

                <div class="text-right">
                  <div class="text-xl font-bold text-slate-950">{{ store.settings().companyName }}</div>
                  <div class="text-xs font-semibold">{{ store.settings().headOffice }}</div>
                  <div class="text-xs font-mono direction-ltr inline-block">
                    موبائل: {{ store.settings().phone1 }} &nbsp; {{ store.settings().phone2 }}
                  </div>
                </div>
              </div>

              <!-- Serial and Date -->
              <div class="flex justify-between text-xs font-semibold mb-2">
                <div>سیریل نمبر: <span class="font-num font-bold">{{ receipt()?.serialNo }}</span></div>
                <div>تاریخ: <span class="font-num font-bold">{{ fmtDate(receipt()?.payDate) }}</span></div>
              </div>

              <!-- Main Details Table -->
              <table class="w-full border-collapse border border-black text-xs my-2">
                <tbody>
                  <tr class="border-b border-black">
                    <td class="p-1.5 border-l border-black font-bold w-1/4 bg-slate-50">کارڈ نمبر</td>
                    <td class="p-1.5 border-l border-black font-num font-bold w-1/4">{{ receipt()?.cardNo }}</td>
                    <td class="p-1.5 border-l border-black font-bold w-1/4 bg-slate-50">رسید نمبر</td>
                    <td class="p-1.5 font-num font-bold w-1/4">{{ receipt()?.receiptNo }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1.5 border-l border-black font-bold bg-slate-50">نام</td>
                    <td class="p-1.5 border-l border-black font-bold">{{ receipt()?.customerName }}</td>
                    <td class="p-1.5 border-l border-black font-bold bg-slate-50">ولدیت</td>
                    <td class="p-1.5">{{ receipt()?.fatherName || '—' }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1.5 border-l border-black font-bold bg-slate-50">نام اشیاء قسط</td>
                    <td colspan="3" class="p-1.5 font-semibold">{{ receipt()?.itemName || '—' }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1.5 border-l border-black font-bold bg-slate-50">مبلغ</td>
                    <td class="p-1.5 border-l border-black font-num font-bold">{{ fmtMoney(receipt()?.amount) }}/=</td>
                    <td class="p-1.5 border-l border-black font-bold bg-slate-50">بقایا</td>
                    <td class="p-1.5 font-num font-bold">{{ fmtMoney(receipt()?.balanceAfter) }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Big Amount Box -->
              <table class="w-full border-2 border-black my-4">
                <tbody>
                  <tr>
                    <td class="w-1/4 border-l-2 border-black p-3 text-center align-middle">
                      <span class="font-num font-bold text-base bg-slate-100 px-2 py-1 rounded border border-black">{{ receipt()?.boxCode || 'U-01' }}</span>
                    </td>
                    <td class="p-4 text-center align-middle">
                      <div class="text-2xl sm:text-3xl font-extrabold font-num">
                        Rs. {{ fmtMoney(receipt()?.amount) }}/-
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Amount in words -->
              <div class="text-xs font-semibold my-3 bg-slate-50 p-2 border border-black/30 rounded">
                رقم بالفاظ: <span class="font-bold underline">{{ numToWordsUrdu(receipt()?.amount) }}</span>
              </div>

              <!-- Signatures -->
              <div class="flex justify-between items-end mt-12 pt-6 text-xs font-bold">
                <div class="text-center w-2/5 border-t border-black pt-1">
                  دستخط منیجر
                </div>
                <div class="text-center w-2/5 border-t border-black pt-1">
                  دستخط وصول کنندہ
                </div>
              </div>

              <!-- Late Fine Notice -->
              <div class="border-t border-black mt-8 pt-2 text-[11px] text-slate-800 text-center font-bold">
                نوٹ: لیٹ قسط کی صورت میں -/{{ store.settings().lateFine }} روپیہ فی چکر جرمانہ
              </div>
            </div>
          }

          <!-- 2. AGREEMENT (اقرار نامہ) -->
          @if (docType() === 'agreement' && customer()) {
            <div class="sheet bg-white text-black p-6 border-2 border-slate-900 w-[148mm] min-h-[210mm] shadow-md print:shadow-none print:w-full print:border-black font-nastaliq text-right text-xs leading-relaxed">
              <!-- Header -->
              <div class="flex items-start justify-between border-b-2 border-black pb-2 mb-2">
                <div class="text-right flex-1">
                  <div class="text-lg font-bold text-slate-950">{{ store.settings().companyName }}</div>
                  <div class="text-[11px] font-semibold">{{ customer()?.officeName || store.settings().headOffice }}</div>
                  <div class="text-[11px] font-mono">موبائل: {{ store.settings().phone1 }} &nbsp; {{ store.settings().phone2 }}</div>
                </div>
                <div class="w-11 h-11 rounded-full border-2 border-black flex flex-col items-center justify-center font-bold text-[10px] leading-none shrink-0">
                  <span>HF</span>
                  <span>TC</span>
                </div>
              </div>

              <!-- Agreement Title Banner -->
              <div class="text-center bg-slate-100 border border-black py-1 font-bold text-sm mb-2">
                اقرار نامہ برائے خریداری اشیاء آسان اقساط
              </div>

              <!-- Top summary line -->
              <div class="grid grid-cols-4 border border-black text-center text-[11px] font-semibold mb-2 bg-slate-50">
                <div class="p-1 border-l border-black">کارڈ: <span class="font-num font-bold">{{ customer()?.cardNo }}</span></div>
                <div class="p-1 border-l border-black">قسط: <span class="font-num font-bold">{{ fmtMoney(customer()?.monthlyInstallment) }}</span></div>
                <div class="p-1 border-l border-black">تاریخ قسط: <span class="font-num font-bold">{{ customer()?.dueDay }}</span></div>
                <div class="p-1">عمر: <span class="font-num font-bold">{{ customer()?.age }}</span></div>
              </div>

              <!-- Customer info table -->
              <table class="w-full border-collapse border border-black text-[11px] mb-2">
                <tbody>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold w-1/6 bg-slate-50">نام</td>
                    <td class="p-1 border-l border-black w-2/6 font-bold">{{ customer()?.name }}</td>
                    <td class="p-1 border-l border-black font-bold w-1/6 bg-slate-50">ولدیت</td>
                    <td class="p-1 border-l border-black w-1/6">{{ customer()?.fatherName || '—' }}</td>
                    <td class="p-1 border-l border-black font-bold w-[10%] bg-slate-50">قوم</td>
                    <td class="p-1">{{ customer()?.caste || '—' }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold bg-slate-50">پتہ مستقل</td>
                    <td colspan="5" class="p-1">{{ customer()?.permanentAddress }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold bg-slate-50">پتہ موجودہ</td>
                    <td colspan="5" class="p-1">{{ customer()?.presentAddress || 'مستقل پتہ کے مطابق' }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold bg-slate-50">کام/ملازمت</td>
                    <td colspan="3" class="p-1 border-l border-black">{{ customer()?.workAddress || '—' }}</td>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">فون</td>
                    <td class="p-1 font-num font-bold">{{ customer()?.phone }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- 15-cell NIC grid (Applicant) -->
              <div class="mb-2">
                <div class="text-[10px] font-bold mb-0.5">این آئی سی نمبر (درخواست دہندہ):</div>
                <div class="flex border border-black w-full text-center font-num font-bold text-xs bg-slate-50">
                  @for (digit of getNicCells(customer()?.nicNo); track $index) {
                    <div class="flex-1 py-1 border-l border-black last:border-l-0">{{ digit }}</div>
                  }
                </div>
              </div>

              <!-- Deal Details Table -->
              <table class="w-full border-collapse border border-black text-[11px] mb-3">
                <tbody>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold bg-slate-50">نام اشیاء</td>
                    <td class="p-1 border-l border-black font-bold">{{ customer()?.itemName }}</td>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">ماڈل</td>
                    <td class="p-1 border-l border-black">{{ customer()?.model }}</td>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">تاریخ جمع</td>
                    <td class="p-1 font-num font-bold">{{ fmtDate(customer()?.dateJoined) }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold bg-slate-50">کل رقم</td>
                    <td class="p-1 border-l border-black font-num font-bold">{{ fmtMoney(customer()?.totalAmount) }}</td>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">ایڈوانس</td>
                    <td class="p-1 border-l border-black font-num font-bold">{{ fmtMoney(customer()?.advance) }}</td>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">بقایا رقم</td>
                    <td class="p-1 font-num font-bold text-emerald-800">{{ fmtMoney(customer()?.remainingAmount) }}</td>
                  </tr>
                  <tr>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">رسید نمبر</td>
                    <td class="p-1 border-l border-black font-num">{{ customer()?.openingReceiptNo || '—' }}</td>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">کیش ریٹ</td>
                    <td class="p-1 border-l border-black font-num">{{ fmtMoney(customer()?.cashRate) }}</td>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">ہارڈ کیش</td>
                    <td class="p-1 font-num">{{ fmtMoney(customer()?.hardCashRate) }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Guarantor Header -->
              <div class="border-t-2 border-black pt-1 mb-1 font-bold text-xs flex justify-between items-center">
                <span>ضامن کی تفصیل (Guarantor Details)</span>
                <span class="text-[10px] text-slate-600 font-normal">مراسم: {{ customer()?.gRelation || 'قریبی' }}</span>
              </div>

              <!-- Guarantor Table -->
              <table class="w-full border-collapse border border-black text-[11px] mb-2">
                <tbody>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold w-1/6 bg-slate-50">نام ضامنی</td>
                    <td class="p-1 border-l border-black w-2/6 font-bold">{{ customer()?.gName || '—' }}</td>
                    <td class="p-1 border-l border-black font-bold w-1/6 bg-slate-50">ولدیت</td>
                    <td class="p-1 border-l border-black w-1/6">{{ customer()?.gFatherName || '—' }}</td>
                    <td class="p-1 border-l border-black font-bold w-[10%] bg-slate-50">قوم</td>
                    <td class="p-1">{{ customer()?.gCaste || '—' }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold bg-slate-50">پتہ مستقل</td>
                    <td colspan="5" class="p-1">{{ customer()?.gPermanentAddress || '—' }}</td>
                  </tr>
                  <tr class="border-b border-black">
                    <td class="p-1 border-l border-black font-bold bg-slate-50">فون 1</td>
                    <td colspan="2" class="p-1 border-l border-black font-num">{{ customer()?.gPhone1 || '—' }}</td>
                    <td class="p-1 border-l border-black font-bold bg-slate-50">فون 2</td>
                    <td colspan="2" class="p-1 font-num">{{ customer()?.gPhone2 || '—' }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- 15-cell NIC grid (Guarantor) -->
              <div class="mb-4">
                <div class="text-[10px] font-bold mb-0.5">این آئی سی نمبر (ضامن):</div>
                <div class="flex border border-black w-full text-center font-num font-bold text-xs bg-slate-50">
                  @for (digit of getNicCells(customer()?.gNicNo); track $index) {
                    <div class="flex-1 py-1 border-l border-black last:border-l-0">{{ digit }}</div>
                  }
                </div>
              </div>

              <!-- Signatures Box -->
              <table class="w-full border border-black text-xs font-bold mt-6">
                <tbody>
                  <tr>
                    <td class="w-1/2 p-6 border-l border-black text-center align-bottom h-16">
                      دستخط کرایہ دار / خریدار
                    </td>
                    <td class="w-1/2 p-6 text-center align-bottom h-16">
                      دستخط ضامن
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          }

          <!-- 3. LEDGER CARD (کھاتا کارڈ - 20 Rows) -->
          @if (docType() === 'ledger' && customer()) {
            <div class="sheet bg-white text-black p-5 border-2 border-slate-900 w-[148mm] min-h-[210mm] shadow-md print:shadow-none print:w-full print:border-black font-nastaliq text-right text-xs leading-relaxed">
              <!-- Header -->
              <div class="flex items-start justify-between border-b-2 border-black pb-2 mb-2">
                <div class="text-right flex-1">
                  <div class="text-base font-bold text-slate-950">{{ store.settings().companyName }}</div>
                  <div class="text-[11px] font-semibold">{{ customer()?.officeName || store.settings().headOffice }}</div>
                </div>
                <div class="w-10 h-10 rounded-full border-2 border-black flex flex-col items-center justify-center font-bold text-[9px] leading-none shrink-0">
                  <span>HF</span>
                  <span>TC</span>
                </div>
              </div>

              <!-- Customer info banner -->
              <div class="border border-black p-1.5 mb-2 text-[11px] grid grid-cols-3 gap-1 bg-slate-50">
                <div><b>نام:</b> {{ customer()?.name }}</div>
                <div><b>اشیاء:</b> {{ customer()?.itemName }} ({{ customer()?.model }})</div>
                <div><b>کھاتا نمبر:</b> <span class="font-num font-bold">{{ customer()?.cardNo }}</span></div>
                <div><b>کل رقم:</b> <span class="font-num font-bold">{{ fmtMoney(customer()?.totalAmount) }}</span></div>
                <div><b>قسط ماہانہ:</b> <span class="font-num font-bold">{{ fmtMoney(customer()?.monthlyInstallment) }}</span></div>
                <div><b>تاریخ قسط:</b> <span class="font-num font-bold">{{ customer()?.dueDay }}</span></div>
              </div>

              <!-- 20-Row Ledger Table -->
              <table class="w-full border-collapse border border-black text-[10.5px]">
                <thead>
                  <tr class="bg-slate-200 border-b border-black text-center font-bold">
                    <th class="border-l border-black p-1 w-[6%]">نمبر</th>
                    <th class="border-l border-black p-1 w-[12%]">دستخط</th>
                    <th class="border-l border-black p-1 w-[10%]">ماہ</th>
                    <th class="border-l border-black p-1 w-[14%]">جمع</th>
                    <th class="border-l border-black p-1 w-[15%]">بقایا</th>
                    <th class="border-l border-black p-1 w-[13%]">رسید</th>
                    <th class="border-l border-black p-1 w-[14%]">تاریخ</th>
                    <th class="p-1 w-[16%]">دستخط OM</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of getLedgerRows(); track row.srNo) {
                    <tr class="border-b border-black text-center h-5.5">
                      <td class="border-l border-black p-0.5 font-num font-bold bg-slate-50">{{ row.srNo }}</td>
                      <td class="border-l border-black p-0.5">{{ row.signature || '' }}</td>
                      <td class="border-l border-black p-0.5 font-num">{{ row.month || '' }}</td>
                      <td class="border-l border-black p-0.5 font-num font-bold">{{ row.deposit ? fmtMoney(row.deposit) : '' }}</td>
                      <td class="border-l border-black p-0.5 font-num font-bold">{{ row.balance !== undefined ? fmtMoney(row.balance) : '' }}</td>
                      <td class="border-l border-black p-0.5 font-num">{{ row.receiptNo || '' }}</td>
                      <td class="border-l border-black p-0.5 font-num">{{ row.payDate ? fmtDate(row.payDate) : '' }}</td>
                      <td class="p-0.5">{{ row.omSignature || '' }}</td>
                    </tr>
                  }
                </tbody>
              </table>

              <!-- Ledger summary footer -->
              <div class="border border-black p-2 mt-2 flex justify-between font-bold text-xs bg-slate-50">
                <div>کل وصولی: <span class="font-num text-emerald-800">{{ fmtMoney(customerTotalPaid()) }}</span></div>
                <div>موجودہ بقایا: <span class="font-num text-red-700">{{ fmtMoney(customer()?.remainingAmount) }}</span></div>
                <div>حالت کھاتہ: <span class="px-2 py-0.5 rounded text-[11px] {{ customer()?.status === 'closed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800' }}">{{ customer()?.status === 'closed' ? 'مکمل ادا شدہ (Closed)' : 'فعال (Active)' }}</span></div>
              </div>
            </div>
          }

          <!-- 4. GENERAL REPORT PRINT -->
          @if (docType() === 'report') {
            <div class="sheet bg-white text-black p-6 border-2 border-slate-900 w-[200mm] min-h-[270mm] shadow-md print:shadow-none print:w-full print:border-black font-nastaliq text-right text-xs leading-relaxed">
              <div class="flex items-start justify-between border-b-2 border-black pb-3 mb-4">
                <div>
                  <div class="text-xl font-bold">{{ store.settings().companyName }}</div>
                  <div class="text-xs">{{ store.settings().headOffice }}</div>
                </div>
                <div class="text-left font-sans text-xs">
                  <div class="font-bold text-base">{{ reportTitle() }}</div>
                  <div class="text-slate-600">تاریخ پرنٹ: {{ todayStr() }}</div>
                </div>
              </div>

              <!-- Report content transclusion/custom table -->
              <div class="report-body">
                <ng-content></ng-content>
              </div>

              <div class="mt-8 pt-4 border-t border-black flex justify-between text-xs font-bold">
                <div>دستخط چیکر: ________________</div>
                <div>دستخط منیجر: ________________</div>
              </div>
            </div>
          }

        </div>
      </div>
    </div>
  `,
})
export class PrintDialog {
  readonly store = inject(DataStore);

  readonly docType = input<PrintDocType>('receipt');
  readonly receipt = input<Receipt | null>(null);
  readonly customer = input<Customer | null>(null);
  readonly reportTitle = input<string>('رپورٹ');

  readonly close = output<void>();

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;
  numToWordsUrdu = numToWordsUrdu;
  todayStr = () => fmtDate(new Date().toISOString());

  modalTitle(): string {
    switch (this.docType()) {
      case 'receipt':
        return `رسید پرنٹ — ${this.receipt()?.receiptNo || ''}`;
      case 'agreement':
        return `اقرار نامہ پرنٹ — کارڈ ${this.customer()?.cardNo || ''}`;
      case 'ledger':
        return `کھاتا کارڈ (20 قطاریں) — کارڈ ${this.customer()?.cardNo || ''}`;
      case 'report':
        return this.reportTitle();
      default:
        return 'پرنٹ دستاویز';
    }
  }

  triggerPrint() {
    window.print();
  }

  getNicCells(nic: string | undefined): string[] {
    const cleaned = cleanNic(nic);
    const padded = (cleaned + '000000000000000').slice(0, 15);
    return padded.split('');
  }

  customerTotalPaid(): number {
    const c = this.customer();
    if (!c) return 0;
    return this.store.getCustomerTotalPaid(c.id);
  }

  getLedgerRows(): Array<{
    srNo: number;
    month?: string;
    deposit?: number;
    balance?: number;
    receiptNo?: string;
    payDate?: string;
    signature?: string;
    omSignature?: string;
  }> {
    const c = this.customer();
    if (!c) return [];
    const entries = this.store.getCustomerLedger(c.id);
    const bySr = new Map<number, Installment>();
    entries.forEach((e) => {
      // Advance is srNo 0, put in row 1 or keep track
      if (e.srNo === 0) {
        bySr.set(0, e);
      } else {
        bySr.set(e.srNo, e);
      }
    });

    const rows: Array<{
      srNo: number;
      month?: string;
      deposit?: number;
      balance?: number;
      receiptNo?: string;
      payDate?: string;
      signature?: string;
      omSignature?: string;
    }> = [];

    const totalRows = this.store.settings().ledgerRows || 20;

    // Row 1 shows advance if present, or first installment
    const advance = bySr.get(0);

    for (let i = 1; i <= totalRows; i++) {
      if (i === 1 && advance) {
        rows.push({
          srNo: 1,
          month: advance.month,
          deposit: advance.deposit,
          balance: advance.balance,
          receiptNo: advance.receiptNo || 'ADV',
          payDate: advance.payDate,
          signature: 'ایڈوانس',
          omSignature: 'OM',
        });
      } else {
        const instIndex = advance ? i - 1 : i;
        const entry = bySr.get(instIndex);
        if (entry) {
          rows.push({
            srNo: i,
            month: entry.month,
            deposit: entry.deposit,
            balance: entry.balance,
            receiptNo: entry.receiptNo,
            payDate: entry.payDate,
            signature: entry.collector || '',
            omSignature: entry.omSignature || 'OM',
          });
        } else {
          rows.push({
            srNo: i,
          });
        }
      }
    }

    return rows;
  }
}
