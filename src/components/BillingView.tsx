import React, { useEffect, useRef, useState } from 'react';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Printer, 
  User, 
  Sparkles,
  Receipt,
  ScanLine,
  MapPin
} from 'lucide-react';
import { Product, Customer, Bill, BillItem } from '../types';
import confetti from 'canvas-confetti';

interface BillingViewProps {
  products: Product[];
  customers: Customer[];
  bills: Bill[];
  onGenerateBill: (newBill: Bill, updatedCustomer?: Customer) => Promise<Bill>;
  onReprintBill: (bill: Bill) => void;
  cart: BillItem[];
  setCart: React.Dispatch<React.SetStateAction<BillItem[]>>;
  onOpenVoice: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  products,
  customers,
  bills,
  onGenerateBill,
  onReprintBill,
  cart,
  setCart,
  onOpenVoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('c3'); // Amit Sharma default
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI / Online' | 'Pending Credit (Udhaar)'>('Cash');
  const [isBarcodeActive, setIsBarcodeActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const idempotencyKey = useRef('');

  useEffect(() => {
    idempotencyKey.current = '';
  }, [cart, selectedCustomerId, paymentMode]);

  // Filter products by search query
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.price }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${product.id}`,
          productId: product.id,
          name: product.name,
          price: product.sellingPrice,
          qty: 1,
          total: product.sellingPrice,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: newQty, total: newQty * item.price }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const total = subtotal;

  const handleCreateBill = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setFormError('');
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();

    const customer = customers.find((c) => c.id === selectedCustomerId);
    const newBill: Bill = {
      id: idempotencyKey.current,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerId: customer?.id,
      customerName: customer ? customer.name : 'Walk-in Customer',
      customerPhone: customer?.phone,
      customerLocation: customer ? customer.location : 'Counter Checkout, Local Customer',
      items: [...cart],
      subtotal,
      total,
      paymentMode,
      status: paymentMode === 'Pending Credit (Udhaar)' ? 'Pending Credit' : 'Paid',
    };

    let updatedCustomer: Customer | undefined;
    if (customer && paymentMode === 'Pending Credit (Udhaar)') {
      updatedCustomer = {
        ...customer,
        pendingAmount: customer.pendingAmount + total,
        totalPurchases: customer.totalPurchases + total,
        lastVisit: new Date().toISOString().split('T')[0],
      };
    } else if (customer) {
      updatedCustomer = {
        ...customer,
        totalPurchases: customer.totalPurchases + total,
        lastVisit: new Date().toISOString().split('T')[0],
      };
    }

    try {
      await onGenerateBill(newBill, updatedCustomer);
      idempotencyKey.current = '';
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#059669', '#10B981', '#34D399'],
      });
      setCart([]);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Bill</h1>
          <p className="text-xs text-slate-500 mt-0.5">Add items to create a new customer bill</p>
        </div>

        <button
          onClick={onOpenVoice}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors self-start"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Quick Voice Bill ("2 packet milk add karo")</span>
        </button>
      </div>

      {/* 2-Column Split: Product Catalog Table vs Current Bill (Exact as reference screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Selector (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
          {/* Search bar with barcode scanner icon */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product (name or barcode)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            <button
              onClick={() => setIsBarcodeActive(!isBarcodeActive)}
              title="Barcode Scanner Mode"
              className={`p-2.5 rounded-xl border transition-colors ${
                isBarcodeActive
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Barcode className="w-4 h-4" />
            </button>
          </div>

          {isBarcodeActive && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <span className="flex items-center gap-1.5 font-medium">
                <ScanLine className="w-4 h-4 animate-pulse text-emerald-600" />
                Barcode Scanner Active: Ready to scan product EAN barcodes
              </span>
              <button
                onClick={() => addToCart(products[0])}
                className="underline text-[11px] font-bold"
              >
                Simulate Scan (Amul Milk)
              </button>
            </div>
          )}

