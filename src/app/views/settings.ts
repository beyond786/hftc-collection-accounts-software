import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from '../services/data-store';
import { Office, User } from '../models/types';
import { toFloat, toInt } from '../utils/accounting';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold font-nastaliq text-slate-900">ترتیبات و ڈیٹا مینجمنٹ (Settings &amp; Backup)</h1>
          <p class="text-xs text-slate-500 mt-0.5">کمپنی کی معلومات، برانچز، لیٹ جرمانہ شرح، بیک اپ ڈاؤن لوڈ اور ڈیمو ڈیٹا بحالی</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        <!-- 1. Company Profile & Accounting Parameters -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 text-right text-xs">
          <div class="flex items-center gap-2 border-b border-slate-200 pb-3 font-bold text-sm text-slate-900">
            <mat-icon class="text-emerald-600">business</mat-icon>
            <span>کمپنی معلومات و اکاؤنٹنگ پیرامیٹرز</span>
          </div>

          <form [formGroup]="settingsForm" (ngSubmit)="onSaveSettings()" class="space-y-4">
            <div>
              <label class="block text-slate-700 font-bold mb-1">کمپنی کا نام (اردو) *</label>
              <input formControlName="companyName" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900">
            </div>

            <div>
              <label class="block text-slate-700 font-bold mb-1">ہیڈ آفس عنوان *</label>
              <input formControlName="headOffice" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-700 font-semibold mb-1">موبائل فون 1</label>
                <input formControlName="phone1" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
              </div>
              <div>
                <label class="block text-slate-700 font-semibold mb-1">موبائل فون 2</label>
                <input formControlName="phone2" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-num">
              </div>
            </div>

            <div>
              <label class="block text-slate-700 font-semibold mb-1">مکمل پتہ</label>
              <input formControlName="address" type="text" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
            </div>

            <!-- Parameters -->
            <div class="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label class="block text-slate-700 font-bold mb-1">لیٹ قسط جرمانہ (روپیہ فی چکر)</label>
                <input formControlName="lateFine" type="number" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-num font-bold text-red-600">
              </div>
              <div>
                <label class="block text-slate-700 font-bold mb-1">کھاتا کارڈ قطاریں</label>
                <input formControlName="ledgerRows" type="number" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-num font-bold">
              </div>
              <div>
                <label class="block text-slate-700 font-bold mb-1">رسید پریفکس</label>
                <input formControlName="receiptPrefix" type="text" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-num">
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer">
                ترتیبات محفوظ کریں
              </button>
            </div>
          </form>
        </div>

        <!-- 2. Backup, Restore & Demo Data -->
        <div class="space-y-6">
          
          <!-- Backup Card -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 text-right text-xs">
            <div class="flex items-center gap-2 border-b border-slate-200 pb-3 font-bold text-sm text-slate-900">
              <mat-icon class="text-blue-600">cloud_download</mat-icon>
              <span>ڈیٹا بیک اپ و باز بحالی (Backup &amp; Restore)</span>
            </div>

            <p class="text-slate-600 leading-relaxed">
              تمام کھاتے، گاہکوں کا ڈیٹا، رسیدات، اسٹاک، روزنامچہ اور اخراجات کا ایک محفوظ JSON فائل بیک اپ ڈاؤن لوڈ کریں۔ بعد میں یا کسی دوسرے کمپیوٹر پر اسے باآسانی بحال کیا جا سکتا ہے۔
            </p>

            <div class="flex flex-wrap gap-3 pt-2">
              <button
                (click)="downloadBackup()"
                class="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold cursor-pointer">
                <mat-icon class="text-base">download</mat-icon>
                <span>بیک اپ فائل ڈاؤن لوڈ کریں (JSON)</span>
              </button>

              <label class="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-semibold cursor-pointer border border-slate-300">
                <mat-icon class="text-base">upload_file</mat-icon>
                <span>بیک اپ فائل اپلوڈ کریں</span>
                <input type="file" accept=".json" (change)="onUploadBackup($event)" class="hidden">
              </label>
            </div>
          </div>

          <!-- Demo Reset Card -->
          <div class="bg-rose-50/60 rounded-2xl border border-rose-200 shadow-xs p-6 space-y-3 text-right text-xs">
            <div class="flex items-center gap-2 border-b border-rose-200 pb-3 font-bold text-sm text-rose-950">
              <mat-icon class="text-rose-600">restart_alt</mat-icon>
              <span>ڈیمو ڈیٹا ری سیٹ (Reset Demo Dataset)</span>
            </div>

            <p class="text-rose-900 leading-relaxed">
              اگر آپ اصل سافٹ ویئر کی طرح تمام نمونہ ڈیٹا (6 ڈیمو گاہک، اسٹاک اشیاء، رسیدات، کیش بک اور اخراجات) کو دوبارہ ابتدائی حالت میں لانا چاہتے ہیں تو نیچے دیا گیا بٹن دبائیں۔
            </p>

            <button
              (click)="confirmResetDemo()"
              class="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2.5 rounded-xl font-bold cursor-pointer inline-flex items-center gap-2">
              <mat-icon class="text-base">restore</mat-icon>
              <span>تمام ڈیٹا کو ڈیمو پر ری سیٹ کریں</span>
            </button>
          </div>

          <!-- Current User Switcher / Simulation -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 text-right text-xs">
            <div class="flex items-center gap-2 border-b border-slate-200 pb-3 font-bold text-sm text-slate-900">
              <mat-icon class="text-indigo-600">manage_accounts</mat-icon>
              <span>فعال صارف / لاگ ان کردار (Current Role)</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              @for (u of store.users(); track u.id) {
                <div
                  (click)="store.setCurrentUser(u)"
                  class="p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between"
                  [class.border-emerald-600]="store.currentUser().id === u.id"
                  [class.bg-emerald-50/50]="store.currentUser().id === u.id"
                  [class.border-slate-200]="store.currentUser().id !== u.id">
                  <div>
                    <div class="font-bold text-slate-900">{{ u.fullName }}</div>
                    <div class="text-[11px] text-slate-500 font-mono">{{ u.username }} ({{ u.role }})</div>
                  </div>
                  @if (store.currentUser().id === u.id) {
                    <mat-icon class="text-emerald-600 text-base">check_circle</mat-icon>
                  }
                </div>
              }
            </div>
          </div>

        </div>

      </div>

    </div>
  `,
})
export class Settings {
  readonly store = inject(DataStore);

  settingsForm = new FormGroup({
    companyName: new FormControl('', [Validators.required]),
    headOffice: new FormControl('', [Validators.required]),
    phone1: new FormControl(''),
    phone2: new FormControl(''),
    address: new FormControl(''),
    lateFine: new FormControl(300, [Validators.required]),
    ledgerRows: new FormControl(20, [Validators.required]),
    receiptPrefix: new FormControl('R'),
  });

  constructor() {
    const s = this.store.settings();
    this.settingsForm.patchValue({
      companyName: s.companyName,
      headOffice: s.headOffice,
      phone1: s.phone1,
      phone2: s.phone2,
      address: s.address,
      lateFine: s.lateFine,
      ledgerRows: s.ledgerRows,
      receiptPrefix: s.receiptPrefix,
    });
  }

  onSaveSettings() {
    if (this.settingsForm.invalid) return;
    const val = this.settingsForm.value;
    this.store.updateSettings({
      companyName: val.companyName!,
      headOffice: val.headOffice!,
      phone1: val.phone1 || '',
      phone2: val.phone2 || '',
      address: val.address || '',
      lateFine: toFloat(val.lateFine, 300),
      ledgerRows: toInt(val.ledgerRows, 20),
      receiptPrefix: val.receiptPrefix || 'R',
    });
    alert('ترتیبات کامیابی سے محفوظ ہو گئیں');
  }

  downloadBackup() {
    const jsonStr = this.store.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HFTC_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onUploadBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const success = this.store.importJson(reader.result as string);
      if (success) {
        alert('بیک اپ کامیابی سے بحال کر دیا گیا');
      } else {
        alert('بیک اپ فائل درست نہیں ہے');
      }
    };
    reader.readAsText(file);
  }

  confirmResetDemo() {
    if (confirm('کیا آپ واقعی تمام ریکارڈز کو ڈیمو ڈیٹا پر ری سیٹ کرنا چاہتے ہیں؟')) {
      this.store.resetDemoData();
      alert('ڈیمو ڈیٹا کامیابی سے ری سیٹ کر دیا گیا');
    }
  }
}
