import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const testDataDir = mkdtempSync(path.join(tmpdir(), 'shopledger-api-test-'));
process.env.SHOPLEDGER_DATA_DIR = testDataDir;
process.env.RENDER_EXTERNAL_URL = 'https://vyapaar-iq-shopledger.onrender.com';

let server: Server;
let origin: string;

before(async () => {
  const { createApp } = await import('./server.ts');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  rmSync(testDataDir, { recursive: true, force: true });
  delete process.env.SHOPLEDGER_DATA_DIR;
  delete process.env.RENDER_EXTERNAL_URL;
});

async function request(
  method: string,
  endpoint: string,
  options: { token?: string; body?: unknown; idempotencyKey?: string } = {},
) {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = ['Bearer', options.token].join(' ');
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.idempotencyKey) headers['X-Idempotency-Key'] = options.idempotencyKey;
  const response = await fetch(`${origin}${endpoint}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json() as Record<string, any>;
  return { response, payload };
}

test('tenant dashboard totals, account isolation, and idempotent transactions', async () => {
  const renderPreflight = await fetch(`${origin}/api/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://vyapaar-iq-shopledger.onrender.com',
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert.equal(renderPreflight.status, 204);
  assert.equal(renderPreflight.headers.get('access-control-allow-origin'), 'https://vyapaar-iq-shopledger.onrender.com');

  const signUp = async (email: string, shopName: string) => {
    const { response, payload } = await request('POST', '/api/auth/register', {
      body: { name: shopName, email, password: 'Strong-test-password-1!', shopName },
    });
    assert.equal(response.status, 201);
    assert.equal(payload.success, true);
    return payload as { token: string; shopId: string };
  };

  const emailA = `shop-a-${Date.now()}@example.invalid`;
  const accountA = await signUp(emailA, 'Test Shop A');
  const newAccount = await request('GET', `/api/shops/${accountA.shopId}/dashboard?period=today`, { token: accountA.token });
  assert.equal(newAccount.response.status, 200);
  assert.deepEqual(newAccount.payload.summary.totals, {
    salesRevenue: 0,
    expenses: 0,
    costOfGoodsSold: 0,
    netProfit: 0,
    profitDataComplete: true,
    recognizedSalesCount: 0,
    customerCount: 0,
    inventory: { productCount: 0, stockUnits: 0, stockValue: 0, valuationComplete: true, lowStockCount: 0 },
    dues: { customerOutstanding: 0, supplierOutstanding: 0 },
    employees: { total: 0, active: 0, payrollPaid: 0, payrollPaymentCount: 0 },
  });

  const productResult = await request('POST', `/api/shops/${accountA.shopId}/products`, {
    token: accountA.token,
    body: { id: 'test-product', name: 'Test Item', category: 'Grocery', purchasePrice: 4, sellingPrice: 10, stock: 10, lowStockThreshold: 1 },
  });
  assert.equal(productResult.response.status, 201);

  const customerResult = await request('POST', `/api/shops/${accountA.shopId}/customers`, {
    token: accountA.token,
    body: { id: 'test-customer', name: 'Test Customer', phone: '5550001', location: '', totalPurchases: 0, pendingAmount: 0 },
  });
  assert.equal(customerResult.response.status, 201);

  const saleBody = {
    customerId: customerResult.payload.customer.id,
    paymentMode: 'Pending Credit (Udhaar)',
    items: [{ productId: productResult.payload.product.id, qty: 2 }],
  };
  const saleResult = await request('POST', `/api/shops/${accountA.shopId}/bills`, {
    token: accountA.token,
    idempotencyKey: 'sale-test-idempotency-001',
    body: saleBody,
  });
  assert.equal(saleResult.response.status, 201);
  assert.equal(saleResult.payload.bill.total, 20);
  assert.equal(saleResult.payload.bill.costOfGoodsSold, 8);
  assert.equal(saleResult.payload.bill.costDataComplete, true);

  const retrySale = await request('POST', `/api/shops/${accountA.shopId}/bills`, {
    token: accountA.token,
    idempotencyKey: 'sale-test-idempotency-001',
    body: saleBody,
  });
  assert.equal(retrySale.response.status, 200);
  assert.equal(retrySale.payload.products[0].stock, 8);
  assert.equal(retrySale.payload.customers[0].pendingAmount, 20);
  const inventoryAfterSale = await request('GET', `/api/shops/${accountA.shopId}/products`, { token: accountA.token });
  assert.equal(inventoryAfterSale.payload.items[0].stock, 8);

  const expenseBody = { title: 'Test operating cost', vendor: 'Test Vendor', amount: 3, category: 'Operations' };
  const expenseResult = await request('POST', `/api/shops/${accountA.shopId}/expenses`, {
    token: accountA.token,
    idempotencyKey: 'expense-test-idempotency-01',
    body: expenseBody,
  });
  assert.equal(expenseResult.response.status, 201);
  const retryExpense = await request('POST', `/api/shops/${accountA.shopId}/expenses`, {
    token: accountA.token,
    idempotencyKey: 'expense-test-idempotency-01',
    body: expenseBody,
  });
  assert.equal(retryExpense.response.status, 200);

  const customerPayment = await request('POST', `/api/shops/${accountA.shopId}/customers/${customerResult.payload.customer.id}/payments`, {
    token: accountA.token,
    idempotencyKey: 'customer-payment-test-01',
    body: { amount: 5, paymentMethod: 'Cash', referenceNumber: 'TEST-PAY-1' },
  });
  assert.equal(customerPayment.response.status, 201);
  assert.equal(customerPayment.payload.customer.pendingAmount, 15);
  const retryPayment = await request('POST', `/api/shops/${accountA.shopId}/customers/${customerResult.payload.customer.id}/payments`, {
    token: accountA.token,
    idempotencyKey: 'customer-payment-test-01',
    body: { amount: 5, paymentMethod: 'Cash', referenceNumber: 'TEST-PAY-1' },
  });
  assert.equal(retryPayment.response.status, 200);

  const summaryA = await request('GET', `/api/shops/${accountA.shopId}/dashboard?period=today`, { token: accountA.token });
  assert.equal(summaryA.payload.summary.totals.salesRevenue, 20);
  assert.equal(summaryA.payload.summary.totals.costOfGoodsSold, 8);
  assert.equal(summaryA.payload.summary.totals.expenses, 3);
  assert.equal(summaryA.payload.summary.totals.netProfit, 9);
  assert.equal(summaryA.payload.summary.totals.inventory.stockValue, 32);
  assert.equal(summaryA.payload.summary.totals.dues.customerOutstanding, 15);
  assert.equal(summaryA.payload.summary.today.netProfit, 9);
  const refreshedSummary = await request('GET', `/api/shops/${accountA.shopId}/dashboard?period=today`, { token: accountA.token });
  assert.deepEqual(refreshedSummary.payload.summary, summaryA.payload.summary);

  const purchase = await request('POST', `/api/shops/${accountA.shopId}/receipts`, {
    token: accountA.token,
    idempotencyKey: 'purchase-test-idempotency-01',
    body: { vendor: 'Test Supplier', total: 12, amountPaid: 0, transactionType: 'purchase', items: [] },
  });
  assert.equal(purchase.response.status, 201);
  const summaryWithSupplierDues = await request('GET', `/api/shops/${accountA.shopId}/dashboard?period=today`, { token: accountA.token });
  assert.equal(summaryWithSupplierDues.payload.summary.totals.dues.supplierOutstanding, 12);
  const employee = await request('POST', `/api/shops/${accountA.shopId}/employees`, {
    token: accountA.token,
    body: { name: 'Test Employee', role: 'Staff', monthlySalary: 80, status: 'Active' },
  });
  assert.equal(employee.response.status, 201);
  const payrollDateParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date());
  const payrollYear = payrollDateParts.find((part) => part.type === 'year')?.value;
  const payrollMonth = payrollDateParts.find((part) => part.type === 'month')?.value;
  const payrollPeriod = `${payrollYear}-${payrollMonth}`;
  const payment = await request('POST', `/api/shops/${accountA.shopId}/payroll/payments`, {
    token: accountA.token,
    body: { employeeId: employee.payload.employee.id, period: payrollPeriod, paymentMethod: 'Cash', referenceNumber: 'SALARY-TEST-1' },
  });
  assert.equal(payment.response.status, 201);
  const duplicatePayroll = await request('POST', `/api/shops/${accountA.shopId}/payroll/payments`, {
    token: accountA.token,
    body: { employeeId: employee.payload.employee.id, period: payrollPeriod, paymentMethod: 'Cash', referenceNumber: 'SALARY-TEST-1' },
  });
  assert.equal(duplicatePayroll.response.status, 409);
  const summaryWithPayroll = await request('GET', `/api/shops/${accountA.shopId}/dashboard?period=today`, { token: accountA.token });
  assert.equal(summaryWithPayroll.payload.summary.totals.expenses, 83);
  assert.equal(summaryWithPayroll.payload.summary.totals.netProfit, -71);
  assert.equal(summaryWithPayroll.payload.summary.totals.employees.active, 1);
  assert.equal(summaryWithPayroll.payload.summary.totals.employees.payrollPaid, 80);

  const accountB = await signUp(`shop-b-${Date.now()}@example.invalid`, 'Test Shop B');
  const emptyDashboardB = await request('GET', `/api/shops/${accountB.shopId}/dashboard?period=today`, { token: accountB.token });
  assert.equal(emptyDashboardB.payload.summary.totals.salesRevenue, 0);
  assert.equal(emptyDashboardB.payload.summary.totals.expenses, 0);
  assert.equal(emptyDashboardB.payload.summary.totals.customerCount, 0);
  assert.equal(emptyDashboardB.payload.summary.totals.inventory.stockUnits, 0);
  assert.equal(emptyDashboardB.payload.summary.totals.dues.customerOutstanding, 0);
  assert.equal(emptyDashboardB.payload.summary.totals.dues.supplierOutstanding, 0);
  assert.equal(emptyDashboardB.payload.summary.totals.employees.total, 0);

  const deniedCrossTenant = await request('GET', `/api/shops/${accountA.shopId}/dashboard`, { token: accountB.token });
  assert.equal(deniedCrossTenant.response.status, 403);
  const oppositeCrossTenant = await request('GET', `/api/shops/${accountB.shopId}/dashboard`, { token: accountA.token });
  assert.equal(oppositeCrossTenant.response.status, 403);

  const unknownCostProduct = await request('POST', `/api/shops/${accountB.shopId}/products`, {
    token: accountB.token,
    body: { id: 'unknown-cost-product', name: 'Unknown Cost Item', category: 'Grocery', purchasePrice: 0, sellingPrice: 5, stock: 4, lowStockThreshold: 1 },
  });
  assert.equal(unknownCostProduct.response.status, 201);
  const saleWithoutCost = await request('POST', `/api/shops/${accountB.shopId}/bills`, {
    token: accountB.token,
    idempotencyKey: 'sale-missing-cost-01',
    body: { paymentMode: 'Cash', items: [{ productId: unknownCostProduct.payload.product.id, qty: 1 }] },
  });
  assert.equal(saleWithoutCost.response.status, 201);
  const summaryWithUnknownCost = await request('GET', `/api/shops/${accountB.shopId}/dashboard?period=today`, { token: accountB.token });
  assert.equal(summaryWithUnknownCost.payload.summary.totals.costOfGoodsSold, null);
  assert.equal(summaryWithUnknownCost.payload.summary.totals.netProfit, null);
  assert.equal(summaryWithUnknownCost.payload.summary.today.netProfit, null);

  const login = await request('POST', '/api/auth/login', {
    body: { email: emailA, password: 'Strong-test-password-1!' },
  });
  assert.equal(login.response.status, 200);
  const dashboardAfterLogin = await request('GET', `/api/shops/${accountA.shopId}/dashboard?period=today`, { token: login.payload.token });
  assert.equal(dashboardAfterLogin.payload.summary.totals.netProfit, -71);
  assert.equal(dashboardAfterLogin.payload.summary.totals.expenses, 83);

  const sidebar = readFileSync(path.join(process.cwd(), 'src', 'components', 'Sidebar.tsx'), 'utf8');
  const financeNavigation = sidebar.match(/id: 'expenses' as ActiveTab, label: 'Finance'/g) || [];
  assert.equal(financeNavigation.length, 1, 'expected one combined Finance sidebar item');
  assert.doesNotMatch(sidebar, /id: '(dues|payroll)' as ActiveTab/, 'dues and payroll should be accessible inside Finance, not separate sidebar items');
  const financeView = readFileSync(path.join(process.cwd(), 'src', 'components', 'ExpensesPayrollView.tsx'), 'utf8');
  for (const tab of ['Expenses', 'Dues', 'Employees & Payroll']) {
    assert.ok(financeView.includes(`>${tab}</button>`), `expected ${tab} section inside Finance`);
  }
});
