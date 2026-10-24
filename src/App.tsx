import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { 
  Product, 
  Customer, 
  Bill, 
  BillItem, 
  SupplierReceipt, 
  ShopkeeperProfile 
} from './types';
import { 
  INITIAL_SHOPKEEPER, 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_BILLS, 
  INITIAL_SUPPLIER_RECEIPTS 
} from './data/mockData';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BillingView } from './components/BillingView';
import { InventoryView } from './components/InventoryView';
import { AddProductModal } from './components/AddProductModal';
import { CustomersView } from './components/CustomersView';
import { AddCustomerModal } from './components/AddCustomerModal';
import { ReportsView } from './components/ReportsView';
import { SuppliersReceiptView } from './components/SuppliersReceiptView';
import { ExpensesPayrollView } from './components/ExpensesPayrollView';
import { AIInsightsView } from './components/AIInsightsView';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { AuthFrontPage } from './components/AuthFrontPage';
import { BillInvoiceModal } from './components/BillInvoiceModal';
import { Mic, ArrowRight, Store } from 'lucide-react';

const API_BASE_URL = '';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  let payload: any = null;
  if (rawText) {
    try {
      payload = contentType.includes('application/json')
        ? JSON.parse(rawText)
        : { error: `The server returned an unexpected response (${response.status}).` };
    } catch {
      payload = { error: 'The server returned an invalid JSON response.' };
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}.`);
  }

  return payload as T;
}

export default function App() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>(() => {
    if (typeof window === 'undefined') return 'login';
    return window.location.pathname === '/signup' ? 'signup' : 'login';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('shopledger-token') && localStorage.getItem('shopledger-shop-id'));
  });
  const [shopkeeper, setShopkeeper] = useState<ShopkeeperProfile>(INITIAL_SHOPKEEPER);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [supplierReceipts, setSupplierReceipts] = useState<SupplierReceipt[]>(INITIAL_SUPPLIER_RECEIPTS);

  const loadDashboardFromServer = async (token: string, shopId: string) => {
    const payload = await apiRequest<{ success: boolean; error?: string; products?: Product[]; customers?: Customer[]; bills?: Bill[]; shop?: { name?: string } }>(`/api/shops/${shopId}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!payload?.success) {
      throw new Error(payload?.error || 'Unable to load the shop dashboard.');
    }

    if (Array.isArray(payload.products)) setProducts(payload.products);
    if (Array.isArray(payload.customers)) setCustomers(payload.customers);
    if (Array.isArray(payload.bills)) setBills(payload.bills);
    const receipts = await apiRequest<{ success: boolean; items?: SupplierReceipt[] }>(`/api/shops/${shopId}/receipts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (Array.isArray(receipts.items)) setSupplierReceipts(receipts.items);
    const shopName = payload.shop?.name ?? 'My Shop';
    setShopkeeper((prev) => ({ ...prev, shopName }));
  };
  useEffect(() => {
    const syncRouteFromLocation = () => {
      const nextPath = window.location.pathname;
      if (nextPath === '/signup') {
        setAuthMode('signup');
      } else {
        setAuthMode('login');
      }
    };

    const savedToken = localStorage.getItem('shopledger-token');
    const savedShopId = localStorage.getItem('shopledger-shop-id');

    if (!savedToken || !savedShopId) {
      syncRouteFromLocation();
      setIsLoggedIn(false);
      return;
    }

    void loadDashboardFromServer(savedToken, savedShopId)
      .then(() => setIsLoggedIn(true))
      .catch(() => {
        localStorage.removeItem('shopledger-token');
        localStorage.removeItem('shopledger-shop-id');
        setIsLoggedIn(false);
      });

    window.addEventListener('popstate', syncRouteFromLocation);
    return () => window.removeEventListener('popstate', syncRouteFromLocation);
  }, []);

  // Active view
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Billing Cart state
  const [cart, setCart] = useState<BillItem[]>([
    { id: 'bi-demo-1', productId: 'p2', name: 'Maggi (70g)', price: 14, qty: 2, total: 28 },
    { id: 'bi-demo-2', productId: 'p4', name: 'Coca Cola (500ml)', price: 40, qty: 1, total: 40 },
  ]);

  // Modals state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [generatedBillPreview, setGeneratedBillPreview] = useState<Bill | null>(null);

  // Computed summary metrics
  const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;
  const pendingCreditTotal = customers.reduce((acc, c) => acc + (c.pendingAmount || 0), 0);

  // Handlers for products
  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === newProduct.id);
      if (exists) {
        return prev.map((p) => (p.id === newProduct.id ? newProduct : p));
      }
      return [newProduct, ...prev];
    });
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Handlers for customers
  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === newCustomer.id);
      if (exists) {
        return prev.map((c) => (c.id === newCustomer.id ? newCustomer : c));
      }
      return [newCustomer, ...prev];
    });
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
  };

  const handleSettleCustomerPayment = (customerId: string, amount: number) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              pendingAmount: Math.max(0, c.pendingAmount - amount),
              status: c.pendingAmount - amount <= 0 ? 'Settled' : 'Active',
            }
          : c
      )
    );
  };

  // Generate Bill handler: deducts stock & updates customer
  const handleGenerateBill = async (draftBill: Bill, _updatedCustomer?: Customer) => {
    const token = localStorage.getItem('shopledger-token');
    const shopId = localStorage.getItem('shopledger-shop-id');
    if (!token || !shopId) throw new Error('Your session expired. Please sign in again.');
    const result = await apiRequest<{ success: boolean; error?: string; bill: Bill }>(`/api/shops/${shopId}/bills`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': draftBill.id,
      },
      body: JSON.stringify({
        items: draftBill.items,
        customerId: draftBill.customerId,
        customerName: draftBill.customerName,
        customerPhone: draftBill.customerPhone,
        customerLocation: draftBill.customerLocation,
        paymentMode: draftBill.paymentMode,
      }),
    });
    if (!result.success || !result.bill) throw new Error(result.error || 'Bill could not be saved.');
    const savedBill = result.bill;
    setBills((previous) => [savedBill, ...previous.filter((bill) => bill.id !== savedBill.id)]);
    setProducts((previous) => previous.map((product) => {
      const sold = savedBill.items.find((item) => item.productId === product.id);
      return sold ? { ...product, stock: Math.max(0, product.stock - sold.qty) } : product;
    }));
    if (savedBill.customerId) {
      setCustomers((previous) => previous.map((customer) => customer.id === savedBill.customerId ? {
        ...customer,
        totalPurchases: customer.totalPurchases + savedBill.total,
        pendingAmount: customer.pendingAmount + (savedBill.status === 'Pending Credit' ? savedBill.total : 0),
        lastVisit: savedBill.date,
      } : customer));
    }
    setGeneratedBillPreview(savedBill);
    return savedBill;
  };

  // Supplier receipt handler
  const handleAddSupplierReceipt = (newReceipt: SupplierReceipt) => {
    setSupplierReceipts((prev) => [newReceipt, ...prev]);
    if (newReceipt.transactionType === 'purchase') {
      setProducts((previous) => previous.map((product) => {
        const purchasedItem = newReceipt.items.find((item) => item.productId === product.id);
        return purchasedItem
          ? { ...product, stock: product.stock + purchasedItem.qty, purchasePrice: purchasedItem.unitPrice }
          : product;
      }));
    }
  };

  // Voice Assistant Action Execution
  const handleVoiceAction = (action: string, payload: any) => {
    if (action === 'ADD_TO_BILL' && payload?.productId) {
      const prod = products.find((p) => p.id === payload.productId);
      if (prod) {
        const qty = payload.qty || 1;
        setCart((prev) => {
          const existing = prev.find((i) => i.productId === prod.id);
          if (existing) {
            return prev.map((i) =>
              i.productId === prod.id
                ? { ...i, qty: i.qty + qty, total: (i.qty + qty) * i.price }
                : i
            );
          }
          return [
            ...prev,
            {
              id: `item-${Date.now()}-${prod.id}`,
              productId: prod.id,
              name: prod.name,
              price: prod.sellingPrice,
              qty,
              total: prod.sellingPrice * qty,
            },
          ];
        });
        setActiveTab('billing');
      }
    } else if (action === 'NAVIGATE' && payload?.targetTab) {
      setActiveTab(payload.targetTab);
    } else if (action === 'CHECK_CREDIT') {
      setActiveTab('customers');
    }
  };

  const handleAuthModeChange = (nextMode: 'login' | 'signup') => {
    setAuthMode(nextMode);
    const nextPath = nextMode === 'signup' ? '/signup' : '/login';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  // If user is logged out, show the Front Page / Login / Register Page
  if (!isLoggedIn) {
    return (
      <AuthFrontPage
        mode={authMode}
        onModeChange={handleAuthModeChange}
        onLogin={(profile, auth) => {
          setShopkeeper(profile);
          const token = auth?.token || localStorage.getItem('shopledger-token');
          const shopId = auth?.shopId || localStorage.getItem('shopledger-shop-id');

          if (token && shopId) {
            void loadDashboardFromServer(token, shopId)
              .then(() => {
                setIsLoggedIn(true);
                window.history.pushState({}, '', '/');
              })
              .catch(() => {
                localStorage.removeItem('shopledger-token');
                localStorage.removeItem('shopledger-shop-id');
                setIsLoggedIn(false);
              });
            return;
          }

          setIsLoggedIn(true);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F1F5F9] text-[#0F172A] flex font-sans antialiased">
      {/* Sidebar Navigation (Exact as reference screenshot) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={lowStockCount}
        pendingCreditTotal={pendingCreditTotal}
        onLogout={() => {
          setIsLoggedIn(false);
          localStorage.removeItem('shopledger-token');
          localStorage.removeItem('shopledger-shop-id');
          window.history.pushState({}, '', '/login');
          setAuthMode('login');
        }}
        onOpenVoice={() => setIsVoiceOpen(true)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Viewport */}
      <main className="min-w-0 h-screen flex-1 overflow-y-auto overscroll-contain p-4 lg:p-8">
        {/* Top Banner on Dashboard letting user switch to Front Page anytime */}
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 shadow-[0_10px_30px_-25px_rgba(15,23,42,0.7)]">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMobileNavOpen(true)} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
            <span className="font-semibold text-[#0F172A]">{shopkeeper.shopName}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsVoiceOpen(true)}
              className="flex items-center gap-1.5 text-[#059669] font-bold hover:text-[#047857] transition-colors"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Mic</span>
            </button>
          </div>
        </div>

        {/* Section 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardView
            products={products}
            customers={customers}
            bills={bills}
            shopkeeper={shopkeeper}
            onNavigateTab={setActiveTab}
            onOpenNewBill={() => setActiveTab('billing')}
            onOpenAddProduct={() => {
              setEditingProduct(null);
              setIsAddProductOpen(true);
            }}
          />
        )}

        {/* Section 2: Billing (Create New Bill) */}
        {activeTab === 'billing' && (
          <BillingView
            products={products}
            customers={customers}
            bills={bills}
            onGenerateBill={handleGenerateBill}
            onReprintBill={setGeneratedBillPreview}
            cart={cart}
            setCart={setCart}
            onOpenVoice={() => setIsVoiceOpen(true)}
          />
        )}

        {/* Section 3: Inventory (Stock Management) */}
        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            onOpenAddProduct={() => {
              setEditingProduct(null);
              setIsAddProductOpen(true);
            }}
            onEditProduct={(p) => {
              setEditingProduct(p);
              setIsAddProductOpen(true);
            }}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {/* Section 4: Customers & Khata Udhaar */}
        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            onOpenAddCustomer={() => {
              setEditingCustomer(null);
              setIsAddCustomerOpen(true);
            }}
            onEditCustomer={(c) => {
              setEditingCustomer(c);
              setIsAddCustomerOpen(true);
            }}
            onDeleteCustomer={handleDeleteCustomer}
            onSettlePayment={handleSettleCustomerPayment}
          />
        )}

        {/* Section 5: Reports & Insights */}
        {activeTab === 'reports' && (
          <ReportsView
            bills={bills}
            customers={customers}
          />
        )}

        {/* Section 6: Suppliers & AI Receipt Scanner (Computer & Handwritten with Duplicate Blocker) */}
        {activeTab === 'suppliers' && (
          <SuppliersReceiptView
            shopId={localStorage.getItem('shopledger-shop-id') || ''}
            token={localStorage.getItem('shopledger-token') || ''}
            receipts={supplierReceipts}
            onSaved={handleAddSupplierReceipt}
          />
        )}

        {(activeTab === 'expenses' || activeTab === 'payroll' || activeTab === 'dues') && (
          <ExpensesPayrollView
            key={activeTab}
            shopId={localStorage.getItem('shopledger-shop-id') || ''}
            token={localStorage.getItem('shopledger-token') || ''}
            customers={customers}
            initialTab={activeTab}
          />
        )}

        {/* Section 7: AI Insights & Shop Settings */}
        {activeTab === 'ai_insights' && (
          <AIInsightsView
            shopId={localStorage.getItem('shopledger-shop-id') || ''}
            token={localStorage.getItem('shopledger-token') || ''}
            shopkeeper={shopkeeper}
            onUpdateShopkeeper={setShopkeeper}
            onOpenVoice={() => setIsVoiceOpen(true)}
          />
        )}
      </main>

      {/* Floating Voice Assistant Trigger at bottom right */}
      <button
        onClick={() => setIsVoiceOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all group"
        title="Open AI Voice Assistant"
      >
        <Mic className="w-6 h-6 animate-pulse" />
        <span className="sr-only">Voice Assistant</span>
      </button>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onAddProduct={handleAddProduct}
        editingProduct={editingProduct}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onAddCustomer={handleAddCustomer}
        editingCustomer={editingCustomer}
      />

      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        shopId={localStorage.getItem('shopledger-shop-id') || ''}
        token={localStorage.getItem('shopledger-token') || ''}
        onExecuteAction={handleVoiceAction}
      />

      <BillInvoiceModal
        bill={generatedBillPreview}
        isOpen={!!generatedBillPreview}
        onClose={() => setGeneratedBillPreview(null)}
        shopkeeper={shopkeeper}
      />
    </div>
  );
}
