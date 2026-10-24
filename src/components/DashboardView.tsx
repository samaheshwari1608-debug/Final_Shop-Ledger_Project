import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BriefcaseBusiness,
  FileText,
  Package,
  Receipt,
  Sparkles,
  Truck,
  Wallet,
} from 'lucide-react';
import { DashboardSummary, ShopkeeperProfile } from '../types';
import { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  period: DashboardSummary['period'];
  error: string;
  shopkeeper: ShopkeeperProfile;
  onPeriodChange: (period: DashboardSummary['period']) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenNewBill: () => void;
  onOpenAddProduct: () => void;
}

const money = (amount: number | null) => amount === null
  ? '—'
  : `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateLabel = (date: string) => new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-IN', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  period,
  error,
  shopkeeper,
  onPeriodChange,
  onNavigateTab,
  onOpenNewBill,
  onOpenAddProduct,
}) => {
  const selectedPeriod = period;
  const trend = summary?.trend || [];
  const topProducts = summary?.topSellingProducts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            <Sparkles className="w-3 h-3" />
            VyapaarIQ Overview
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Business figures calculated from your saved records.</p>
        </div>
        <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-xl shadow-xs">
          <div className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
            {shopkeeper.name.charAt(0) || '?'}
          </div>
          <span className="text-xs font-semibold text-slate-800">{shopkeeper.name || shopkeeper.shopName}</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Dashboard data could not be refreshed: {error}
        </div>
      )}

      {!summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {error ? 'Dashboard data is unavailable. Retry by switching tabs or refreshing the page.' : 'Loading business totals…'}
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  Sales · Today
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Confirmed sales for today · {summary.timeZone}
                </p>
              </div>
              <div className="text-2xl font-black tabular-nums text-emerald-700">
                {money(summary.today.salesRevenue)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <div><p className="text-[11px] text-slate-500">Recorded expenses today</p><p className="mt-1 text-sm font-bold text-slate-900">{money(summary.today.operatingExpenses)}</p></div>
              <div><p className="text-[11px] text-slate-500">Confirmed bills today</p><p className="mt-1 text-sm font-bold text-slate-900">{summary.today.salesCount}</p></div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">₹</span><div><p className="text-xs text-slate-500">Sales · selected period</p><p className="mt-1 text-xl font-black text-slate-900">{money(summary.totals.salesRevenue)}</p></div></div>
              <p className="mt-3 text-[11px] text-slate-500">{summary.totals.recognizedSalesCount} confirmed bills</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><FileText className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Expenses · selected period</p><p className="mt-1 text-xl font-black text-slate-900">{money(summary.totals.expenses)}</p></div></div>
              <button onClick={() => onNavigateTab('expenses')} className="mt-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">View expenses</button>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Wallet className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Net profit · selected period</p><p className="mt-1 text-xl font-black text-slate-900">{money(summary.totals.netProfit)}</p></div></div>
              <p className="mt-3 text-[11px] text-slate-500">Recognized sales − COGS − recorded expenses</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Receipt className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Unique customers</p><p className="mt-1 text-xl font-black text-slate-900">{summary.totals.customerCount.toLocaleString('en-IN')}</p></div></div>
              <button onClick={() => onNavigateTab('customers')} className="mt-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">View customers</button>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Wallet className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Customer outstanding</p><p className="mt-1 text-xl font-black text-slate-900">{money(summary.totals.dues.customerOutstanding)}</p></div></div>
              <button onClick={() => onNavigateTab('dues')} className="mt-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">Review dues</button>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Truck className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Supplier outstanding</p><p className="mt-1 text-xl font-black text-slate-900">{money(summary.totals.dues.supplierOutstanding)}</p></div></div>
              <button onClick={() => onNavigateTab('dues')} className="mt-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">Review supplier dues</button>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><BriefcaseBusiness className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Employees & payroll</p><p className="mt-1 text-xl font-black text-slate-900">{summary.totals.employees ? `${summary.totals.employees.active} active / ${summary.totals.employees.total}` : 'Restricted'}</p></div></div>
              {summary.totals.employees && <><p className="mt-2 text-[11px] text-slate-500">{summary.totals.employees.payrollPaymentCount} payments · {money(summary.totals.employees.payrollPaid)} in selected period</p><button onClick={() => onNavigateTab('payroll')} className="mt-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">View payroll</button></>}
            </article>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs xl:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Daily sales trend</h2>
                  <p className="mt-1 text-[11px] text-slate-500">{summary.range.startDate} – {summary.range.endDate}</p>
                </div>
                <select
                  aria-label="Dashboard date range"
                  value={selectedPeriod}
                  onChange={(event) => onPeriodChange(event.target.value as DashboardSummary['period'])}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="month">This month</option>
                </select>
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                    <Tooltip formatter={(value) => [money(value === null || value === undefined ? null : Number(value)), 'Sales revenue']} labelFormatter={(label) => dateLabel(String(label))} />
                    <Area type="monotone" dataKey="salesRevenue" name="Sales revenue" stroke="#059669" strokeWidth={2.5} fill="url(#salesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {trend.length === 0 && <p className="text-center text-xs text-slate-400">No dates in this reporting period.</p>}
            </div>
            <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-xs xl:col-span-4">
              <div>
                <h2 className="mb-4 text-sm font-bold text-slate-900">Top selling products</h2>
                {topProducts.length ? (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={product.productId} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-5 shrink-0 font-mono font-bold text-slate-400">{index + 1}</span>
                          <div className="min-w-0"><p className="truncate font-semibold text-slate-800">{product.name}</p><p className="text-[10px] text-slate-400">{product.category}</p></div>
                        </div>
                        <span className="shrink-0 font-mono font-semibold text-slate-600">{product.quantity.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-6 text-center text-xs text-slate-400">No confirmed sales in this period.</p>}
              </div>
              <button onClick={() => onNavigateTab('inventory')} className="mt-5 border-t border-slate-100 pt-4 text-left text-xs font-bold text-emerald-700 hover:text-emerald-800">Manage stock →</button>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
            <span className="mr-2 text-xs font-bold uppercase tracking-wide text-slate-500">Quick actions:</span>
            <button onClick={onOpenNewBill} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Receipt className="h-3.5 w-3.5" />Create bill</button>
            <button onClick={onOpenAddProduct} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"><Package className="h-3.5 w-3.5" />Add product</button>
            <button onClick={() => onNavigateTab('suppliers')} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200"><Truck className="h-3.5 w-3.5" />Scan supplier receipt</button>
          </div>
        </>
      )}
    </div>
  );
};
