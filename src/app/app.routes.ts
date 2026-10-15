import { Routes } from '@angular/router';
import { Dashboard } from './views/dashboard';
import { Customers } from './views/customers';
import { Collection } from './views/collection';
import { Inventory } from './views/inventory';
import { CashBook } from './views/cashbook';
import { Expenses } from './views/expenses';
import { Reports } from './views/reports';
import { Settings } from './views/settings';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'customers', component: Customers },
  { path: 'collection', component: Collection },
  { path: 'inventory', component: Inventory },
  { path: 'cashbook', component: CashBook },
  { path: 'expenses', component: Expenses },
  { path: 'reports', component: Reports },
  { path: 'settings', component: Settings },
  { path: '**', redirectTo: 'dashboard' },
];
