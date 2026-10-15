import { Injectable, signal, computed } from '@angular/core';
import {
  Customer,
  Item,
  Installment,
  Receipt,
  StockMovement,
  CashBookEntry,
  Expense,
  Office,
  User,
  AppSettings,
  StockMoveType,
} from '../models/types';
import { todayStr, monthLabel, toFloat, toInt, fmtMoney } from '../utils/accounting';

const STORAGE_KEY = 'hftc_accounts_data_v1';

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'ہمدرد فوجی ٹریڈنگ کارپوریشن',
  companyNameEn: 'Hamdard Fauji Trading Corporation',
  companyShort: 'HF TC',
  headOffice: 'آفس میر پور ماتھیلو',
  headOfficeEn: 'Head Office Mirpur Mathelo',
  phone1: '0308-2710346',
  phone2: '0300-2245768',
  address: 'میر پور ماتھیلو، سندھ',
  lateFine: 300,
  currency: 'Rs.',
  ledgerRows: 20,
  receiptPrefix: 'R',
  cardPrefix: '',
};

function createInitialState() {
  const offices: Office[] = [
    {
      id: 1,
      name: 'آفس میر پور ماتھیلو (Head Office)',
      address: 'میر پور ماتھیلو، سندھ',
      phone1: '0308-2710346',
      phone2: '0300-2245768',
      isActive: true,
    },
    {
      id: 2,
      name: 'برانچ گھوٹکی',
      address: 'مین مارکیٹ روڈ گھوٹکی',
      phone1: '0301-3344556',
      phone2: '',
      isActive: true,
    },
    {
      id: 3,
      name: 'برانچ ڈہرکی',
      address: 'ریلوے روڈ ڈہرکی',
      phone1: '0302-7788990',
      phone2: '',
      isActive: true,
    },
  ];

  const items: Item[] = [
    {
      id: 1,
      code: 'FAN-ACDC',
      name: 'ACDC پنکھا',
      model: 'ACDC-1',
      category: 'الیکٹرانکس',
      unit: 'عدد',
      purchasePrice: 8200,
      salePrice: 12500,
      cashRate: 1200,
      hardCashRate: 1200,
      qtyInStock: 14,
      reorderLevel: 3,
      isActive: true,
    },
    {
      id: 2,
      code: 'FAN-PAK',
      name: 'پاک پنکھا',
      model: 'PAK-56',
      category: 'الیکٹرانکس',
      unit: 'عدد',
      purchasePrice: 6500,
      salePrice: 9800,
      cashRate: 900,
      hardCashRate: 900,
      qtyInStock: 9,
      reorderLevel: 2,
      isActive: true,
    },
    {
      id: 3,
      code: 'LED-32',
      name: 'ایل ای ڈی ٹی وی',
      model: '32 انچ Smart',
      category: 'الیکٹرانکس',
      unit: 'عدد',
      purchasePrice: 28000,
      salePrice: 38500,
      cashRate: 3000,
      hardCashRate: 3000,
      qtyInStock: 6,
      reorderLevel: 2,
      isActive: true,
    },
    {
      id: 4,
      code: 'FRG-14',
      name: 'فریج',
      model: '14 کیوبک فُٹ',
      category: 'ہوم اپلائنسز',
      unit: 'عدد',
      purchasePrice: 32000,
      salePrice: 44000,
      cashRate: 3500,
      hardCashRate: 3500,
      qtyInStock: 2, // Low stock trigger
      reorderLevel: 3,
      isActive: true,
    },
    {
      id: 5,
      code: 'WM-AUTO',
      name: 'واشنگ مشین',
      model: 'آٹو 7kg',
      category: 'ہوم اپلائنسز',
      unit: 'عدد',
      purchasePrice: 24000,
      salePrice: 33000,
      cashRate: 2500,
      hardCashRate: 2500,
      qtyInStock: 5,
      reorderLevel: 2,
      isActive: true,
    },
    {
      id: 6,
      code: 'SOLAR-1',
      name: 'سولر پینل',
      model: '550W Mono',
      category: 'سولر',
      unit: 'عدد',
      purchasePrice: 18000,
      salePrice: 26000,
      cashRate: 2000,
      hardCashRate: 2000,
      qtyInStock: 18,
      reorderLevel: 4,
      isActive: true,
    },
  ];

  const users: User[] = [
    {
      id: 1,
      username: 'admin',
      fullName: 'منیجر ایڈمن',
      role: 'admin',
      isActive: true,
      lastLogin: 'آج',
    },
    {
      id: 2,
      username: 'manager',
      fullName: 'حاجی محمد اسماعیل',
      role: 'manager',
      isActive: true,
      lastLogin: 'کل',
    },
    {
      id: 3,
      username: 'operator',
      fullName: 'عبداللہ جان',
      role: 'operator',
      isActive: true,
      lastLogin: 'آج',
    },
    {
      id: 4,
      username: 'collector',
      fullName: 'فیلڈ ریکوری افسر',
      role: 'collector',
      isActive: true,
      lastLogin: 'آج',
    },
  ];

  const customers: Customer[] = [
    {
      id: 1,
      cardNo: '1001',
      name: 'مجاہد حسین',
      fatherName: 'علی بخش',
      caste: 'ابڑو',
      permanentAddress: 'ڈاک خانہ کینجھو، تحصیل رتو ڈیرو، ضلع لاڑکانہ',
      presentAddress: 'وارڈ نمبر 3، میر پور ماتھیلو',
      workAddress: 'پرائیویٹ شاپ کیپر',
      phone: '0302-5266799',
      nicNo: '4220530971477',
      age: 32,
      officeId: 1,
      officeName: 'آفس میر پور ماتھیلو (Head Office)',
      itemId: 1,
      itemName: 'ACDC پنکھا',
      model: 'ACDC-1',
      dateJoined: '01-04-2026',
      totalAmount: 33200,
      advance: 1000,
      remainingAmount: 20200,
      monthlyInstallment: 3000,
      dueDay: 8,
      cashRate: 1200,
      hardCashRate: 1200,
      openingReceiptNo: 'R00001',
      gName: 'محمد رمضان',
      gFatherName: 'غلام قادر',
      gCaste: 'ابڑو',
      gPermanentAddress: 'رتو ڈیرو، لاڑکانہ',
      gPresentAddress: 'میر پور ماتھیلو',
      gPhone1: '0300-9876543',
      gPhone2: '',
      gRelation: 'بھائی',
      gNicNo: '4220199887766',
      status: 'active',
      remarks: 'باقاعدہ ادائیگی کرتا ہے',
    },
    {
      id: 2,
      cardNo: '1002',
      name: 'نعمان حسنین',
      fatherName: 'حسنین احمد',
      caste: 'سید',
      permanentAddress: 'محلہ سادات، میر پور ماتھیلو',
      presentAddress: 'محلہ سادات، میر پور ماتھیلو',
      workAddress: 'سرکاری ملازم، محکمہ زراعت',
      phone: '0300-1122334',
      nicNo: '4220111223344',
      age: 28,
      officeId: 1,
      officeName: 'آفس میر پور ماتھیلو (Head Office)',
      itemId: 1,
      itemName: 'ACDC پنکھا',
      model: 'ACDC-1',
      dateJoined: '01-05-2026',
      totalAmount: 14000,
      advance: 1000,
      remainingAmount: 9000,
      monthlyInstallment: 1000,
      dueDay: 5,
      cashRate: 1000,
      hardCashRate: 1000,
      openingReceiptNo: 'R00002',
      gName: 'سید ظفر شاہ',
      gFatherName: 'سید علی شاہ',
      gCaste: 'سید',
      gPermanentAddress: 'میر پور ماتھیلو',
      gPresentAddress: 'میر پور ماتھیلو',
      gPhone1: '0301-4455667',
      gPhone2: '',
      gRelation: 'چچا',
      gNicNo: '4220188776655',
      status: 'active',
      remarks: '',
    },
    {
      id: 3,
      cardNo: '1003',
      name: 'تنویر احمد',
      fatherName: 'محمد یوسف',
      caste: 'شیخ',
      permanentAddress: 'مین بازار گھوٹکی',
      presentAddress: 'گھوٹکی',
      workAddress: 'کاروبار کپڑا',
      phone: '0333-4455667',
      nicNo: '4510233445567',
      age: 40,
      officeId: 2,
      officeName: 'برانچ گھوٹکی',
      itemId: 3,
      itemName: 'ایل ای ڈی ٹی وی',
      model: '32 انچ Smart',
      dateJoined: '10-06-2026',
      totalAmount: 38500,
      advance: 2500,
      remainingAmount: 27000,
      monthlyInstallment: 3000,
      dueDay: 10,
      cashRate: 3000,
      hardCashRate: 3000,
      openingReceiptNo: 'R00003',
      gName: 'عبدالستار',
      gFatherName: 'محمد یوسف',
      gCaste: 'شیخ',
      gPermanentAddress: 'گھوٹکی',
      gPresentAddress: 'گھوٹکی',
      gPhone1: '0334-9988776',
      gPhone2: '',
      gRelation: 'بھائی',
      gNicNo: '4510288776654',
      status: 'active',
      remarks: '',
    },
    {
      id: 4,
      cardNo: '1004',
      name: 'اللہ ڈنو',
      fatherName: 'غلام سرور',
      caste: 'چاندیو',
      permanentAddress: 'گوٹھ خیر محمد چاندیو، ڈہرکی',
      presentAddress: 'ڈہرکی',
      workAddress: 'ڈرائیور',
      phone: '0311-9988776',
      nicNo: '4510444556677',
      age: 35,
      officeId: 3,
      officeName: 'برانچ ڈہرکی',
      itemId: 2,
      itemName: 'پاک پنکھا',
      model: 'PAK-56',
      dateJoined: '15-07-2026',
      totalAmount: 9800,
      advance: 800,
      remainingAmount: 6300,
      monthlyInstallment: 900,
      dueDay: 15,
      cashRate: 900,
      hardCashRate: 900,
      openingReceiptNo: 'R00004',
      gName: 'روشن علی',
      gFatherName: 'غلام سرور',
      gCaste: 'چاندیو',
      gPermanentAddress: 'ڈہرکی',
      gPresentAddress: 'ڈہرکی',
      gPhone1: '0312-3344556',
      gPhone2: '',
      gRelation: 'بھائی',
      gNicNo: '4510499887766',
      status: 'active',
      remarks: '',
    },
    {
      id: 5,
      cardNo: '1005',
      name: 'ثنا اللہ',
      fatherName: 'مولابخش',
      caste: 'بروہی',
      permanentAddress: 'بائی پاس روڈ میر پور ماتھیلو',
      presentAddress: 'میر پور ماتھیلو',
      workAddress: 'مکینکل مستری',
      phone: '0345-6677889',
      nicNo: '4220177665544',
      age: 38,
      officeId: 1,
      officeName: 'آفس میر پور ماتھیلو (Head Office)',
      itemId: 5,
      itemName: 'واشنگ مشین',
      model: 'آٹو 7kg',
      dateJoined: '20-07-2026',
      totalAmount: 33000,
      advance: 3000,
      remainingAmount: 25000,
      monthlyInstallment: 2500,
      dueDay: 20,
      cashRate: 2500,
      hardCashRate: 2500,
      openingReceiptNo: 'R00005',
      gName: 'کریم بخش',
      gFatherName: 'مولابخش',
      gCaste: 'بروہی',
      gPermanentAddress: 'میر پور ماتھیلو',
      gPresentAddress: 'میر پور ماتھیلو',
      gPhone1: '0346-1122334',
      gPhone2: '',
      gRelation: 'بھائی',
      gNicNo: '4220133221100',
      status: 'active',
      remarks: '',
    },
    {
      id: 6,
      cardNo: '1006',
      name: 'رمضان علی',
      fatherName: 'شاہ دولہ',
      caste: 'کھوسہ',
      permanentAddress: 'گوٹھ علی محمد کھوسہ، گھوٹکی',
      presentAddress: 'گھوٹکی',
      workAddress: 'کاشتکار',
      phone: '0308-2233445',
      nicNo: '4510166554433',
      age: 44,
      officeId: 2,
      officeName: 'برانچ گھوٹکی',
      itemId: 6,
      itemName: 'سولر پینل',
      model: '550W Mono',
      dateJoined: '12-08-2026',
      totalAmount: 26000,
      advance: 2000,
      remainingAmount: 20000,
      monthlyInstallment: 2000,
      dueDay: 12,
      cashRate: 2000,
      hardCashRate: 2000,
      openingReceiptNo: 'R00006',
      gName: 'شاہنواز',
      gFatherName: 'شاہ دولہ',
      gCaste: 'کھوسہ',
      gPermanentAddress: 'گھوٹکی',
      gPresentAddress: 'گھوٹکی',
      gPhone1: '0309-8877665',
      gPhone2: '',
      gRelation: 'بھائی',
      gNicNo: '4510122334455',
      status: 'active',
      remarks: '',
    },
  ];

  const installments: Installment[] = [
    // Customer 1001
    {
      id: 1,
      customerId: 1,
      srNo: 0,
      month: '4-26',
      deposit: 1000,
      balance: 32200,
      receiptNo: 'R00001',
      payDate: '01-04-2026',
      remarks: 'ایڈوانس',
    },
    {
      id: 2,
      customerId: 1,
      srNo: 1,
      month: '5-26',
      deposit: 3000,
      balance: 29200,
      receiptNo: 'R00007',
      payDate: '08-05-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: 'قسط 1',
    },
    {
      id: 3,
      customerId: 1,
      srNo: 2,
      month: '6-26',
      deposit: 3000,
      balance: 26200,
      receiptNo: 'R00008',
      payDate: '08-06-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: 'قسط 2',
    },
    {
      id: 4,
      customerId: 1,
      srNo: 3,
      month: '7-26',
      deposit: 3000,
      balance: 23200,
      receiptNo: 'R00009',
      payDate: '08-07-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: 'قسط 3',
    },
    {
      id: 5,
      customerId: 1,
      srNo: 4,
      month: '8-26',
      deposit: 3000,
      balance: 20200,
      receiptNo: 'R00010',
      payDate: '08-08-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: 'قسط 4',
    },

    // Customer 1002
    {
      id: 6,
      customerId: 2,
      srNo: 0,
      month: '5-26',
      deposit: 1000,
      balance: 13000,
      receiptNo: 'R00002',
      payDate: '01-05-2026',
      remarks: 'ایڈوانس',
    },
    {
      id: 7,
      customerId: 2,
      srNo: 1,
      month: '6-26',
      deposit: 1000,
      balance: 12000,
      receiptNo: 'R00011',
      payDate: '05-06-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: 'قسط 1',
    },
    {
      id: 8,
      customerId: 2,
      srNo: 2,
      month: '7-26',
      deposit: 1000,
      balance: 11000,
      receiptNo: 'R00012',
      payDate: '05-07-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: 'قسط 2',
    },
    {
      id: 9,
      customerId: 2,
      srNo: 3,
      month: '8-26',
      deposit: 1000,
      balance: 10000,
      receiptNo: 'R00013',
      payDate: '05-08-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: 'قسط 3',
    },
    {
      id: 10,
      customerId: 2,
      srNo: 4,
      month: '9-26',
      deposit: 1000,
      balance: 9000,
      receiptNo: 'R00014',
      payDate: '05-09-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: 'قسط 4',
    },

    // Customer 1003
    {
      id: 11,
      customerId: 3,
      srNo: 0,
      month: '6-26',
      deposit: 2500,
      balance: 36000,
      receiptNo: 'R00003',
      payDate: '10-06-2026',
      remarks: 'ایڈوانس',
    },
    {
      id: 12,
      customerId: 3,
      srNo: 1,
      month: '7-26',
      deposit: 3000,
      balance: 33000,
      receiptNo: 'R00015',
      payDate: '10-07-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },
    {
      id: 13,
      customerId: 3,
      srNo: 2,
      month: '8-26',
      deposit: 3000,
      balance: 30000,
      receiptNo: 'R00016',
      payDate: '10-08-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },
    {
      id: 14,
      customerId: 3,
      srNo: 3,
      month: '9-26',
      deposit: 3000,
      balance: 27000,
      receiptNo: 'R00017',
      payDate: '10-09-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },

    // Customer 1004
    {
      id: 15,
      customerId: 4,
      srNo: 0,
      month: '7-26',
      deposit: 800,
      balance: 9000,
      receiptNo: 'R00004',
      payDate: '15-07-2026',
      remarks: 'ایڈوانس',
    },
    {
      id: 16,
      customerId: 4,
      srNo: 1,
      month: '8-26',
      deposit: 900,
      balance: 8100,
      receiptNo: 'R00018',
      payDate: '15-08-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },
    {
      id: 17,
      customerId: 4,
      srNo: 2,
      month: '9-26',
      deposit: 900,
      balance: 7200,
      receiptNo: 'R00019',
      payDate: '15-09-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },
    {
      id: 18,
      customerId: 4,
      srNo: 3,
      month: '10-26',
      deposit: 900,
      balance: 6300,
      receiptNo: 'R00020',
      payDate: '15-10-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },

    // Customer 1005
    {
      id: 19,
      customerId: 5,
      srNo: 0,
      month: '7-26',
      deposit: 3000,
      balance: 30000,
      receiptNo: 'R00005',
      payDate: '20-07-2026',
      remarks: 'ایڈوانس',
    },
    {
      id: 20,
      customerId: 5,
      srNo: 1,
      month: '8-26',
      deposit: 2500,
      balance: 27500,
      receiptNo: 'R00021',
      payDate: '20-08-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },
    {
      id: 21,
      customerId: 5,
      srNo: 2,
      month: '9-26',
      deposit: 2500,
      balance: 25000,
      receiptNo: 'R00022',
      payDate: '20-09-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },

    // Customer 1006
    {
      id: 22,
      customerId: 6,
      srNo: 0,
      month: '8-26',
      deposit: 2000,
      balance: 24000,
      receiptNo: 'R00006',
      payDate: '12-08-2026',
      remarks: 'ایڈوانس',
    },
    {
      id: 23,
      customerId: 6,
      srNo: 1,
      month: '9-26',
      deposit: 2000,
      balance: 22000,
      receiptNo: 'R00023',
      payDate: '12-09-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },
    {
      id: 24,
      customerId: 6,
      srNo: 2,
      month: '10-26',
      deposit: 2000,
      balance: 20000,
      receiptNo: 'R00024',
      payDate: '12-10-2026',
      collector: 'فیلڈ ریکوری افسر',
      remarks: '',
    },
  ];

  const receipts: Receipt[] = [
    {
      id: 1,
      receiptNo: 'R00020',
      serialNo: '20',
      customerId: 4,
      cardNo: '1004',
      customerName: 'اللہ ڈنو',
      fatherName: 'غلام سرور',
      itemName: 'پاک پنکھا',
      amount: 900,
      fine: 0,
      balanceBefore: 7200,
      balanceAfter: 6300,
      payDate: '15-10-2026',
      collector: 'فیلڈ ریکوری افسر',
      boxCode: 'U-01',
      remarks: 'قسط وصولی',
    },
    {
      id: 2,
      receiptNo: 'R00024',
      serialNo: '24',
      customerId: 6,
      cardNo: '1006',
      customerName: 'رمضان علی',
      fatherName: 'شاہ دولہ',
      itemName: 'سولر پینل',
      amount: 2000,
      fine: 0,
      balanceBefore: 22000,
      balanceAfter: 20000,
      payDate: '12-10-2026',
      collector: 'فیلڈ ریکوری افسر',
      boxCode: 'U-01',
      remarks: '',
    },
    {
      id: 3,
      receiptNo: 'R00022',
      serialNo: '22',
      customerId: 5,
      cardNo: '1005',
      customerName: 'ثنا اللہ',
      fatherName: 'مولابخش',
      itemName: 'واشنگ مشین',
      amount: 2500,
      fine: 0,
      balanceBefore: 27500,
      balanceAfter: 25000,
      payDate: '20-09-2026',
      collector: 'فیلڈ ریکوری افسر',
      boxCode: 'U-01',
      remarks: '',
    },
  ];

  const stockMovements: StockMovement[] = [
    {
      id: 1,
      itemId: 1,
      itemName: 'ACDC پنکھا',
      moveDate: '01-04-2026',
      moveType: 'purchase',
      qty: 20,
      rate: 8200,
      amount: 164000,
      party: 'مرکزی سپلائر لاہور',
      remarks: 'ابتدائی خریداری',
    },
    {
      id: 2,
      itemId: 2,
      itemName: 'پاک پنکھا',
      moveDate: '01-04-2026',
      moveType: 'purchase',
      qty: 15,
      rate: 6500,
      amount: 97500,
      party: 'مرکزی سپلائر گجرات',
      remarks: 'ابتدائی خریداری',
    },
    {
      id: 3,
      itemId: 3,
      itemName: 'ایل ای ڈی ٹی وی',
      moveDate: '15-04-2026',
      moveType: 'purchase',
      qty: 10,
      rate: 28000,
      amount: 280000,
      party: 'امپورٹر کراچی',
      remarks: '',
    },
  ];

  const cashbook: CashBookEntry[] = [
    {
      id: 1,
      entryDate: '01-04-2026',
      description: 'ابتدائی سرمایہ (Capital / Opening Balance)',
      refType: 'capital',
      cashIn: 500000,
      cashOut: 0,
      balance: 500000,
      userName: 'admin',
    },
    {
      id: 2,
      entryDate: '01-04-2026',
      description: 'ایڈوانس - کارڈ 1001 - مجاہد حسین',
      refType: 'receipt',
      cashIn: 1000,
      cashOut: 0,
      balance: 501000,
      userName: 'admin',
    },
    {
      id: 3,
      entryDate: '05-04-2026',
      description: 'دفتر کرایہ اپریل',
      refType: 'expense',
      cashIn: 0,
      cashOut: 15000,
      balance: 486000,
      userName: 'admin',
    },
    {
      id: 4,
      entryDate: '15-10-2026',
      description: 'قسط وصولی - کارڈ 1004 - اللہ ڈنو',
      refType: 'receipt',
      cashIn: 900,
      cashOut: 0,
      balance: 486900,
      userName: 'collector',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 1,
      expenseDate: '05-04-2026',
      category: 'کرایہ',
      description: 'دفتر کرایہ اپریل',
      amount: 15000,
      paidTo: 'ملک راشد',
      userName: 'admin',
    },
    {
      id: 2,
      expenseDate: '30-04-2026',
      category: 'تنخواہ',
      description: 'اسٹاف تنخواہ',
      amount: 45000,
      paidTo: 'اسٹاف',
      userName: 'admin',
    },
    {
      id: 3,
      expenseDate: '10-05-2026',
      category: 'پٹرول/سفر',
      description: 'ریکوری بائیک پٹرول خرچ',
      amount: 4500,
      paidTo: 'شیل پٹرول پمپ',
      userName: 'collector',
    },
    {
      id: 4,
      expenseDate: '25-05-2026',
      category: 'دفتری خرچ',
      description: 'اسٹیشنری، رسید بکس اور رجسٹر',
      amount: 3200,
      paidTo: 'المدینہ بک ڈپو',
      userName: 'operator',
    },
  ];

  return {
    settings: DEFAULT_SETTINGS,
    offices,
    items,
    customers,
    installments,
    receipts,
    stockMovements,
    cashbook,
    expenses,
    users,
    currentUser: users[0],
  };
}

@Injectable({
  providedIn: 'root',
})
export class DataStore {
  readonly settings = signal<AppSettings>(DEFAULT_SETTINGS);
  readonly offices = signal<Office[]>([]);
  readonly items = signal<Item[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly installments = signal<Installment[]>([]);
  readonly receipts = signal<Receipt[]>([]);
  readonly stockMovements = signal<StockMovement[]>([]);
  readonly cashbook = signal<CashBookEntry[]>([]);
  readonly expenses = signal<Expense[]>([]);
  readonly users = signal<User[]>([]);
  readonly currentUser = signal<User>({
    id: 1,
    username: 'admin',
    fullName: 'منیجر ایڈمن',
    role: 'admin',
    isActive: true,
  });

  // Computed state
  readonly totalReceivable = computed(() => {
    return this.customers()
      .filter((c) => c.status !== 'closed')
      .reduce((sum, c) => sum + (c.remainingAmount || 0), 0);
  });

  readonly cashBalance = computed(() => {
    const list = this.cashbook();
    if (list.length === 0) return 0;
    return list[list.length - 1].balance;
  });

  readonly stockValue = computed(() => {
    return this.items().reduce((sum, i) => sum + (i.qtyInStock || 0) * (i.purchasePrice || 0), 0);
  });

  readonly lowStockItems = computed(() => {
    return this.items().filter((i) => i.isActive && i.qtyInStock <= i.reorderLevel);
  });

  readonly todayCollection = computed(() => {
    const today = todayStr();
    return this.receipts()
      .filter((r) => r.payDate === today)
      .reduce((sum, r) => sum + (r.amount || 0) + (r.fine || 0), 0);
  });

  readonly monthCollection = computed(() => {
    const currentM = monthLabel(new Date());
    return this.receipts()
      .filter((r) => monthLabel(r.payDate) === currentM)
      .reduce((sum, r) => sum + (r.amount || 0) + (r.fine || 0), 0);
  });

  readonly overdueCustomers = computed(() => {
    const today = new Date();
    const todayDay = today.getDate();
    return this.customers().filter((c) => {
      if (c.status === 'closed' || c.remainingAmount <= 0) return false;
      const dueDay = c.dueDay || 1;
      return todayDay > dueDay;
    });
  });

  readonly dashboardStats = computed(() => {
    const custs = this.customers();
    return {
      totalCustomers: custs.length,
      activeCustomers: custs.filter((c) => c.status === 'active').length,
      closedCustomers: custs.filter((c) => c.status === 'closed').length,
      defaulterCustomers: custs.filter((c) => c.status === 'defaulter').length,
      totalReceivable: this.totalReceivable(),
      todayCollection: this.todayCollection(),
      monthCollection: this.monthCollection(),
      cashBalance: this.cashBalance(),
      stockValue: this.stockValue(),
      lowStockCount: this.lowStockItems().length,
      overdueCount: this.overdueCustomers().length,
    };
  });

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.customers && data.customers.length > 0) {
          this.settings.set(data.settings || DEFAULT_SETTINGS);
          this.offices.set(data.offices || []);
          this.items.set(data.items || []);
          this.customers.set(data.customers || []);
          this.installments.set(data.installments || []);
          this.receipts.set(data.receipts || []);
          this.stockMovements.set(data.stockMovements || []);
          this.cashbook.set(data.cashbook || []);
          this.expenses.set(data.expenses || []);
          this.users.set(data.users || []);
          if (data.users && data.users[0]) {
            this.currentUser.set(data.users[0]);
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial state:', e);
    }
    this.resetDemoData();
  }

  saveToStorage() {
    try {
      const data = {
        settings: this.settings(),
        offices: this.offices(),
        items: this.items(),
        customers: this.customers(),
        installments: this.installments(),
        receipts: this.receipts(),
        stockMovements: this.stockMovements(),
        cashbook: this.cashbook(),
        expenses: this.expenses(),
        users: this.users(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  }

  resetDemoData() {
    const init = createInitialState();
    this.settings.set(init.settings);
    this.offices.set(init.offices);
    this.items.set(init.items);
    this.customers.set(init.customers);
    this.installments.set(init.installments);
    this.receipts.set(init.receipts);
    this.stockMovements.set(init.stockMovements);
    this.cashbook.set(init.cashbook);
    this.expenses.set(init.expenses);
    this.users.set(init.users);
    this.currentUser.set(init.currentUser);
    this.saveToStorage();
  }

  // --- Customer CRUD ---
  nextCardNo(): string {
    const existing = this.customers().map((c) => parseInt(c.cardNo, 10)).filter((n) => !isNaN(n));
    const max = existing.length > 0 ? Math.max(...existing) : 1000;
    return String(max + 1);
  }

  getCustomer(id: number): Customer | undefined {
    return this.customers().find((c) => c.id === id);
  }

  getCustomerByCard(cardNo: string): Customer | undefined {
    return this.customers().find((c) => c.cardNo.trim() === cardNo.trim());
  }

  saveCustomer(data: Partial<Customer>): Customer {
    const list = [...this.customers()];
    const total = toFloat(data.totalAmount, 0);
    const advance = toFloat(data.advance, 0);

    if (data.id) {
      // Edit existing
      const idx = list.findIndex((c) => c.id === data.id);
      if (idx !== -1) {
        const existing = list[idx];
        const paid = this.getCustomerTotalPaid(existing.id);
        const remaining = Math.max(0, Math.round(total - paid));
        const updated: Customer = {
          ...existing,
          ...data,
          totalAmount: total,
          advance: advance,
          remainingAmount: remaining,
          updatedAt: new Date().toISOString(),
        } as Customer;
        list[idx] = updated;
        this.customers.set(list);
        this.saveToStorage();
        return updated;
      }
    }

    // New Customer
    const nextId = list.length > 0 ? Math.max(...list.map((c) => c.id)) + 1 : 1;
    const remaining = Math.max(0, Math.round(total - advance));
    const newCustomer: Customer = {
      id: nextId,
      cardNo: data.cardNo || this.nextCardNo(),
      name: data.name || '',
      fatherName: data.fatherName || '',
      caste: data.caste || '',
      permanentAddress: data.permanentAddress || '',
      presentAddress: data.presentAddress || '',
      workAddress: data.workAddress || '',
      phone: data.phone || '',
      nicNo: data.nicNo || '',
      age: toInt(data.age, 30),
      officeId: data.officeId,
      officeName: data.officeName || 'آفس میر پور ماتھیلو (Head Office)',
      itemId: data.itemId,
      itemName: data.itemName || '',
      model: data.model || '',
      dateJoined: data.dateJoined || todayStr(),
      totalAmount: total,
      advance: advance,
      remainingAmount: remaining,
      monthlyInstallment: toFloat(data.monthlyInstallment, 0),
      dueDay: toInt(data.dueDay, 10),
      cashRate: toFloat(data.cashRate, 0),
      hardCashRate: toFloat(data.hardCashRate, 0),
      openingReceiptNo: data.openingReceiptNo || '',
      gName: data.gName || '',
      gFatherName: data.gFatherName || '',
      gCaste: data.gCaste || '',
      gPermanentAddress: data.gPermanentAddress || '',
      gPresentAddress: data.gPresentAddress || '',
      gPhone1: data.gPhone1 || '',
      gPhone2: data.gPhone2 || '',
      gRelation: data.gRelation || '',
      gNicNo: data.gNicNo || '',
      status: 'active',
      remarks: data.remarks || '',
      createdAt: new Date().toISOString(),
    };

    list.push(newCustomer);
    this.customers.set(list);

    // If advance was paid, record opening installment & cash book entry!
    if (advance > 0) {
      const instList = [...this.installments()];
      const nextInstId = instList.length > 0 ? Math.max(...instList.map((i) => i.id)) + 1 : 1;
      instList.push({
        id: nextInstId,
        customerId: newCustomer.id,
        srNo: 0,
        month: monthLabel(newCustomer.dateJoined),
        deposit: advance,
        balance: remaining,
        receiptNo: newCustomer.openingReceiptNo || 'ADV',
        payDate: newCustomer.dateJoined,
        remarks: 'ایڈوانس',
      });
      this.installments.set(instList);

      this.addCashEntry({
        entryDate: newCustomer.dateJoined,
        description: `ایڈوانس - کارڈ ${newCustomer.cardNo} - ${newCustomer.name}`,
        refType: 'receipt',
        refId: nextInstId,
        cashIn: advance,
        cashOut: 0,
        userName: this.currentUser().username,
      });
    }

    // Deduct stock if item selected
    if (newCustomer.itemId) {
      try {
        this.recordStockMovement({
          itemId: newCustomer.itemId,
          moveDate: newCustomer.dateJoined,
          moveType: 'sale',
          qty: 1,
          rate: newCustomer.totalAmount,
          party: newCustomer.name,
          remarks: `کارڈ ${newCustomer.cardNo}`,
        });
      } catch (err) {
        console.warn('Stock deduct error:', err);
      }
    }

    this.saveToStorage();
    return newCustomer;
  }

  deleteCustomer(id: number) {
    this.customers.set(this.customers().filter((c) => c.id !== id));
    this.installments.set(this.installments().filter((i) => i.customerId !== id));
    this.receipts.set(this.receipts().filter((r) => r.customerId !== id));
    this.saveToStorage();
  }

  setCustomerStatus(id: number, status: 'active' | 'closed' | 'defaulter') {
    const list = [...this.customers()];
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], status };
      this.customers.set(list);
      this.saveToStorage();
    }
  }

  getCustomerTotalPaid(customerId: number): number {
    return this.installments()
      .filter((i) => i.customerId === customerId)
      .reduce((sum, i) => sum + (i.deposit || 0), 0);
  }

  getCustomerLedger(customerId: number): Installment[] {
    return this.installments()
      .filter((i) => i.customerId === customerId)
      .sort((a, b) => a.srNo - b.srNo);
  }

  // --- Collection / Installment Recording ---
  nextReceiptNo(): string {
    const prefix = this.settings().receiptPrefix || 'R';
    const count = this.receipts().length + 1;
    return `${prefix}${String(count).padStart(5, '0')}`;
  }

  collectInstallment(payload: {
    customerId: number;
    amount: number;
    fine?: number;
    payDate?: string;
    collector?: string;
    boxCode?: string;
    remarks?: string;
    receiptNo?: string;
  }): Receipt {
    const customer = this.getCustomer(payload.customerId);
    if (!customer) throw new Error('کھاتا نہیں ملا');

    const amount = toFloat(payload.amount, 0);
    const fine = toFloat(payload.fine, 0);
    if (amount <= 0 && fine <= 0) throw new Error('رقم درج کریں');

    const balanceBefore = customer.remainingAmount;
    if (amount > balanceBefore + 0.1) {
      throw new Error(`رقم موجودہ بقایا (${fmtMoney(balanceBefore)}) سے زیادہ نہیں ہو سکتی`);
    }

    const balanceAfter = Math.max(0, Math.round(balanceBefore - amount));
    const payDate = payload.payDate || todayStr();
    const receiptNo = payload.receiptNo || this.nextReceiptNo();
    const serialNo = String(this.receipts().length + 1);

    // 1. Record installment row
    const instList = [...this.installments()];
    const custInsts = instList.filter((i) => i.customerId === customer.id);
    const maxSr = custInsts.length > 0 ? Math.max(...custInsts.map((i) => i.srNo)) : 0;
    const nextInstId = instList.length > 0 ? Math.max(...instList.map((i) => i.id)) + 1 : 1;

    const newInst: Installment = {
      id: nextInstId,
      customerId: customer.id,
      srNo: maxSr + 1,
      month: monthLabel(payDate),
      deposit: amount,
      balance: balanceAfter,
      receiptNo,
      payDate,
      collector: payload.collector || this.currentUser().fullName,
      fine,
      remarks: payload.remarks || '',
    };
    instList.push(newInst);
    this.installments.set(instList);

    // 2. Create formal receipt
    const rcptList = [...this.receipts()];
    const nextRcptId = rcptList.length > 0 ? Math.max(...rcptList.map((r) => r.id)) + 1 : 1;
    const newReceipt: Receipt = {
      id: nextRcptId,
      receiptNo,
      serialNo,
      customerId: customer.id,
      cardNo: customer.cardNo,
      customerName: customer.name,
      fatherName: customer.fatherName,
      itemName: customer.itemName,
      amount,
      fine,
      balanceBefore,
      balanceAfter,
      payDate,
      collector: payload.collector || this.currentUser().fullName,
      boxCode: payload.boxCode || 'U-01',
      remarks: payload.remarks || '',
      createdAt: new Date().toISOString(),
    };
    rcptList.unshift(newReceipt);
    this.receipts.set(rcptList);

    // 3. Update customer remaining balance
    const custList = [...this.customers()];
    const cIdx = custList.findIndex((c) => c.id === customer.id);
    if (cIdx !== -1) {
      const isCompleted = balanceAfter <= 0;
      custList[cIdx] = {
        ...custList[cIdx],
        remainingAmount: balanceAfter,
        status: isCompleted ? 'closed' : custList[cIdx].status,
        updatedAt: new Date().toISOString(),
      };
      this.customers.set(custList);
    }

    // 4. Record Cash Book entry (Cash In)
    this.addCashEntry({
      entryDate: payDate,
      description: `قسط وصولی - کارڈ ${customer.cardNo} - ${customer.name}${fine > 0 ? ` (بشمول لیٹ جرمانہ ${fine})` : ''}`,
      refType: 'receipt',
      refId: newReceipt.id,
      cashIn: amount + fine,
      cashOut: 0,
      userName: this.currentUser().username,
    });

    this.saveToStorage();
    return newReceipt;
  }

  // --- Cash Book & Expenses ---
  addCashEntry(entry: {
    entryDate: string;
    description: string;
    refType: 'receipt' | 'expense' | 'purchase' | 'capital' | 'other';
    refId?: number;
    cashIn: number;
    cashOut: number;
    userName?: string;
  }): CashBookEntry {
    const list = [...this.cashbook()];
    const prevBalance = list.length > 0 ? list[list.length - 1].balance : 0;
    const cashIn = toFloat(entry.cashIn, 0);
    const cashOut = toFloat(entry.cashOut, 0);
    const balance = Math.round(prevBalance + cashIn - cashOut);
    const nextId = list.length > 0 ? Math.max(...list.map((c) => c.id)) + 1 : 1;

    const newEntry: CashBookEntry = {
      id: nextId,
      entryDate: entry.entryDate || todayStr(),
      description: entry.description,
      refType: entry.refType,
      refId: entry.refId,
      cashIn,
      cashOut,
      balance,
      userName: entry.userName || this.currentUser().username,
      createdAt: new Date().toISOString(),
    };

    list.push(newEntry);
    this.cashbook.set(list);
    this.saveToStorage();
    return newEntry;
  }

  recordExpense(payload: {
    expenseDate?: string;
    category: string;
    description: string;
    amount: number;
    paidTo?: string;
  }): Expense {
    const amount = toFloat(payload.amount, 0);
    if (amount <= 0) throw new Error('خرچ کی رقم درج کریں');

    const expList = [...this.expenses()];
    const nextId = expList.length > 0 ? Math.max(...expList.map((e) => e.id)) + 1 : 1;
    const expenseDate = payload.expenseDate || todayStr();

    const newExpense: Expense = {
      id: nextId,
      expenseDate,
      category: payload.category || 'متفرق',
      description: payload.description || '',
      amount,
      paidTo: payload.paidTo || '',
      userName: this.currentUser().username,
      createdAt: new Date().toISOString(),
    };

    expList.unshift(newExpense);
    this.expenses.set(expList);

    // Automatic Roznamcha Cash Out
    this.addCashEntry({
      entryDate: expenseDate,
      description: `خرچ - ${newExpense.category} - ${newExpense.description}`,
      refType: 'expense',
      refId: newExpense.id,
      cashIn: 0,
      cashOut: amount,
      userName: this.currentUser().username,
    });

    this.saveToStorage();
    return newExpense;
  }

  // --- Items & Stock ---
  saveItem(itemData: Partial<Item>): Item {
    const list = [...this.items()];
    if (itemData.id) {
      const idx = list.findIndex((i) => i.id === itemData.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...itemData } as Item;
        this.items.set(list);
        this.saveToStorage();
        return list[idx];
      }
    }

    const nextId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
    const newItem: Item = {
      id: nextId,
      code: itemData.code || `ITM-${nextId}`,
      name: itemData.name || '',
      model: itemData.model || '',
      category: itemData.category || 'متفرق',
      unit: itemData.unit || 'عدد',
      purchasePrice: toFloat(itemData.purchasePrice, 0),
      salePrice: toFloat(itemData.salePrice, 0),
      cashRate: toFloat(itemData.cashRate, 0),
      hardCashRate: toFloat(itemData.hardCashRate, 0),
      qtyInStock: toInt(itemData.qtyInStock, 0),
      reorderLevel: toInt(itemData.reorderLevel, 2),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    list.push(newItem);
    this.items.set(list);
    this.saveToStorage();
    return newItem;
  }

  recordStockMovement(movement: {
    itemId: number;
    moveDate?: string;
    moveType: StockMoveType;
    qty: number;
    rate?: number;
    refNo?: string;
    party?: string;
    remarks?: string;
  }): StockMovement {
    const qty = toInt(movement.qty, 0);
    if (qty <= 0) throw new Error('مقدار صفر سے زیادہ ہونی چاہیے');

    const itemsList = [...this.items()];
    const itemIdx = itemsList.findIndex((i) => i.id === movement.itemId);
    if (itemIdx === -1) throw new Error('شے موجود نہیں');

    const item = itemsList[itemIdx];
    let signed = 0;
    if (movement.moveType === 'purchase' || movement.moveType === 'return') {
      signed = qty;
    } else if (movement.moveType === 'sale' || movement.moveType === 'damage') {
      signed = -qty;
    } else if (movement.moveType === 'adjust') {
      signed = qty;
    }

    const newStock = item.qtyInStock + signed;
    if (newStock < 0) throw new Error('اسٹاک منفی نہیں ہو سکتا');

    itemsList[itemIdx] = { ...item, qtyInStock: newStock };
    this.items.set(itemsList);

    const movList = [...this.stockMovements()];
    const nextId = movList.length > 0 ? Math.max(...movList.map((m) => m.id)) + 1 : 1;
    const rate = toFloat(movement.rate, item.purchasePrice);
    const amount = Math.round(rate * qty);

    const newMovement: StockMovement = {
      id: nextId,
      itemId: item.id,
      itemName: item.name,
      moveDate: movement.moveDate || todayStr(),
      moveType: movement.moveType,
      qty,
      rate,
      amount,
      refNo: movement.refNo || '',
      party: movement.party || '',
      remarks: movement.remarks || '',
      createdAt: new Date().toISOString(),
    };

    movList.unshift(newMovement);
    this.stockMovements.set(movList);

    // If purchase, optionally record cash out if paid
    if (movement.moveType === 'purchase') {
      this.addCashEntry({
        entryDate: newMovement.moveDate,
        description: `اسٹاک خریداری - ${item.name} (${qty} ${item.unit})`,
        refType: 'purchase',
        refId: newMovement.id,
        cashIn: 0,
        cashOut: amount,
        userName: this.currentUser().username,
      });
    }

    this.saveToStorage();
    return newMovement;
  }

  // --- Settings & Offices ---
  updateSettings(settings: Partial<AppSettings>) {
    this.settings.set({ ...this.settings(), ...settings });
    this.saveToStorage();
  }

  saveOffice(office: Partial<Office>): Office {
    const list = [...this.offices()];
    if (office.id) {
      const idx = list.findIndex((o) => o.id === office.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...office } as Office;
        this.offices.set(list);
        this.saveToStorage();
        return list[idx];
      }
    }
    const nextId = list.length > 0 ? Math.max(...list.map((o) => o.id)) + 1 : 1;
    const newOffice: Office = {
      id: nextId,
      name: office.name || 'نئی برانچ',
      address: office.address || '',
      phone1: office.phone1 || '',
      phone2: office.phone2 || '',
      isActive: true,
    };
    list.push(newOffice);
    this.offices.set(list);
    this.saveToStorage();
    return newOffice;
  }

  // --- User Switching ---
  setCurrentUser(user: User) {
    this.currentUser.set(user);
  }

  // --- Backup / Export ---
  exportJson(): string {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: this.settings(),
      offices: this.offices(),
      items: this.items(),
      customers: this.customers(),
      installments: this.installments(),
      receipts: this.receipts(),
      stockMovements: this.stockMovements(),
      cashbook: this.cashbook(),
      expenses: this.expenses(),
      users: this.users(),
    };
    return JSON.stringify(data, null, 2);
  }

  importJson(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.customers && Array.isArray(data.customers)) {
        this.settings.set(data.settings || DEFAULT_SETTINGS);
        this.offices.set(data.offices || []);
        this.items.set(data.items || []);
        this.customers.set(data.customers || []);
        this.installments.set(data.installments || []);
        this.receipts.set(data.receipts || []);
        this.stockMovements.set(data.stockMovements || []);
        this.cashbook.set(data.cashbook || []);
        this.expenses.set(data.expenses || []);
        this.users.set(data.users || []);
        this.saveToStorage();
        return true;
      }
    } catch (err) {
      console.error('Import error:', err);
    }
    return false;
  }
}
