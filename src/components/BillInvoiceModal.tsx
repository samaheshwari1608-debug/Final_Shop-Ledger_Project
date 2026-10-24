import React, { useState } from 'react';
import { X, Printer, CheckCircle2, Share2, Receipt } from 'lucide-react';
import { Bill, ShopkeeperProfile } from '../types';

interface BillInvoiceModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  shopkeeper: ShopkeeperProfile;
}

export const BillInvoiceModal: React.FC<BillInvoiceModalProps> = ({
  bill,
  isOpen,
  onClose,
  shopkeeper,
}) => {
  const [layout, setLayout] = useState<'thermal' | 'a4'>('thermal');
  if (!isOpen || !bill) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              {bill.id}
            </span>
            <span className="text-xs font-bold text-slate-800">Customer Bill Generated</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => window.print()} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" title="Print receipt or save as PDF">
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Style Retail Bill */}
        <div className="p-6 bg-slate-50/60">
          <div className="mb-3 flex justify-end gap-2">
            <button type="button" onClick={() => setLayout('thermal')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${layout === 'thermal' ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>Thermal</button>
            <button type="button" onClick={() => setLayout('a4')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${layout === 'a4' ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>A4</button>
          </div>
          <div id="customer-receipt-print" className={`receipt-print-area receipt-${layout} mx-auto bg-white border border-slate-200 rounded-2xl p-5 font-mono text-xs text-slate-800 shadow-sm space-y-4`}>
            {/* Shop Header (Own location removed) */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {shopkeeper.shopName}
              </h3>
              <p className="text-[10px] text-slate-500">Phone: +91 {shopkeeper.phone}</p>
              {shopkeeper.gstNumber && (
                <p className="text-[10px] text-slate-400">GSTIN: {shopkeeper.gstNumber}</p>
              )}
            </div>

            {/* Bill & Customer Metadata with Customer's Location */}
            <div className="text-[11px] text-slate-600 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <div className="flex justify-between">
                <span>Bill ID: {bill.id}</span>
                <span>Date: {bill.date} {bill.time}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Customer: {bill.customerName}</span>
                {bill.customerPhone && <span>Ph: {bill.customerPhone}</span>}
              </div>
              {bill.customerLocation && (
                <div className="flex items-start gap-1 text-[10px] text-slate-700 pt-1 border-t border-slate-200">
                  <span className="font-semibold shrink-0">Customer Location:</span>
                  <span className="text-slate-600">{bill.customerLocation}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Payment Mode:</span>
                <span className="font-bold text-emerald-700">{bill.paymentMode}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Amount paid:</span>
                <span className="font-bold text-slate-800">{bill.status === 'Paid' ? `₹ ${bill.total.toFixed(2)}` : '₹ 0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Balance due:</span>
                <span className="font-bold text-amber-700">{bill.status === 'Paid' ? '₹ 0.00' : `₹ ${bill.total.toFixed(2)}`}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2 border-t border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between font-bold text-slate-400 text-[10px]">
                <span>ITEM</span>
                <span>QTY x RATE</span>
                <span>AMOUNT</span>
              </div>

              {bill.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-800">
                  <span className="truncate pr-2 font-medium">{it.name}</span>
                  <span className="text-slate-500 text-[10px] shrink-0 font-mono">
                    {it.qty} x ₹{it.price}
                  </span>
                  <span className="font-bold font-mono shrink-0 tabular-nums">
                    ₹ {it.total}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-1 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Subtotal:</span>
                <span className="tabular-nums">₹ {bill.subtotal}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>GRAND TOTAL:</span>
                <span className="text-emerald-700 tabular-nums">₹ {bill.total}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
              <p>Thank you for shopping with us! Phir aayiye!</p>
              <p className="mt-1 font-mono tracking-widest text-slate-400">||| | ||||| || |||||| | |||</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
          <span className="text-xs text-slate-400">Bill saved to ledger & inventory deducted</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
          >
            Done & Next Bill
          </button>
        </div>
      </div>
    </div>
  );
};
