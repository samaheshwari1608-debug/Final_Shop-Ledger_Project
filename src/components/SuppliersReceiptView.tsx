import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, FileText, LoaderCircle, Plus, ReceiptText, Upload, X } from 'lucide-react';
import { SupplierPayment, SupplierPurchase, SupplierReceipt } from '../types';

interface SuppliersReceiptViewProps {
  shopId: string;
  token: string;
  receipts: SupplierReceipt[];
  onSaved: (receipt: SupplierReceipt) => void;
}

interface ReceiptItemDraft {
  name: string;
  qty: string;
  quantityText: string;
  unitPrice: string;
  total: string;
  confidence?: number;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, {
    ...init,
    headers,
  });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    payload = { error: `Server returned an unreadable response (${response.status}).` };
  }
  if (!response.ok) {
    const error = new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status}).`);
    Object.assign(error, {
      existingReceiptId: payload.existingReceiptId,
      potentialDuplicate: payload.potentialDuplicate,
      possibleDuplicates: payload.possibleDuplicates,
    });
    throw error;
  }
  return payload as T;
}

const today = () => new Date().toISOString().slice(0, 10);
const currency = (value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const SuppliersReceiptView: React.FC<SuppliersReceiptViewProps> = ({ shopId, token, receipts, onSaved }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const paymentKeys = useRef<Record<string, { fingerprint: string; key: string }>>({});
  const [fileData, setFileData] = useState('');
  const [fileMime, setFileMime] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileHash, setFileHash] = useState('');
  const [fileExtension, setFileExtension] = useState<'jpg' | 'png' | 'pdf'>();
  const [receiptType, setReceiptType] = useState<'computer' | 'handwritten' | ''>('');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(today());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [category, setCategory] = useState('Supplier purchases');
  const [transactionType, setTransactionType] = useState<'purchase' | 'expense'>('purchase');
  const [subtotal, setSubtotal] = useState('');
  const [taxes, setTaxes] = useState('');
  const [discounts, setDiscounts] = useState('');
  const [total, setTotal] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { amount: string; method: string; reference: string }>>({});
  const [items, setItems] = useState<ReceiptItemDraft[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ocrWarning, setOcrWarning] = useState('');
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [potentialDuplicate, setPotentialDuplicate] = useState<{ id: string; vendor: string; date: string; receiptNumber?: string; total: number } | null>(null);
  const [confirmedPotentialDuplicateId, setConfirmedPotentialDuplicateId] = useState('');

  useEffect(() => {
    fetch('/api/health')
      .then(async (response) => {
        if (!response.ok) throw new Error('AI configuration status is unavailable.');
        const health = await response.json() as { features?: { receiptAiConfigured?: boolean } };
        setAiConfigured(Boolean(health.features?.receiptAiConfigured));
      })
      .catch(() => setAiConfigured(null));
    request<{ items: SupplierPurchase[]; payments: SupplierPayment[] }>(`/api/shops/${shopId}/purchases`, token)
      .then((result) => {
        setPurchases(result.items || []);
        setSupplierPayments(result.payments || []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not load supplier purchases.'));
  }, [shopId, token]);

  const calculatedTotal = useMemo(
    () => items.reduce((sum, item) => sum + Math.round((Number.parseFloat(item.qty) || 0) * (Number(item.unitPrice) || 0) * 100), 0) / 100,
    [items],
  );
  const enteredLinesTotal = items.reduce((sum, item) => sum + Math.round((Number(item.total) || 0) * 100), 0) / 100;
  const totalsMismatch = items.length > 0 && total !== '' && Math.abs(calculatedTotal - Number(total)) > 0.01;
  const subtotalMismatch = items.length > 0 && subtotal !== '' && Math.abs(enteredLinesTotal - Number(subtotal)) > 0.01;
  const invoiceMathMismatch = subtotal !== '' && total !== ''
    && Math.abs(Number(subtotal) + (Number(taxes) || 0) - (Number(discounts) || 0) - Number(total)) > 0.01;
  const updateItem = (index: number, field: keyof ReceiptItemDraft, value: string) => {
    setItems((previous) => previous.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (field === 'qty' || field === 'unitPrice') {
        next.total = ((Number.parseFloat(next.qty) || 0) * (Number(next.unitPrice) || 0)).toFixed(2);
      }
      return next;
    }));
  };

  const handleFile = async (file?: File) => {
    setError('');
    setMessage('');
    setOcrWarning('');
    setFileHash('');
    setReceiptType('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setError('Choose a JPG, PNG, or PDF file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Receipt files must be 8 MB or smaller.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read this file.'));
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this file.'));
        reader.readAsDataURL(file);
      });
      const upload = await request<{
        documentHash: string;
        extension: 'jpg' | 'png' | 'pdf';
        duplicate?: boolean;
        existingReceiptId?: string;
      }>(`/api/shops/${shopId}/receipt-documents`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataUrl, mimeType: file.type }),
      });
      if (upload.duplicate) {
        setError(`Duplicate receipt detected. This receipt has already been recorded.${upload.existingReceiptId ? ` Existing receipt: ${upload.existingReceiptId}.` : ''}`);
        return;
      }
      setFileData(dataUrl);
      setFileMime(file.type);
      setFileName(file.name);
      setFileHash(upload.documentHash);
      setFileExtension(upload.extension);
      setMessage('Select the receipt type before extracting its details.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const extractReceipt = async () => {
    if (!receiptType || !fileData) return;
    setBusy(true);
    setError('');
    setOcrWarning('');
    try {
      const result = await request<{ extraction?: Record<string, unknown> }>(`/api/shops/${shopId}/receipt-documents/extract`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: fileData, mimeType: fileMime, receiptType }),
      });
      const extracted = result.extraction || {};
      if (typeof extracted.vendor === 'string') setVendor(extracted.vendor);
      if (typeof extracted.date === 'string' && extracted.date) setDate(extracted.date);
      if (typeof extracted.receiptNumber === 'string') setInvoiceNumber(extracted.receiptNumber);
      if (typeof extracted.category === 'string' && extracted.category) setCategory(extracted.category);
      if (typeof extracted.subtotal === 'number') setSubtotal(String(extracted.subtotal));
      if (typeof extracted.taxes === 'number') setTaxes(String(extracted.taxes));
      if (typeof extracted.discounts === 'number') setDiscounts(String(extracted.discounts));
      if (typeof extracted.total === 'number') setTotal(String(extracted.total));
      if (typeof extracted.amountPaid === 'number') setAmountPaid(String(extracted.amountPaid));
      if (Array.isArray(extracted.items)) {
        setItems(extracted.items.map((candidate) => {
          const item = candidate as Record<string, unknown>;
          const quantityText = String(item.quantityText || item.qty || '');
          return {
            name: String(item.name || ''),
            qty: item.qty === null || item.qty === undefined ? '' : String(Number.parseFloat(String(item.qty)) || ''),
            quantityText,
            unitPrice: item.unitPrice === null || item.unitPrice === undefined ? '' : String(item.unitPrice),
            total: item.total === null || item.total === undefined ? '' : String(item.total),
            confidence: typeof item.confidence === 'number' ? item.confidence : undefined,
          };
        }));
      }
      setMessage('Receipt extracted. Verify every field before approval.');
    } catch (extractError) {
      setOcrWarning(extractError instanceof Error ? extractError.message : 'AI extraction is unavailable; enter details manually.');
    } finally {
      setBusy(false);
    }
  };

  const addItem = () => setItems((previous) => [...previous, { name: '', qty: '1', quantityText: '1', unitPrice: '', total: '' }]);

  const saveReceipt = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setPotentialDuplicate(null);
    if (!vendor.trim() || !Number.isFinite(Number(total)) || Number(total) <= 0) {
      setError('Supplier name and a positive invoice total are required.');
      return;
    }
    if (fileData && !receiptType) {
      setError('Select whether the uploaded receipt is printed or handwritten.');
      return;
    }
    if (totalsMismatch && !window.confirm(`Line items add up to ${currency(calculatedTotal)}, but the printed total is ${currency(Number(total))}. Continue after verifying the receipt?`)) return;
    setBusy(true);
    try {
      const result = await request<{ receipt: SupplierReceipt; purchase?: SupplierPurchase }>(`/api/shops/${shopId}/receipts`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          vendor: vendor.trim(),
          date,
          receiptNumber: invoiceNumber.trim() || undefined,
          category,
          subtotal: subtotal === '' ? undefined : Number(subtotal),
          taxes: taxes === '' ? undefined : Number(taxes),
          discounts: discounts === '' ? undefined : Number(discounts),
          items: items.filter((item) => item.name.trim()).map((item) => ({
            name: item.name.trim(),
            qty: Number.parseFloat(item.qty),
            quantityText: item.quantityText,
            unitPrice: Number(item.unitPrice),
            total: Number(item.total),
          })),
          total: Number(total),
          amountPaid: amountPaid === '' ? 0 : Number(amountPaid),
          paymentMethod,
          paymentStatus: Number(amountPaid) >= Number(total) ? 'Paid' : Number(amountPaid) > 0 ? 'Partially Paid' : 'Unpaid',
          source: fileMime === 'application/pdf' ? 'pdf' : fileData ? 'photo' : 'manual',
          type: receiptType || 'computer',
          transactionType,
          documentHash: fileHash || undefined,
          documentExtension: fileExtension,
          confirmPotentialDuplicateId: confirmedPotentialDuplicateId || undefined,
        }),
      });
      onSaved(result.receipt);
      if (result.purchase) setPurchases((previous) => [result.purchase!, ...previous]);
      setVendor('');
      setDate(today());
      setInvoiceNumber('');
      setSubtotal('');
      setTaxes('');
      setDiscounts('');
      setTotal('');
      setAmountPaid('');
      setPaymentMethod('');
      setItems([]);
      setFileData('');
      setFileHash('');
      setFileName('');
      setReceiptType('');
      setPotentialDuplicate(null);
      setConfirmedPotentialDuplicateId('');
      setMessage('Receipt approved and saved. Inventory stock was not changed.');
    } catch (saveError) {
      const candidateError = saveError as Error & {
        potentialDuplicate?: boolean;
        possibleDuplicates?: Array<{ id: string; vendor: string; date: string; receiptNumber?: string; total: number }>;
      };
      if (candidateError.potentialDuplicate && candidateError.possibleDuplicates?.length) {
        setPotentialDuplicate(candidateError.possibleDuplicates[0]);
        setConfirmedPotentialDuplicateId('');
        setError(candidateError.message);
      } else {
        setError(saveError instanceof Error ? saveError.message : 'Could not save this receipt.');
      }
    } finally {
      setBusy(false);
    }
  };

  const recordSupplierPayment = async (purchase: SupplierPurchase) => {
    const draft = paymentDrafts[purchase.id];
    if (!draft || Number(draft.amount) <= 0 || !draft.method.trim() || !draft.reference.trim()) {
      setError('Enter payment amount, method, and reference.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const fingerprint = JSON.stringify(draft);
      if (paymentKeys.current[purchase.id]?.fingerprint !== fingerprint) {
        paymentKeys.current[purchase.id] = { fingerprint, key: crypto.randomUUID() };
      }
      const result = await request<{ purchase: SupplierPurchase; payment: SupplierPayment }>(
        `/api/shops/${shopId}/purchases/${purchase.id}/payments`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': paymentKeys.current[purchase.id].key },
          body: JSON.stringify({ amount: Number(draft.amount), paymentMethod: draft.method, referenceNumber: draft.reference }),
        },
      );
      setPurchases((previous) => previous.map((entry) => entry.id === purchase.id ? result.purchase : entry));
      setSupplierPayments((previous) => [result.payment, ...previous]);
      delete paymentKeys.current[purchase.id];
      setPaymentDrafts((previous) => ({ ...previous, [purchase.id]: { ...draft, amount: '', reference: '' } }));
      setMessage('Supplier payment recorded.');
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Could not record supplier payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Purchase Scanner</h1>
          <p className="text-sm text-slate-600">Upload a supplier invoice, verify its details, then approve it.</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm">
          <span className="text-slate-500">Recorded receipts </span>
          <strong className="text-[#0F172A]">{receipts.length}</strong>
        </div>
      </header>

      <form onSubmit={saveReceipt} className="space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="flex min-h-24 items-center justify-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 text-left hover:bg-emerald-50 disabled:opacity-60">
            <Camera className="h-5 w-5 text-[#059669]" />
            <span><strong className="block text-sm text-[#0F172A]">Scan with camera</strong><small className="text-slate-600">Opens your device camera when available</small></span>
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="flex min-h-24 items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-left hover:bg-slate-100 disabled:opacity-60">
            <Upload className="h-5 w-5 text-slate-700" />
            <span><strong className="block text-sm text-[#0F172A]">Upload invoice</strong><small className="text-slate-600">JPG, PNG, or PDF · maximum 8 MB</small></span>
          </button>
        </div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" className="hidden" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />

        {fileName && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <span className="flex items-center gap-2 truncate"><FileText className="h-4 w-4 shrink-0 text-[#059669]" />{fileName}</span>
            <button type="button" onClick={() => { setFileData(''); setFileName(''); setFileHash(''); setFileExtension(undefined); setReceiptType(''); }} aria-label="Remove uploaded file" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
          </div>
        )}
        {fileData && fileMime.startsWith('image/') && <img src={fileData} alt="Uploaded receipt preview" className="max-h-72 rounded-xl border border-slate-200 object-contain" />}
        {fileData && fileMime === 'application/pdf' && <iframe title="Uploaded receipt PDF preview" src={fileData} className="h-72 w-full rounded-xl border border-slate-200" />}

        {fileData && <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="min-w-52 flex-1 text-sm font-medium text-slate-700">Receipt type
            <select required value={receiptType} onChange={(event) => setReceiptType(event.target.value as 'computer' | 'handwritten' | '')} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Select before extraction</option><option value="computer">Computer-Generated / Printed</option><option value="handwritten">Handwritten</option>
            </select>
          </label>
          <button type="button" onClick={() => void extractReceipt()} disabled={busy || !receiptType} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">Extract receipt details</button>
          {receiptType === 'handwritten' && <p className="w-full text-xs text-slate-600">Handwriting extraction is best-effort. Review every value and enter unreadable details manually.</p>}
        </div>}

        {busy && <p className="flex items-center gap-2 text-sm text-[#047857]"><LoaderCircle className="h-4 w-4 animate-spin" />Processing…</p>}
        {aiConfigured === false && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4" />Receipt AI is not configured on this server. Add GEMINI_API_KEY to .env.local and restart; manual entry remains available.</p>}
        {ocrWarning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{ocrWarning}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {potentialDuplicate && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>Possible match: {potentialDuplicate.vendor} · {potentialDuplicate.date} · {potentialDuplicate.receiptNumber || potentialDuplicate.id} · {currency(potentialDuplicate.total)}. Existing record ID: {potentialDuplicate.id}.</p>
          <button type="button" onClick={() => setConfirmedPotentialDuplicateId(potentialDuplicate.id)} className="mt-2 rounded-lg border border-amber-500 px-3 py-1.5 font-semibold hover:bg-amber-100">
            {confirmedPotentialDuplicateId === potentialDuplicate.id ? 'Confirmed as a different receipt' : 'I reviewed this; this is a different receipt'}
          </button>
        </div>}
        {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />{message}</p>}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Transaction type
            <select value={transactionType} onChange={(event) => { setTransactionType(event.target.value as 'purchase' | 'expense'); setCategory(event.target.value === 'purchase' ? 'Supplier purchases' : 'Other expenses'); }} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="purchase">Inventory purchase</option><option value="expense">Other expense (no stock update)</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Supplier / payee
            <input required value={vendor} onChange={(event) => { setVendor(event.target.value); setPotentialDuplicate(null); setConfirmedPotentialDuplicateId(''); }} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Invoice date
            <input type="date" required value={date} onChange={(event) => { setDate(event.target.value); setPotentialDuplicate(null); setConfirmedPotentialDuplicateId(''); }} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Invoice number
            <input value={invoiceNumber} onChange={(event) => { setInvoiceNumber(event.target.value); setPotentialDuplicate(null); setConfirmedPotentialDuplicateId(''); }} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Subtotal
            <input type="number" min="0" step="0.01" value={subtotal} onChange={(event) => setSubtotal(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Taxes
            <input type="number" min="0" step="0.01" value={taxes} onChange={(event) => setTaxes(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Discounts
            <input type="number" min="0" step="0.01" value={discounts} onChange={(event) => setDiscounts(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Category
            <input required value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Printed invoice total
            <input type="number" min="0.01" step="0.01" required value={total} onChange={(event) => { setTotal(event.target.value); setPotentialDuplicate(null); setConfirmedPotentialDuplicateId(''); }} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Amount paid (not invoice total)
            <input type="number" min="0" step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Payment method
            <input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="Cash, UPI, bank…" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-[#0F172A]">Receipt line items</h2><button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><Plus className="h-4 w-4" />Add item</button></div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="p-3">Product Name</th><th className="p-3">Quantity (as on Receipt)</th><th className="p-3">Price per Unit</th><th className="p-3">Line Total</th><th className="p-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-200">{items.map((item, index) => (
                <tr key={`${index}-${item.name}`}>
                  <td className="p-2"><input aria-label="Product Name" required value={item.name} onChange={(event) => updateItem(index, 'name', event.target.value)} placeholder="Product / service" className="w-full rounded-lg border border-slate-300 px-3 py-2" />{item.confidence !== undefined && <small className="text-slate-500">AI confidence {Math.round(item.confidence * 100)}%</small>}</td>
                  <td className="p-2"><input aria-label="Quantity (as on Receipt)" required value={item.quantityText} onChange={(event) => { setItems((previous) => previous.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantityText: event.target.value, qty: String(Number.parseFloat(event.target.value) || '') } : entry)); }} placeholder="e.g. 2 packets" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></td>
                  <td className="p-2"><input aria-label="Price per Unit" type="number" min="0" step="0.01" required value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} placeholder="0.00" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></td>
                  <td className="p-2"><input aria-label="Line Total" type="number" min="0" step="0.01" required value={item.total} onChange={(event) => updateItem(index, 'total', event.target.value)} placeholder="0.00" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></td>
                  <td className="p-2"><button type="button" onClick={() => setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="text-sm text-red-700 underline">Remove</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {items.length > 0 && <div className={`flex flex-wrap justify-between gap-2 rounded-lg p-3 text-sm ${totalsMismatch ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}><span>Calculated line total: {currency(calculatedTotal)}</span>{totalsMismatch && <span>Printed total differs by {currency(Math.abs(calculatedTotal - Number(total)))}; confirm before saving.</span>}</div>}
        </div>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500">Approval saves the receipt and purchase/payable record. Receipt items are not mapped to inventory or used to change stock.</p>
          <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 py-3 font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50"><ReceiptText className="h-4 w-4" />Approve and save</button>
        </div>
      </form>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h2 className="mb-3 font-semibold text-[#0F172A]">Recent verified receipts</h2>
        {receipts.length === 0 ? <p className="text-sm text-slate-500">No receipts recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2 pr-4">Supplier</th><th className="py-2 pr-4">Date / invoice</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Paid</th><th className="py-2 text-right">Total</th></tr></thead><tbody className="divide-y">{receipts.map((receipt) => <tr key={receipt.id}><td className="py-3 pr-4 font-medium text-[#0F172A]">{receipt.vendor}</td><td className="py-3 pr-4 text-slate-600">{receipt.date}<span className="block text-xs">{receipt.receiptNumber || receipt.id}</span></td><td className="py-3 pr-4">{receipt.transactionType === 'purchase' ? 'Inventory purchase' : 'Other expense'}</td><td className="py-3 pr-4">{currency(receipt.amountPaid || 0)} · {receipt.paymentStatus}</td><td className="py-3 text-right font-semibold">{currency(receipt.total)}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h2 className="mb-3 font-semibold text-[#0F172A]">Supplier purchase balances</h2>
        {purchases.length === 0 ? <p className="text-sm text-slate-500">Approved inventory purchases will appear here.</p> : <div className="space-y-3">{purchases.map((purchase) => {
          const draft = paymentDrafts[purchase.id] || { amount: '', method: 'Bank transfer', reference: '' };
          const paymentsForPurchase = supplierPayments.filter((payment) => payment.purchaseId === purchase.id);
          return <article key={purchase.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap justify-between gap-2"><div><strong className="text-[#0F172A]">{purchase.supplier}</strong><p className="text-xs text-slate-500">{purchase.date} · {purchase.invoiceNumber || purchase.id} · {purchase.paymentStatus}</p></div><div className="text-right text-sm"><p>Total {currency(purchase.total)}</p><p className="font-semibold text-amber-700">Due {currency(purchase.payable)}</p></div></div>
            {purchase.payable > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <input aria-label={`Payment amount for ${purchase.supplier}`} type="number" min="0.01" max={purchase.payable} step="0.01" value={draft.amount} onChange={(event) => setPaymentDrafts((previous) => ({ ...previous, [purchase.id]: { ...draft, amount: event.target.value } }))} placeholder="Amount" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input aria-label={`Payment method for ${purchase.supplier}`} value={draft.method} onChange={(event) => setPaymentDrafts((previous) => ({ ...previous, [purchase.id]: { ...draft, method: event.target.value } }))} placeholder="Method" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input aria-label={`Payment reference for ${purchase.supplier}`} value={draft.reference} onChange={(event) => setPaymentDrafts((previous) => ({ ...previous, [purchase.id]: { ...draft, reference: event.target.value } }))} placeholder="Reference" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" disabled={busy} onClick={() => { void recordSupplierPayment(purchase); }} className="rounded-lg bg-[#059669] px-3 py-2 text-sm font-semibold text-white hover:bg-[#047857] disabled:opacity-60">Record payment</button>
            </div>}
            {paymentsForPurchase.length > 0 && <p className="mt-2 text-xs text-slate-500">Payment history: {paymentsForPurchase.map((payment) => `${currency(payment.amount)} (${payment.paidAt.slice(0, 10)}, ${payment.referenceNumber})`).join(' · ')}</p>}
          </article>;
        })}</div>}
      </section>
    </section>
  );
};
