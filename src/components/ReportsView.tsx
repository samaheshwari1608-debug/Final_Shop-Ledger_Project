import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, CircleDollarSign, FileText, Package, TrendingDown } from 'lucide-react';
import { Bill, Customer, ExpenseEntry } from '../types';

interface ReportsViewProps {
  bills: Bill[];
  customers: Customer[];
}

interface PurchaseSummary {
  total: number;
  payable: number;
  paymentStatus: string;
  date: string;
  supplier: string;
}

interface ReportPayload {
  expenses?: ExpenseEntry[];
  purchases?: PurchaseSummary[];
}

const currency = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const ReportsView: React.FC<ReportsViewProps> = ({ bills, customers }) => {
  const [timeRange, setTimeRange] = useState<'This Month' | 'Last Month' | 'This Quarter'>('This Month');
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('shopledger-token');
    const shopId = localStorage.getItem('shopledger-shop-id');
    if (!token || !shopId) return;
    fetch(`/api/shops/${shopId}/reports`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const text = await response.text();
        let data: ReportPayload = {};
        try {
          data = text ? JSON.parse(text) as ReportPayload : {};
        } catch {
          throw new Error('The report service returned an invalid response.');
        }
        if (!response.ok) throw new Error('Could not load current financial reports.');
        return data;
      })
      .then((data) => {
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setPurchases(Array.isArray(data.purchases) ? data.purchases : []);
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Could not load financial reports.'));
  }, []);

  const selectedMonths = useMemo(() => {
    const now = new Date();
    if (timeRange === 'This Month') return new Set([monthKey(now)]);
    if (timeRange === 'Last Month') return new Set([monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))]);
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    return new Set(Array.from({ length: 3 }, (_, index) => monthKey(new Date(now.getFullYear(), quarterStart + index, 1))));
  }, [timeRange]);

  const selectedBills = bills.filter((bill) => selectedMonths.has(bill.date.slice(0, 7)));
  const selectedExpenses = expenses.filter((expense) => selectedMonths.has(expense.date.slice(0, 7)));
  const selectedPurchases = purchases.filter((purchase) => selectedMonths.has(purchase.date.slice(0, 7)));
  const grossSales = selectedBills.reduce((sum, bill) => sum + bill.total, 0);
  const paidSales = selectedBills.filter((bill) => bill.status === 'Paid').reduce((sum, bill) => sum + bill.total, 0);
  const creditSales = grossSales - paidSales;
  const operatingExpenses = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const salaryExpenses = selectedExpenses.filter((expense) => expense.category.toLowerCase().includes('salary')).reduce((sum, expense) => sum + expense.amount, 0);
  const supplierPayables = purchases.reduce((sum, purchase) => sum + purchase.payable, 0);
  const openPurchases = purchases.filter((purchase) => purchase.payable > 0).length;
  const categoryTotals = selectedExpenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    return totals;
  }, {});

  const cards = [
    { label: 'Recorded sales', value: currency(grossSales), note: `${currency(paidSales)} marked paid · ${currency(creditSales)} on credit`, icon: CircleDollarSign, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Completed bills', value: String(selectedBills.length), note: `${customers.length} customers in the ledger`, icon: FileText, color: 'bg-sky-50 text-sky-700' },
    { label: 'Recorded expenses', value: currency(operatingExpenses), note: `${currency(salaryExpenses)} employee salary payments`, icon: TrendingDown, color: 'bg-amber-50 text-amber-700' },
    { label: 'Supplier payable', value: currency(supplierPayables), note: `${openPurchases} open purchases · all periods`, icon: Package, color: 'bg-violet-50 text-violet-700' },
  ];

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Reports & Insights</h1><p className="mt-1 text-sm text-slate-600">Financial activity from saved sales, expenses, and purchases.</p></div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Calendar className="h-4 w-4 text-[#059669]" /><select value={timeRange} onChange={(event) => setTimeRange(event.target.value as typeof timeRange)} className="bg-transparent outline-none"><option>This Month</option><option>Last Month</option><option>This Quarter</option></select></label>
      </header>
      {loadError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{loadError}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return <article key={card.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}><Icon className="h-5 w-5" /></span><span className="text-sm font-medium text-slate-600">{card.label}</span></div><p className="mt-4 text-2xl font-bold text-[#0F172A]">{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.note}</p></article>;
        })}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-[#0F172A]"><BarChart3 className="h-4 w-4 text-[#059669]" />Expense categories</h2>
          {Object.keys(categoryTotals).length ? <ul className="mt-4 divide-y">{Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([category, value]) => <li key={category} className="flex justify-between py-3 text-sm"><span className="text-slate-600">{category}</span><strong className="text-[#0F172A]">{currency(value)}</strong></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No expenses were recorded for this period.</p>}
        </section>
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-[#0F172A]">Recent supplier purchases</h2>
          {selectedPurchases.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Supplier</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Outstanding</th></tr></thead><tbody className="divide-y">{selectedPurchases.slice(0, 10).map((purchase) => <tr key={`${purchase.supplier}-${purchase.date}-${purchase.total}`}><td className="py-3 pr-3">{purchase.supplier}</td><td className="py-3 pr-3 text-slate-500">{purchase.date}</td><td className="py-3 pr-3">{purchase.paymentStatus}</td><td className="py-3 text-right font-semibold">{currency(purchase.payable)}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">No supplier purchases recorded for this period.</p>}
        </section>
      </div>
      <p className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-600">These are operational totals, not certified accounting or tax reports. Inventory purchases are shown as purchases/payables and are not added again to operating expenses; historical cost of goods sold is not yet stored, so profit is intentionally not estimated.</p>
    </section>
  );
};