          {/* Product Catalog Table (Exact as screenshot) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-semibold border-b border-slate-100 pb-2">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Stock</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= p.lowStockThreshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.category}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-800 tabular-nums">
                        ₹ {p.sellingPrice}
                      </td>

                      <td className="py-3 px-3 font-mono tabular-nums">
                        <span className={`text-xs font-semibold ${isLow ? 'text-amber-600' : 'text-slate-600'}`}>
                          {p.stock}
                        </span>
                        {isLow && (
                          <span className="block text-[9px] font-bold text-amber-600">Low Stock</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => addToCart(p)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Current Bill Cart (5 cols) (Exact as screenshot) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Current Bill</h3>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Customer Selection for Credit / Invoice */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Customer Name / Khata:
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
            >
              <option value="">Walk-in Customer (Cash / UPI)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) {c.pendingAmount > 0 ? `· Due: ₹${c.pendingAmount}` : ''}
                </option>
              ))}
            </select>

            {/* Display Customer Location preview */}
            {selectedCustomerId && (() => {
              const cust = customers.find((c) => c.id === selectedCustomerId);
              if (!cust) return null;
              return (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate"><strong>Customer Location:</strong> {cust.location}</span>
                </div>
              );
            })()}
          </div>

          {/* Cart Items Table (Exact as screenshot) */}
          <div className="overflow-x-auto min-h-[160px]">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-60" />
                <p className="font-semibold text-slate-500">Cart is empty</p>
                <p className="text-[11px] mt-0.5">Click "Add" on any product to start the bill</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 font-medium border-b border-slate-100">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2 w-20 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-2 font-medium text-slate-800">
                        {item.name}
                      </td>

                      <td className="py-2.5 px-1">
                        <div className="flex items-center justify-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                          <button
                            onClick={() => updateCartQty(item.productId, item.qty - 1)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-mono font-bold text-slate-900 text-xs w-5 text-center">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateCartQty(item.productId, item.qty + 1)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 text-right font-mono text-slate-600 tabular-nums">
                        ₹ {item.price}
                      </td>

                      <td className="py-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                        ₹ {item.total}
                      </td>

                      <td className="py-2.5 text-right pl-2">
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-slate-400 hover:text-rose-600 text-sm font-bold"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Payment Mode Selector */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Payment Mode:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Cash', 'UPI / Online', 'Pending Credit (Udhaar)'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all truncate ${
                    paymentMode === mode
                      ? mode === 'Pending Credit (Udhaar)'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Subtotal & Total (Exact as screenshot) */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">
                ₹ {subtotal}
              </span>
            </div>

            <div className="flex justify-between items-center text-lg font-black text-slate-900 pt-1">
              <span>Total</span>
              <span className="font-mono text-emerald-600 tabular-nums">
                ₹ {total}
              </span>
            </div>
          </div>

          {/* Generate Bill Green Button (Exact as screenshot) */}
          {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{formError}</p>}
          <button
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => { void handleCreateBill(); }}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving bill…' : 'Generate Bill'}</span>
          </button>
        </div>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Recent customer receipts</h2>
          <span className="text-xs text-slate-500">Reprint or save as PDF</span>
        </div>
        {bills.length === 0 ? <p className="text-sm text-slate-500">No completed bills yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Invoice</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Customer</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Total</th><th className="py-2 text-right">Receipt</th></tr></thead>
              <tbody className="divide-y">{bills.slice(0, 10).map((bill) => (
                <tr key={bill.id}>
                  <td className="py-3 pr-3 font-mono text-xs font-semibold">{bill.id}</td>
                  <td className="py-3 pr-3 text-slate-600">{bill.date} {bill.time}</td>
                  <td className="py-3 pr-3">{bill.customerName}</td>
                  <td className="py-3 pr-3 text-slate-600">{bill.status}</td>
                  <td className="py-3 text-right font-semibold">₹{bill.total.toLocaleString('en-IN')}</td>
                  <td className="py-3 text-right"><button type="button" onClick={() => onReprintBill(bill)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Open / Print</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
