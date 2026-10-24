export type ProductCategory = 
  | 'Dairy' 
  | 'Snacks' 
  | 'Beverages' 
  | 'Personal Care' 
  | 'Household' 
  | 'Grocery' 
  | 'Spices' 
  | 'Bakery';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  purchasePrice: number; // in ₹
  sellingPrice: number;  // in ₹
  stock: number;
  lowStockThreshold: number;
  image?: string;
  unit?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string; // Customer shop or residence location
  totalPurchases: number; // in ₹
  pendingAmount: number;  // in ₹ (Udhaar / Due credit)
  status: 'Active' | 'Settled' | 'Overdue';
  lastVisit: string;
}

export interface BillItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  total: number;
}

export interface Bill {
  id: string; // e.g. "BILL-1049"
  date: string;
  time: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerLocation?: string; // Customer's shop or residence location
  items: BillItem[];
  subtotal: number;
  total: number;
  paymentMode: 'Cash' | 'UPI / Online' | 'Pending Credit (Udhaar)';
  status: 'Paid' | 'Pending Credit';
}

export interface SupplierReceipt {
  id: string;
  vendor: string;
  date: string;
  receiptNumber?: string;
  category: string;
  items: Array<{ name: string; qty: number; unitPrice: number; total: number; productId?: string; confidence?: number }>;
  total: number;
  type: 'computer' | 'handwritten'; // Supports computer & handwritten receipts
  paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
  source: 'photo' | 'pdf' | 'manual';
  notes?: string;
  createdAt: string;
  documentHash?: string;
  documentExtension?: 'jpg' | 'png' | 'pdf';
  transactionType?: 'purchase' | 'expense';
  amountPaid?: number;
  purchaseId?: string;
  expenseId?: string;
}

export interface ExpenseEntry {
  id: string;
  title: string;
  category: string;
  amount: number;
  vendor: string;
  date: string;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: 'Paid' | 'Unpaid' | 'Partially Paid';
  referenceNumber?: string;
  receiptId?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone?: string;
  joinedAt: string;
  monthlySalary: number;
  status: 'Active' | 'Inactive';
}

export interface PayrollPayment {
  id: string;
  employeeId: string;
  period: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  paidAt: string;
}

export interface SupplierPurchase {
  id: string;
  receiptId: string;
  supplier: string;
  invoiceNumber?: string;
  date: string;
  total: number;
  amountPaid: number;
  payable: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  purchaseId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  paidAt: string;
}

export interface ShopkeeperProfile {
  name: string;
  shopName: string;
  phone: string;
  location: string;
  upiId?: string;
  gstNumber?: string;
}
