export type UserRole = 'admin' | 'manager' | 'operator' | 'collector';

export type CustomerStatus = 'active' | 'closed' | 'defaulter';

export type StockMoveType = 'purchase' | 'sale' | 'return' | 'adjust' | 'damage';

export type CashRefType = 'receipt' | 'expense' | 'purchase' | 'capital' | 'other';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface Office {
  id: number;
  name: string;
  address: string;
  phone1: string;
  phone2: string;
  isActive: boolean;
}

export interface Item {
  id: number;
  code: string;
  name: string;
  model: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  cashRate: number;
  hardCashRate: number;
  qtyInStock: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt?: string;
}

export interface Customer {
  id: number;
  cardNo: string;
  name: string;
  fatherName: string;
  caste: string;
  permanentAddress: string;
  presentAddress: string;
  workAddress: string;
  phone: string;
  nicNo: string;
  age: number;
  officeId?: number;
  officeName?: string;
  itemId?: number;
  itemName: string;
  model: string;
  dateJoined: string; // DD-MM-YYYY
  totalAmount: number;
  advance: number;
  remainingAmount: number;
  monthlyInstallment: number;
  dueDay: number; // 1-31
  cashRate: number;
  hardCashRate: number;
  openingReceiptNo: string;
  // Guarantor (ضامن)
  gName: string;
  gFatherName: string;
  gCaste: string;
  gPermanentAddress: string;
  gPresentAddress: string;
  gPhone1: string;
  gPhone2: string;
  gRelation: string;
  gNicNo: string;
  status: CustomerStatus;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Installment {
  id: number;
  customerId: number;
  srNo: number; // 0 for advance, 1..20 for monthly installments
  month: string; // e.g., '10-26'
  deposit: number;
  balance: number;
  receiptNo: string;
  payDate: string; // DD-MM-YYYY
  collector?: string;
  fine?: number;
  remarks?: string;
  signature?: string;
  omSignature?: string;
  createdAt?: string;
}

export interface Receipt {
  id: number;
  receiptNo: string;
  serialNo: string;
  customerId: number;
  cardNo: string;
  customerName: string;
  fatherName?: string;
  itemName?: string;
  amount: number;
  fine: number;
  balanceBefore: number;
  balanceAfter: number;
  payDate: string;
  collector?: string;
  boxCode: string; // e.g. U-01
  remarks?: string;
  createdAt?: string;
}

export interface StockMovement {
  id: number;
  itemId: number;
  itemName?: string;
  moveDate: string;
  moveType: StockMoveType;
  qty: number;
  rate: number;
  amount: number;
  refNo?: string;
  party?: string;
  remarks?: string;
  createdAt?: string;
}

export interface CashBookEntry {
  id: number;
  entryDate: string;
  description: string;
  refType: CashRefType;
  refId?: number;
  cashIn: number;
  cashOut: number;
  balance: number;
  userName?: string;
  createdAt?: string;
}

export interface Expense {
  id: number;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  paidTo?: string;
  userName?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: number;
  ts: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface AppSettings {
  companyName: string;
  companyNameEn: string;
  companyShort: string;
  headOffice: string;
  headOfficeEn: string;
  phone1: string;
  phone2: string;
  address: string;
  lateFine: number; // روپیہ فی چکر
  currency: string;
  ledgerRows: number; // 20
  receiptPrefix: string;
  cardPrefix: string;
}
