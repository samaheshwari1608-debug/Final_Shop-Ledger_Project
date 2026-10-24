<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/73cb3e3e-88ad-4e08-89dd-57089e90bcea

## Run Locally

**Prerequisite:** Node.js

1. Install dependencies with `npm install`.
2. Start the Express backend and its integrated Vite middleware with `npm run dev`. The default URL is `http://localhost:3000`.
3. To use a separate Vite dev server on port 5173 instead, keep the backend running and run `npx vite --host 0.0.0.0 --port 5173` in a second terminal. Its `/api` proxy targets port 3000.
4. Receipt AI extraction: copy `.env.example` to `.env.local`, then set `GEMINI_API_KEY=your_server_side_key`. Optionally change `GEMINI_MODEL` (defaults to `gemini-3.6-flash`; the selected model must be enabled for your Google AI Studio key). Restart `npm run dev` after saving the file. Do not prefix the key with `VITE_`, add it to frontend code, or commit `.env.local`. Without the key, upload and manual receipt review still work; AI extraction reports that it is unavailable instead of fabricating extracted values.
5. For an isolated local test store, set `SHOPLEDGER_DATA_DIR` to a separate directory before starting the server. Normal runs continue to use the existing `data` directory.

## Deploy to Render

- The root `render.yaml` defines a single-instance Node web service in Singapore with a 1 GB persistent disk mounted at `/var/data`. Render requires a paid web-service plan for persistent disks; review the current price in Render before creating the service.
- In Render, create a Blueprint from this repository and review/approve the service and disk costs. The blueprint builds with `npm ci && npm run build`, starts with `npm start`, and uses `/api/health` as its health check.
- The service starts with a fresh empty data store on the persistent disk. The local `data/` directory is excluded from new Git commits by `.gitignore`; existing tracked data must be untracked before publishing the deployment branch. Do not upload local customer or shop records.
- Render's `RENDER_EXTERNAL_URL` is added as one exact allowed CORS origin. No wildcard origins or frontend API keys are used.
- Receipt AI extraction is optional and disabled unless `GEMINI_API_KEY` is added as a server-only secret in Render's Environment settings. Never put the key in a `VITE_` variable.
- The JSON store is intended for one server process and does not support multiple instances or cross-process transactions. Keep the service to one instance and configure backups before using it for live business records.

New local data directories start empty. Create a business account through Sign up; existing records in `data/shopledger-store.json` are loaded and retained.

## Dashboard and Data Accuracy

- Dashboard cards, daily profit, the date-wise profit chart, inventory, dues, payroll, and top products are returned by the authenticated `/api/shops/:shopId/dashboard` endpoint. The server validates shop access and calculates the reporting period in the shop's stored timezone; new and migrated shops default to `Asia/Kolkata`.
- Profit is recognized sales revenue minus the cost snapshot captured when each bill is created and expenses recorded on the same transaction dates. Supplier inventory purchases are not also counted as operating expenses. Existing sales without a historical cost snapshot show **Insufficient data** rather than estimated profit.
- Sales created by the billing API are confirmed as Paid or Pending Credit and carry a shop-scoped idempotency key. Repeating a successful submission does not deduct stock or increase sales again. Expense, customer-payment, supplier-payment, purchase, and payroll paths also reject/replay duplicates using the existing store and API conventions.
- Customer balances and supplier balances are reported separately. Recording a customer payment updates the saved customer balance; payroll payments are included once as expenses and are visible only to authorized financial roles.
- The JSON store remains the application's existing persistence layer. It preserves current data and atomically replaces its file for each save, but it has no relational constraints, indexes, cross-process transaction locks, or multi-instance write guarantees. Run one backend process per data directory and keep backups.
- The app does not currently provide sales cancellation, returns, or refunds, nor an inventory receipt-to-product mapping or stock-movement ledger. Therefore these events cannot be reflected in profit or inventory movement reports until a dedicated auditable workflow exists.

## Receipt, Expense, and Payroll Workflows

- Receipt scans and uploads accept JPG, PNG, and PDF files up to 8 MB. Select printed or handwritten before extraction. The original upload is retained under `data/uploads`; extraction results remain editable and require review before approval.
- Receipt approval rejects exact file/business duplicates and flags close supplier, date, amount, and invoice matches for confirmation. The JSON store has no database uniqueness constraint or cross-process transaction lock, so it is intended for a single local server process rather than concurrent multi-instance production.
- Receipt AI extraction runs only on the server when `GEMINI_API_KEY` is configured. Handwriting extraction is best-effort; unreadable values must be entered manually.
- Supplier purchase records and payables are saved without changing inventory quantities. Adjust stock through the Inventory module when the receipt has been reviewed.
- Expenses CSV uses its selected date/category filters. Dues CSV includes current customer balances and date-filtered supplier purchase balances. The current customer ledger does not retain customer due dates or historical original/paid amounts, so those values are clearly marked as untracked rather than inferred.
- The English-only advisor and voice assistant require an authenticated shop session and answer from server-calculated records. Unrelated questions receive the application's fixed ShopLedger-only response; assistant calls do not send shop records or customer data to an external model.
- Manual expenses, employee records, salary payments, receipts, and shop records currently persist in `data/shopledger-store.json`; uploaded files persist in `data/uploads`. This is local JSON persistence, not a relational database, and does not provide cross-process database transactions, migrations, or production-grade backup/retention.
- Salary payments are restricted to owner/manager roles and can be recorded only once per employee and month. The app retains audit entries and does not expose a delete action for finalized financial records.
- Customer receipts and salary slips use the browser print dialog; choose “Save as PDF” there for PDF output.
