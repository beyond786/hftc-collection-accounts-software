import { Customer } from '../models/types';

export function fmtMoney(value: unknown, decimals: number = 0): string {
  try {
    const v = Number(value) || 0;
    if (decimals > 0) {
      return v.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return Math.round(v).toLocaleString('en-US');
  } catch {
    return '0';
  }
}

export function fmtRs(value: unknown, decimals: number = 0): string {
  return `Rs. ${fmtMoney(value, decimals)}`;
}

export function fmtAmountSlash(value: unknown): string {
  return `${fmtMoney(value)}/=`;
}

export function toFloat(value: unknown, def: number = 0): number {
  if (value === null || value === undefined || value === '') return def;
  if (typeof value === 'number') return isNaN(value) ? def : value;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? def : parsed;
}

export function toInt(value: unknown, def: number = 0): number {
  return Math.round(toFloat(value, def));
}

export function numToWordsUrdu(amount: unknown): string {
  let n = toInt(amount);
  if (n === 0) return 'صفر';

  const ones = [
    '', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو',
    'دس', 'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ',
    'اٹھارہ', 'انیس'
  ];
  const tens = ['', '', 'بیس', 'تیس', 'چالیس', 'پچاس', 'ساٹھ', 'ستر', 'اسی', 'نوے'];

  function under100(x: number): string {
    if (x < 20) return ones[x];
    const t = tens[Math.floor(x / 10)];
    const o = x % 10 ? ' ' + ones[x % 10] : '';
    return (t + o).trim();
  }

  function under1000(x: number): string {
    if (x < 100) return under100(x);
    const h = ones[Math.floor(x / 100)] + ' سو';
    const rest = x % 100 ? ' ' + under100(x % 100) : '';
    return (h + rest).trim();
  }

  const parts: string[] = [];

  const crore = Math.floor(n / 10_000_000);
  n = n % 10_000_000;

  const lakh = Math.floor(n / 100_000);
  n = n % 100_000;

  const thousand = Math.floor(n / 1000);
  n = n % 1000;

  if (crore > 0) parts.push(under1000(crore) + ' کروڑ');
  if (lakh > 0) parts.push(under1000(lakh) + ' لاکھ');
  if (thousand > 0) parts.push(under1000(thousand) + ' ہزار');
  if (n > 0) parts.push(under1000(n));

  return parts.join(' ') + ' روپے فقط';
}

export function todayStr(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function toIsoDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parts = value.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    // DD-MM-YYYY
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value: string | undefined): string {
  const d = parseDate(value);
  if (!d) return value || '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function monthLabel(value: string | Date | undefined): string {
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  const m = d.getMonth() + 1;
  const y = String(d.getFullYear()).slice(-2);
  return `${m}-${y}`;
}

export function cleanNic(value: string | undefined): string {
  return (value || '').replace(/[^0-9]/g, '');
}

export function formatNic(value: string | undefined): string {
  const digits = cleanNic(value);
  if (digits.length !== 13) return value || '';
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function isValidNic(value: string | undefined): boolean {
  return cleanNic(value).length === 13;
}

export function calcLateFine(customer: Customer, payDateStr: string = todayStr(), finePerVisit: number = 300): number {
  if (!customer || customer.status === 'closed' || customer.remainingAmount <= 0) return 0;
  const payDate = parseDate(payDateStr) || new Date();
  const dueDay = customer.dueDay || 1;
  
  // Due date in the current payment month
  const dueDate = new Date(payDate.getFullYear(), payDate.getMonth(), Math.min(dueDay, 28));
  if (payDate <= dueDate) {
    return 0;
  }
  
  const diffDays = Math.floor((payDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  const missedCycles = Math.max(1, Math.floor(diffDays / 30) + 1);
  return finePerVisit * missedCycles;
}

export function buildInstallmentSchedule(
  remaining: number,
  monthly: number,
  startDateStr: string = todayStr(),
  dueDay: number = 1
): Array<{ srNo: number; month: string; dueDate: string; deposit: number; balance: number }> {
  const rows: Array<{ srNo: number; month: string; dueDate: string; deposit: number; balance: number }> = [];
  let balance = Math.round(remaining);
  const pay = Math.round(monthly);
  if (pay <= 0) return rows;

  const start = parseDate(startDateStr) || new Date();
  let n = 0;

  while (balance > 0 && n < 120) {
    n++;
    const due = new Date(start.getFullYear(), start.getMonth() + n, Math.min(dueDay, 28));
    const currentPay = Math.min(pay, balance);
    balance = Math.max(0, balance - currentPay);
    rows.push({
      srNo: n,
      month: monthLabel(due),
      dueDate: `${String(due.getDate()).padStart(2, '0')}-${String(due.getMonth() + 1).padStart(2, '0')}-${due.getFullYear()}`,
      deposit: currentPay,
      balance,
    });
  }

  return rows;
}
