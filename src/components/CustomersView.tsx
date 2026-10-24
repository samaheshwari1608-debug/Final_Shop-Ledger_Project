import React, { useRef, useState } from 'react';
import { 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Edit3, 
  Trash2, 
  Wallet, 
  CheckCircle2, 
  Share2,
  Receipt,
  ArrowDownLeft
} from 'lucide-react';
import { Customer } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  onOpenAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onSettlePayment: (customerId: string, amount: number, paymentMethod: string, referenceNumber: string, idempotencyKey: string) => Promise<void>;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onOpenAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onSettlePayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [settlingCustomer, setSettlingCustomer] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const paymentIdempotencyKey = useRef('');

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.location.toLowerCase().includes(q)
    );
  });

  const totalCreditGiven = customers.reduce((acc, c) => acc + c.pendingAmount, 0);

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingCustomer || isSavingPayment) return;
    const amt = parseFloat(settleAmount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > settlingCustomer.pendingAmount || !paymentReference.trim()) {
      setPaymentError('Enter a valid amount within the outstanding balance and a payment reference.');
      return;
    }
    setIsSavingPayment(true);
    setPaymentError('');
    if (!paymentIdempotencyKey.current) paymentIdempotencyKey.current = crypto.randomUUID();
    try {
      await onSettlePayment(settlingCustomer.id, amt, paymentMethod, paymentReference.trim(), paymentIdempotencyKey.current);
      setSettlingCustomer(null);
      setSettleAmount('');
      setPaymentReference('');
      paymentIdempotencyKey.current = '';
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Could not record customer payment.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header (Exact as screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your customers and credit</p>
        </div>

        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Credit Overview Mini Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Total Khata / Customers</span>
            <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">{customers.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            👥
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Total Pending Credit (Udhaar)</span>
            <span className="text-xl font-black text-amber-600 font-mono tabular-nums">
              ₹ {totalCreditGiven.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            ₹
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Active Credit Customers</span>
            <span className="text-xl font-bold text-slate-800 font-mono tabular-nums">
              {customers.filter((c) => c.pendingAmount > 0).length}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            📋
          </div>
        </div>
      </div>

      {/* Main Table Card (Exact as screenshot) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name, phone or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 font-semibold border-b border-slate-100 pb-2">
              <tr>
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Customer Location</th>
                <th className="py-3 px-3">Total Purchases</th>
                <th className="py-3 px-3">Pending Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No customers match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const hasDue = c.pendingAmount > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{c.name}</p>
                            <p className="text-[10px] text-slate-400">Last visited: {c.lastVisit}</p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3 font-mono font-medium text-slate-600">
                        {c.phone}
                      </td>

                      {/* Customer Location */}
                      <td className="py-3.5 px-3 text-slate-600 max-w-[220px]">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="truncate" title={c.location}>{c.location}</span>
                        </div>
                      </td>

                      {/* Total Purchases */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900 tabular-nums">
                        ₹ {c.totalPurchases.toLocaleString('en-IN')}
                      </td>

                      {/* Pending Due Amount (Udhaar) (Exact as screenshot) */}
                      <td className="py-3.5 px-3 font-mono font-bold tabular-nums">
                        {hasDue ? (
                          <span className="text-amber-600">
                            ₹ {c.pendingAmount.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-emerald-600">₹ 0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasDue && (
                            <button
                              onClick={() => {
                                setSettlingCustomer(c);
                                setSettleAmount(c.pendingAmount.toString());
                                setPaymentMethod('Cash');
                                setPaymentReference('');
                                setPaymentError('');
                                paymentIdempotencyKey.current = '';
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                              title="Record payment from customer"
                            >
                              Settle ₹
                            </button>
                          )}

                          <button
                            onClick={() => onEditCustomer(c)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit customer details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteCustomer(c.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Khata Payment Modal */}
      {settlingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Record Khata Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer: <span className="font-semibold text-slate-800">{settlingCustomer.name}</span>
            </p>
            <p className="text-xs text-amber-600 font-semibold mt-1">
              Current Due: ₹ {settlingCustomer.pendingAmount}
            </p>

            <form onSubmit={handleSettleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  max={settlingCustomer.pendingAmount}
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment method</label>
                <input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference</label>
                <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" />
              </div>
              {paymentError && <p role="alert" className="text-xs text-red-600">{paymentError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingCustomer(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPayment}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  {isSavingPayment ? 'Saving…' : 'Confirm Settle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
