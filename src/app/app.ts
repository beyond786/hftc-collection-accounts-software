import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DataStore } from './services/data-store';
import { PrintDialog, PrintDocType } from './components/print-dialog';
import { Dashboard } from './views/dashboard';
import { Customers } from './views/customers';
import { Collection } from './views/collection';
import { Inventory } from './views/inventory';
import { CashBook } from './views/cashbook';
import { Expenses } from './views/expenses';
import { Reports } from './views/reports';
import { Settings } from './views/settings';
import { Customer, Receipt } from './models/types';
import { fmtMoney } from './utils/accounting';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'collection'
  | 'inventory'
  | 'cashbook'
  | 'expenses'
  | 'reports'
  | 'settings';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    MatIconModule,
    PrintDialog,
    Dashboard,
    Customers,
    Collection,
    Inventory,
    CashBook,
    Expenses,
    Reports,
    Settings,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl">
      
      <!-- Top Navigation & Status Bar -->
      <header class="no-print bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          <!-- Logo & Brand Name -->
          <div class="flex items-center gap-3">
            <button
              (click)="toggleMobileMenu()"
              class="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
              <mat-icon>{{ mobileMenuOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>

            <div class="flex items-center gap-2.5 cursor-pointer" (click)="setActiveTab('dashboard')">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex flex-col items-center justify-center font-bold text-[10px] leading-none shadow-sm shrink-0 border border-emerald-300/30">
                <span>HF</span>
                <span>TC</span>
              </div>
              <div>
                <div class="font-bold font-nastaliq text-base sm:text-lg text-emerald-300 leading-tight">
                  ہمدرد فوجی ٹریڈنگ کارپوریشن
                </div>
                <div class="text-[10px] text-slate-400 hidden sm:block font-sans">
                  {{ store.settings().headOffice }} &bull; Collection &amp; Accounts
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Top Metrics & User Profile -->
          <div class="flex items-center gap-3 sm:gap-4">
            <!-- Cash In Hand Pill -->
            <div class="hidden sm:flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <span class="text-slate-400">کیش:</span>
              <span class="font-num text-emerald-400 font-bold">Rs. {{ fmtMoney(store.cashBalance()) }}</span>
            </div>

            <!-- Overdue Badge (if any) -->
            @if (store.overdueCustomers().length > 0) {
              <button
                (click)="setActiveTab('collection')"
                class="hidden md:flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="واجب الادا اقساط">
                <mat-icon class="text-xs text-amber-400">warning</mat-icon>
                <span>{{ store.overdueCustomers().length }} لیٹ</span>
              </button>
            }

            <!-- Quick Collect Action -->
            <button
              (click)="setActiveTab('collection')"
              class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs active:scale-95 cursor-pointer transition-all">
              <mat-icon class="text-base">payments</mat-icon>
              <span class="hidden sm:inline">وصولی</span>
            </button>

            <!-- User Badge -->
            <div
              (click)="setActiveTab('settings')"
              class="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 pl-2.5 pr-2 py-1 rounded-xl text-xs cursor-pointer transition-colors"
              title="صارف ترتیبات">
              <div class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                {{ store.currentUser().fullName.charAt(0) }}
              </div>
              <span class="font-semibold text-slate-200 hidden md:inline">{{ store.currentUser().fullName }}</span>
            </div>
          </div>

        </div>
      </header>

      <!-- Main Shell Body: Navigation Sidebar + View Container -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-5 w-full flex-1 flex flex-col lg:flex-row gap-6">
        
        <!-- Desktop Sidebar Navigation -->
        <aside class="no-print hidden lg:block w-64 shrink-0 space-y-2">
          
          <div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-1">
            <div class="px-3 py-2 text-[11px] font-bold text-slate-400 tracking-wider">
              مرکزی ماڈیولز (MODULES)
            </div>

            <!-- Dashboard -->
            <button
              (click)="setActiveTab('dashboard')"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer text-right"
              [class.bg-emerald-600]="activeTab() === 'dashboard'"
              [class.text-white]="activeTab() === 'dashboard'"
              [class.shadow-xs]="activeTab() === 'dashboard'"
              [class.text-slate-700]="activeTab() !== 'dashboard'"
              [class.hover:bg-slate-100]="activeTab() !== 'dashboard'">
              <mat-icon class="text-lg">dashboard</mat-icon>
              <span class="flex-1">ڈیش بورڈ</span>
            </button>

            <!-- Customers / Accounts -->
            <button
              (click)="setActiveTab('customers')"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer text-right"
              [class.bg-emerald-600]="activeTab() === 'customers'"
              [class.text-white]="activeTab() === 'customers'"
              [class.shadow-xs]="activeTab() === 'customers'"
              [class.text-slate-700]="activeTab() !== 'customers'"
              [class.hover:bg-slate-100]="activeTab() !== 'customers'">
              <mat-icon class="text-lg">people</mat-icon>
              <span class="flex-1">کھاتے / گاہک (اقرار نامہ)</span>
              <span class="font-num text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                [class.bg-emerald-700]="activeTab() === 'customers'"
                [class.text-white]="activeTab() === 'customers'"
                [class.bg-slate-100]="activeTab() !== 'customers'"
                [class.text-slate-600]="activeTab() !== 'customers'">
                {{ store.customers().length }}
              </span>
            </button>

            <!-- Collection / Receipts -->
            <button
              (click)="setActiveTab('collection')"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer text-right"
              [class.bg-emerald-600]="activeTab() === 'collection'"
              [class.text-white]="activeTab() === 'collection'"
              [class.shadow-xs]="activeTab() === 'collection'"
              [class.text-slate-700]="activeTab() !== 'collection'"
              [class.hover:bg-slate-100]="activeTab() !== 'collection'">
              <mat-icon class="text-lg">payments</mat-icon>
              <span class="flex-1">قسط وصولی و رسیدات</span>
              @if (store.overdueCustomers().length > 0) {
                <span class="font-num text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500 text-white">
                  {{ store.overdueCustomers().length }}
                </span>
              }
            </button>

            <!-- Stock / Inventory -->
            <button
              (click)="setActiveTab('inventory')"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer text-right"
              [class.bg-emerald-600]="activeTab() === 'inventory'"
              [class.text-white]="activeTab() === 'inventory'"
              [class.shadow-xs]="activeTab() === 'inventory'"
              [class.text-slate-700]="activeTab() !== 'inventory'"
              [class.hover:bg-slate-100]="activeTab() !== 'inventory'">
              <mat-icon class="text-lg">inventory_2</mat-icon>
              <span class="flex-1">اسٹاک و اشیاء ماسٹر</span>
              @if (store.lowStockItems().length > 0) {
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              }
            </button>

            <!-- Cash Book (روزنامچہ) -->
            <button
              (click)="setActiveTab('cashbook')"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer text-right"
              [class.bg-emerald-600]="activeTab() === 'cashbook'"
              [class.text-white]="activeTab() === 'cashbook'"
              [class.shadow-xs]="activeTab() === 'cashbook'"
              [class.text-slate-700]="activeTab() !== 'cashbook'"
              [class.hover:bg-slate-100]="activeTab() !== 'cashbook'">
              <mat-icon class="text-lg">menu_book</mat-icon>
              <span class="flex-1">روزنامچہ (Cash Book)</span>
            </button>

            <!-- Expenses -->
            <button
              (click)="setActiveTab('expenses')"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer text-right"
              [class.bg-emerald-600]="activeTab() === 'expenses'"
              [class.text-white]="activeTab() === 'expenses'"
              [class.shadow-xs]="activeTab() === 'expenses'"
              [class.text-slate-700]="activeTab() !== 'expenses'"
              [class.hover:bg-slate-100]="activeTab() !== 'expenses'">
              <mat-icon class="text-lg">receipt</mat-icon>
              <span class="flex-1">اخراجات (Expenses)</span>
            </button>

            <!-- Reports -->
            <button
              (click)="setActiveTab('reports')"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer text-right"
              [class.bg-emerald-600]="activeTab() === 'reports'"
              [class.text-white]="activeTab() === 'reports'"
              [class.shadow-xs]="activeTab() === 'reports'"
              [class.text-slate-700]="activeTab() !== 'reports'"
              [class.hover:bg-slate-100]="activeTab() !== 'reports'">
              <mat-icon class="text-lg">assessment</mat-icon>
              <span class="flex-1">رپورٹس و گوشوارے</span>
            </button>

            <!-- Settings -->
            <button
              (click)="setActiveTab('settings')"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer text-right"
              [class.bg-emerald-600]="activeTab() === 'settings'"
              [class.text-white]="activeTab() === 'settings'"
              [class.shadow-xs]="activeTab() === 'settings'"
              [class.text-slate-700]="activeTab() !== 'settings'"
              [class.hover:bg-slate-100]="activeTab() !== 'settings'">
              <mat-icon class="text-lg">settings</mat-icon>
              <span class="flex-1">ترتیبات و بیک اپ</span>
            </button>

          </div>

          <!-- Bottom Office Info Box -->
          <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-xs text-xs space-y-2 border border-slate-700/60">
            <div class="font-bold font-nastaliq text-emerald-300 text-sm">
              {{ store.settings().headOffice }}
            </div>
            <div class="text-[11px] text-slate-300 leading-relaxed">
              {{ store.settings().address }}
            </div>
            <div class="font-num text-[11px] text-slate-400 border-t border-slate-700/80 pt-2">
              {{ store.settings().phone1 }}<br>{{ store.settings().phone2 }}
            </div>
          </div>

        </aside>

        <!-- Mobile Drawer Menu -->
        @if (mobileMenuOpen()) {
          <div class="no-print lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex">
            <div class="bg-white w-72 h-full shadow-2xl p-4 flex flex-col space-y-2 text-right text-xs">
              <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <div class="font-bold text-sm text-slate-900">مینو (Menu)</div>
                <button (click)="toggleMobileMenu()" class="p-1 rounded-lg text-slate-500 hover:bg-slate-100">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <button (click)="setActiveTab('dashboard'); toggleMobileMenu()" class="p-3 text-right font-bold rounded-xl hover:bg-slate-100 flex items-center gap-2">
                <mat-icon class="text-emerald-600">dashboard</mat-icon>
                <span>ڈیش بورڈ</span>
              </button>
              <button (click)="setActiveTab('customers'); toggleMobileMenu()" class="p-3 text-right font-bold rounded-xl hover:bg-slate-100 flex items-center gap-2">
                <mat-icon class="text-emerald-600">people</mat-icon>
                <span>کھاتے / گاہک</span>
              </button>
              <button (click)="setActiveTab('collection'); toggleMobileMenu()" class="p-3 text-right font-bold rounded-xl hover:bg-slate-100 flex items-center gap-2">
                <mat-icon class="text-emerald-600">payments</mat-icon>
                <span>قسط وصولی</span>
              </button>
              <button (click)="setActiveTab('inventory'); toggleMobileMenu()" class="p-3 text-right font-bold rounded-xl hover:bg-slate-100 flex items-center gap-2">
                <mat-icon class="text-emerald-600">inventory_2</mat-icon>
                <span>اسٹاک ماسٹر</span>
              </button>
              <button (click)="setActiveTab('cashbook'); toggleMobileMenu()" class="p-3 text-right font-bold rounded-xl hover:bg-slate-100 flex items-center gap-2">
                <mat-icon class="text-emerald-600">menu_book</mat-icon>
                <span>روزنامچہ (Cash Book)</span>
              </button>
              <button (click)="setActiveTab('expenses'); toggleMobileMenu()" class="p-3 text-right font-bold rounded-xl hover:bg-slate-100 flex items-center gap-2">
                <mat-icon class="text-emerald-600">receipt</mat-icon>
                <span>اخراجات</span>
              </button>
              <button (click)="setActiveTab('reports'); toggleMobileMenu()" class="p-3 text-right font-bold rounded-xl hover:bg-slate-100 flex items-center gap-2">
                <mat-icon class="text-emerald-600">assessment</mat-icon>
                <span>رپورٹس</span>
              </button>
              <button (click)="setActiveTab('settings'); toggleMobileMenu()" class="p-3 text-right font-bold rounded-xl hover:bg-slate-100 flex items-center gap-2">
                <mat-icon class="text-emerald-600">settings</mat-icon>
                <span>ترتیبات</span>
              </button>
            </div>
          </div>
        }

        <!-- Dynamic View Content Container -->
        <main class="flex-1 min-w-0">
          @switch (activeTab()) {
            @case ('dashboard') {
              <app-dashboard
                (navigateTo)="setActiveTab($event)"
                (printReceipt)="onPrintReceipt($event)"
                (selectCustomerForCollection)="onSelectCustomerForCollection($event)">
              </app-dashboard>
            }
            @case ('customers') {
              <app-customers
                (printAgreement)="onPrintAgreement($event)"
                (printLedger)="onPrintLedger($event)"
                (selectCustomerForCollection)="onSelectCustomerForCollection($event)"
                (navigateTo)="setActiveTab($event)">
              </app-customers>
            }
            @case ('collection') {
              <app-collection
                [initialCustomer]="customerForCollection()"
                (printReceipt)="onPrintReceipt($event)">
              </app-collection>
            }
            @case ('inventory') {
              <app-inventory></app-inventory>
            }
            @case ('cashbook') {
              <app-cashbook></app-cashbook>
            }
            @case ('expenses') {
              <app-expenses></app-expenses>
            }
            @case ('reports') {
              <app-reports></app-reports>
            }
            @case ('settings') {
              <app-settings></app-settings>
            }
          }
        </main>

      </div>

      <!-- Footer -->
      <footer class="no-print bg-white border-t border-slate-200 py-4 mt-auto text-center text-xs text-slate-500">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div class="font-nastaliq font-bold text-slate-700">
            {{ store.settings().companyName }} &bull; {{ store.settings().headOffice }}
          </div>
          <div class="text-[11px] text-slate-400 font-sans">
            HF TC Collection &amp; Accounts Software &bull; All Rights Reserved
          </div>
        </div>
      </footer>

      <!-- Print Preview Modal Dialog -->
      @if (showPrintModal()) {
        <app-print-dialog
          [docType]="printDocType()"
          [receipt]="receiptToPrint()"
          [customer]="customerToPrint()"
          [reportTitle]="'رپورٹ'"
          (close)="showPrintModal.set(false)">
        </app-print-dialog>
      }

    </div>
  `,
})
export class App {
  readonly store = inject(DataStore);

  activeTab = signal<string>('dashboard');
  mobileMenuOpen = signal<boolean>(false);

  // Print Dialog State
  showPrintModal = signal<boolean>(false);
  printDocType = signal<PrintDocType>('receipt');
  receiptToPrint = signal<Receipt | null>(null);
  customerToPrint = signal<Customer | null>(null);

  // Pre-selected customer for quick collection
  customerForCollection = signal<Customer | null>(null);

  fmtMoney = fmtMoney;

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update((v) => !v);
  }

  onPrintReceipt(r: Receipt) {
    this.printDocType.set('receipt');
    this.receiptToPrint.set(r);
    this.customerToPrint.set(null);
    this.showPrintModal.set(true);
  }

  onPrintAgreement(c: Customer) {
    this.printDocType.set('agreement');
    this.customerToPrint.set(c);
    this.receiptToPrint.set(null);
    this.showPrintModal.set(true);
  }

  onPrintLedger(c: Customer) {
    this.printDocType.set('ledger');
    this.customerToPrint.set(c);
    this.receiptToPrint.set(null);
    this.showPrintModal.set(true);
  }

  onSelectCustomerForCollection(c: Customer) {
    this.customerForCollection.set(c);
    this.setActiveTab('collection');
  }
}
