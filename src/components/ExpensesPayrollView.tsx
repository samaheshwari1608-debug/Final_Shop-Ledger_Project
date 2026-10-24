import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Plus, Printer, WalletCards, X } from 'lucide-react';
import { Customer, Employee, ExpenseEntry, PayrollPayment, SupplierPurchase } from '../types';
import { downloadCsv } from '../utils/csv';

interface ExpensesPayrollViewProps {
  shopId: string;
  token: string;
  customers: Customer[];
  initialTab?: Tab;
}

type Tab = 'expenses' | 'payroll' | 'dues';

async function apiRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    payload = { error: `Server returned an invalid response (${response.status}).` };
  }
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status}).`);
  return payload as T;
}

const money = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const currentMonth = () => new Date().toISOString().slice(0, 7);

export const ExpensesPayrollView: React.FC<ExpensesPayrollViewProps> = ({ shopId, token, customers, initialTab = 'expenses' }) => {
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => setTab(initialTab), [initialTab]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [expenseFrom, setExpenseFrom] = useState('');
  const [expenseTo, setExpenseTo] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('All categories');
  const [duesFrom, setDuesFrom] = useState('');
  const [duesTo, setDuesTo] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PayrollPayment | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ title: '', category: 'Shop rent', vendor: '', date: new Date().toISOString().slice(0, 10), amount: '', paymentMethod: 'Cash', paymentStatus: 'Paid', referenceNumber: '', notes: '' });
  const [employeeForm, setEmployeeForm] = useState({ name: '', role: 'Staff', phone: '', monthlySalary: '', status: 'Active' });
  const [payForm, setPayForm] = useState({ employeeId: '', period: currentMonth(), bonus: '0', deduction: '0', paymentMethod: 'Bank transfer', referenceNumber: '' });

  const loadFinanceData = async () => {
    const [expenseData, payrollData, purchaseData] = await Promise.all([
      apiRequest<{ items: ExpenseEntry[] }>(`/api/shops/${shopId}/expenses`, token),
      apiRequest<{ employees: Employee[]; payments: PayrollPayment[] }>(`/api/shops/${shopId}/payroll`, token),
      apiRequest<{ items: SupplierPurchase[] }>(`/api/shops/${shopId}/purchases`, token),
    ]);
    setExpenses(expenseData.items || []);
    setEmployees(payrollData.employees || []);
    setPayments(payrollData.payments || []);
    setPurchases(purchaseData.items || []);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ items: ExpenseEntry[] }>(`/api/shops/${shopId}/expenses`, token),
      apiRequest<{ employees: Employee[]; payments: PayrollPayment[] }>(`/api/shops/${shopId}/payroll`, token),
      apiRequest<{ items: SupplierPurchase[] }>(`/api/shops/${shopId}/purchases`, token),
    ]).then(([expenseData, payrollData, purchaseData]) => {
      if (!active) return;
      setExpenses(expenseData.items || []);
      setEmployees(payrollData.employees || []);
      setPayments(payrollData.payments || []);
      setPurchases(purchaseData.items || []);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load financial records.');
    });
    return () => { active = false; };
  }, [shopId, token]);

  const saveExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setBusy(true);
    try {
      const result = await apiRequest<{ expense: ExpenseEntry }>(`/api/shops/${shopId}/expenses`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) }),
      });
      setExpenses((previous) => [result.expense, ...previous]);
      setExpenseForm({ title: '', category: 'Shop rent', vendor: '', date: new Date().toISOString().slice(0, 10), amount: '', paymentMethod: 'Cash', paymentStatus: 'Paid', referenceNumber: '', notes: '' });
      setStatus('Expense saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save expense.');
    } finally {
      setBusy(false);
    }
  };

  const addEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setBusy(true);
    try {
      await apiRequest(`/api/shops/${shopId}/employees${editingEmployeeId ? `/${editingEmployeeId}` : ''}`, token, {
        method: editingEmployeeId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...employeeForm, monthlySalary: Number(employeeForm.monthlySalary) }),
      });
      await loadFinanceData();
      setEmployeeForm({ name: '', role: 'Staff', phone: '', monthlySalary: '', status: 'Active' });
      setEditingEmployeeId('');
      setStatus(editingEmployeeId ? 'Employee profile updated. Salary changes are retained in the audit history.' : 'Employee profile saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save employee.');
    } finally {
      setBusy(false);
    }
  };

  const recordPayroll = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setBusy(true);
    try {
      await apiRequest(`/api/shops/${shopId}/payroll/payments`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payForm,
          bonus: Number(payForm.bonus),
          deduction: Number(payForm.deduction),
        }),
      });
      await loadFinanceData();
      setStatus('Salary payment recorded and added to expenses.');
      setPayForm((previous) => ({ ...previous, referenceNumber: '', bonus: '0', deduction: '0' }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not record salary payment.');
    } finally {
      setBusy(false);
    }
  };

  const activeEmployees = employees.filter((employee) => employee.status === 'Active');
  const salaryDue = activeEmployees.reduce((sum, employee) => {
    const paid = payments.some((payment) => payment.employeeId === employee.id && payment.period === currentMonth());
    return sum + (paid ? 0 : employee.monthlySalary);
  }, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const filteredExpenses = expenses.filter((expense) =>
    (!expenseFrom || expense.date >= expenseFrom)
    && (!expenseTo || expense.date <= expenseTo)
    && (expenseCategory === 'All categories' || expense.category === expenseCategory),
  );
  const filteredPurchases = purchases.filter((purchase) =>
    (!duesFrom || purchase.date >= duesFrom) && (!duesTo || purchase.date <= duesTo),
  );
  const customerDues = customers.filter((customer) => customer.pendingAmount > 0);
  const supplierDues = filteredPurchases.filter((purchase) => purchase.payable > 0);
  const categoryOptions = Array.from(new Set(expenses.map((expense) => expense.category))).sort();

  const exportExpenses = () => downloadCsv('shopledger-expenses.csv', [
    ['Expense', 'Category', 'Vendor', 'Date', 'Amount', 'Payment status', 'Payment method', 'Reference', 'Notes'],
    ...filteredExpenses.map((expense) => [
      expense.title, expense.category, expense.vendor, expense.date, expense.amount,
      expense.paymentStatus || 'Paid', expense.paymentMethod, expense.referenceNumber, expense.notes,
    ]),
  ]);

  const exportDues = () => downloadCsv('shopledger-dues.csv', [
    ['Type', 'Name', 'Invoice / reference', 'Due date', 'Original amount', 'Amount paid', 'Outstanding balance'],
    ...customerDues.map((customer) => [
      'Customer', customer.name, '', 'Not recorded', 'Not tracked', 'Not tracked', customer.pendingAmount,
    ]),
    ...supplierDues.map((purchase) => [
      'Supplier', purchase.supplier, purchase.invoiceNumber, 'Not recorded', purchase.total, purchase.amountPaid, purchase.payable,
    ]),
  ]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#0F172A]">Expenses & Payroll</h1>
        <p className="mt-1 text-sm text-slate-600">Track operating spend and record employee salary payments.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5"><p className="text-sm text-slate-500">Recorded expenses</p><p className="mt-1 text-2xl font-bold text-[#0F172A]">{money(totalExpenses)}</p></article>
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5"><p className="text-sm text-slate-500">Active employees</p><p className="mt-1 text-2xl font-bold text-[#0F172A]">{activeEmployees.length}</p></article>
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5"><p className="text-sm text-slate-500">Current month salary due</p><p className="mt-1 text-2xl font-bold text-amber-700">{money(salaryDue)}</p></article>
      </div>

      <nav className="flex gap-2" aria-label="Financial management sections">
        <button type="button" onClick={() => setTab('expenses')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'expenses' ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>Expenses</button>
        <button type="button" onClick={() => setTab('dues')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'dues' ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>Dues</button>
        <button type="button" onClick={() => setTab('payroll')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'payroll' ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>Employees & payroll</button>
      </nav>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {status && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />{status}</p>}

      {tab === 'expenses' ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
          <form onSubmit={saveExpense} className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="font-semibold text-[#0F172A]">Add an expense</h2>
            <label className="block text-sm font-medium text-slate-700">Title<input required value={expenseForm.title} onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="block text-sm font-medium text-slate-700">Category<select value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{['Shop rent', 'Electricity', 'Internet and phone', 'Transportation and delivery', 'Packaging', 'Repairs and maintenance', 'Marketing', 'Equipment and supplies', 'Bank/payment processing charges', 'Other expenses'].map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="block text-sm font-medium text-slate-700">Payee / vendor<input required value={expenseForm.vendor} onChange={(event) => setExpenseForm({ ...expenseForm, vendor: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-slate-700">Amount<input type="number" min="0.01" step="0.01" required value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium text-slate-700">Date<input type="date" required value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-slate-700">Payment status<select value={expenseForm.paymentStatus} onChange={(event) => setExpenseForm({ ...expenseForm, paymentStatus: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option>Paid</option><option>Unpaid</option></select></label>
              <label className="text-sm font-medium text-slate-700">Method<input value={expenseForm.paymentMethod} onChange={(event) => setExpenseForm({ ...expenseForm, paymentMethod: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            </div>
            <label className="block text-sm font-medium text-slate-700">Reference / notes<input value={expenseForm.referenceNumber} onChange={(event) => setExpenseForm({ ...expenseForm, referenceNumber: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 py-3 font-semibold text-white hover:bg-[#047857] disabled:opacity-60"><Plus className="h-4 w-4" />Save expense</button>
          </form>
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-semibold text-[#0F172A]">Expenses</h2>
              <button type="button" onClick={exportExpenses} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Export CSV</button>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-medium text-slate-600">From<input type="date" value={expenseFrom} onChange={(event) => setExpenseFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600">To<input type="date" value={expenseTo} onChange={(event) => setExpenseTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600">Category<select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"><option>All categories</option>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>
            {filteredExpenses.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Expense</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Amount</th></tr></thead><tbody className="divide-y">{filteredExpenses.map((expense) => <tr key={expense.id}><td className="py-3 pr-3"><strong className="block text-[#0F172A]">{expense.title}</strong><span className="text-xs text-slate-500">{expense.category} · {expense.vendor}</span></td><td className="py-3 pr-3 text-slate-600">{expense.date}</td><td className="py-3 pr-3 text-slate-600">{expense.paymentStatus || 'Paid'}</td><td className="py-3 text-right font-semibold">{money(expense.amount)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No expense entries match these filters.</p>}
          </section>
        </div>
      ) : tab === 'dues' ? (
        <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="font-semibold text-[#0F172A]">Outstanding dues</h2><p className="mt-1 text-xs text-slate-500">Customer balances are current totals. Historic customer original/paid amounts are not tracked in this ledger.</p></div>
            <button type="button" onClick={exportDues} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Export dues CSV</button>
          </header>
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">Supplier purchases from<input type="date" value={duesFrom} onChange={(event) => setDuesFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600">Supplier purchases to<input type="date" value={duesTo} onChange={(event) => setDuesTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" /></label>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Invoice</th><th className="py-2 text-right">Outstanding</th></tr></thead><tbody className="divide-y">
            {customerDues.map((customer) => <tr key={`customer-${customer.id}`}><td className="py-3 pr-3">Customer</td><td className="py-3 pr-3">{customer.name}</td><td className="py-3 pr-3">Not tracked</td><td className="py-3 text-right font-semibold">{money(customer.pendingAmount)}</td></tr>)}
            {supplierDues.map((purchase) => <tr key={`supplier-${purchase.id}`}><td className="py-3 pr-3">Supplier</td><td className="py-3 pr-3">{purchase.supplier}</td><td className="py-3 pr-3">{purchase.invoiceNumber || '—'}</td><td className="py-3 text-right font-semibold">{money(purchase.payable)}</td></tr>)}
            {!customerDues.length && !supplierDues.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No outstanding balances.</td></tr>}
          </tbody></table></div>
        </section>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <div className="space-y-5">
            <form onSubmit={addEmployee} className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="font-semibold text-[#0F172A]">{editingEmployeeId ? 'Edit employee' : 'Add employee'}</h2>
              <label className="block text-sm font-medium text-slate-700">Name<input required value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">Role<input value={employeeForm.role} onChange={(event) => setEmployeeForm({ ...employeeForm, role: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Phone (optional)<input value={employeeForm.phone} onChange={(event) => setEmployeeForm({ ...employeeForm, phone: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div>
              <label className="block text-sm font-medium text-slate-700">Monthly salary<input type="number" min="0.01" step="0.01" required value={employeeForm.monthlySalary} onChange={(event) => setEmployeeForm({ ...employeeForm, monthlySalary: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="block text-sm font-medium text-slate-700">Status<select value={employeeForm.status} onChange={(event) => setEmployeeForm({ ...employeeForm, status: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option>Active</option><option>Inactive</option></select></label>
              <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 py-3 font-semibold text-white hover:bg-[#047857] disabled:opacity-60"><Plus className="h-4 w-4" />{editingEmployeeId ? 'Update employee' : 'Save employee'}</button>
            </form>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5"><h2 className="mb-3 font-semibold text-[#0F172A]">Employees</h2>{employees.length ? <ul className="divide-y">{employees.map((employee) => <li key={employee.id} className="flex items-center justify-between gap-3 py-3"><span><strong className="block">{employee.name}</strong><small className="text-slate-500">{employee.role} · {employee.status}</small></span><span className="text-right font-semibold">{money(employee.monthlySalary)}<small className="block font-normal text-slate-500">monthly</small><button type="button" onClick={() => { setEditingEmployeeId(employee.id); setEmployeeForm({ name: employee.name, role: employee.role, phone: employee.phone || '', monthlySalary: String(employee.monthlySalary), status: employee.status }); }} className="mt-1 text-xs font-semibold text-emerald-700 underline">Edit</button></span></li>)}</ul> : <p className="text-sm text-slate-500">No employees added yet.</p>}</div>
          </div>
          <div className="space-y-5">
            <form onSubmit={recordPayroll} className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="font-semibold text-[#0F172A]">Record salary payment</h2>
              <label className="block text-sm font-medium text-slate-700">Employee<select required value={payForm.employeeId} onChange={(event) => setPayForm({ ...payForm, employeeId: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Select employee</option>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {money(employee.monthlySalary)}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">Salary period<input type="month" required value={payForm.period} onChange={(event) => setPayForm({ ...payForm, period: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Payment method<input required value={payForm.paymentMethod} onChange={(event) => setPayForm({ ...payForm, paymentMethod: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div>
              <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">Bonus<input type="number" min="0" step="0.01" value={payForm.bonus} onChange={(event) => setPayForm({ ...payForm, bonus: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Approved deduction<input type="number" min="0" step="0.01" value={payForm.deduction} onChange={(event) => setPayForm({ ...payForm, deduction: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div>
              <label className="block text-sm font-medium text-slate-700">Payment reference<input required value={payForm.referenceNumber} onChange={(event) => setPayForm({ ...payForm, referenceNumber: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><WalletCards className="mr-2 inline h-4 w-4" />A recorded payment is final and cannot be repeated for the same employee/month.</p>
              <button disabled={busy || activeEmployees.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 py-3 font-semibold text-white hover:bg-[#047857] disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />Record payment</button>
            </form>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5"><h2 className="mb-3 font-semibold text-[#0F172A]">Payment ledger</h2>{payments.length ? <ul className="divide-y">{payments.map((payment) => { const employee = employees.find((entry) => entry.id === payment.employeeId); return <li key={payment.id} className="flex items-center justify-between gap-3 py-3"><span><strong className="block">{employee?.name || 'Former employee'} · {payment.period}</strong><small className="text-slate-500">{payment.paymentMethod} · ref {payment.referenceNumber}</small></span><span className="flex items-center gap-2 font-semibold">{money(payment.amount)}<button type="button" onClick={() => setSelectedPayment(payment)} aria-label={`Open salary slip for ${employee?.name || 'employee'}`} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Printer className="h-4 w-4" /></button></span></li>; })}</ul> : <p className="text-sm text-slate-500">No salary payments recorded.</p>}</div>
          </div>
        </div>
      )}
      {selectedPayment && (
        <div role="dialog" aria-modal="true" aria-labelledby="salary-slip-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex justify-between"><h2 id="salary-slip-title" className="font-bold text-[#0F172A]">Salary payment receipt</h2><button type="button" onClick={() => setSelectedPayment(null)} aria-label="Close salary slip"><X className="h-5 w-5" /></button></div>
            <article className="receipt-print-area receipt-a4 mx-auto space-y-3 border border-slate-200 p-6 text-sm text-[#0F172A]">
              <h3 className="text-lg font-bold">Salary slip · {selectedPayment.period}</h3>
              <p>Employee: {employees.find((employee) => employee.id === selectedPayment.employeeId)?.name || 'Former employee'}</p>
              <p>Payment date: {new Date(selectedPayment.paidAt).toLocaleDateString()}</p>
              <div className="border-y border-dashed py-3">
                <p className="flex justify-between"><span>Base salary</span><strong>{money(selectedPayment.baseSalary)}</strong></p>
                <p className="flex justify-between"><span>Bonus</span><strong>{money(selectedPayment.bonus)}</strong></p>
                <p className="flex justify-between"><span>Approved deductions</span><strong>- {money(selectedPayment.deduction)}</strong></p>
              </div>
              <p className="flex justify-between text-base"><strong>Paid amount</strong><strong>{money(selectedPayment.amount)}</strong></p>
              <p className="text-xs text-slate-600">Method: {selectedPayment.paymentMethod} · Reference: {selectedPayment.referenceNumber}</p>
            </article>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 font-semibold text-white hover:bg-[#047857]"><Printer className="h-4 w-4" />Print / Save PDF</button></div>
          </div>
        </div>
      )}
    </section>
  );
};
