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

The seeded demo login is `shivansh@shopledger.local` / `ShopLedger123!`.

## Receipt, Expense, and Payroll Workflows

- Receipt scans and uploads accept JPG, PNG, and PDF files up to 8 MB. The server checks file signatures, stores them under `data/uploads`, and uses SHA-256 plus supplier/invoice/date/total matching to block exact duplicates.
- AI extraction runs only on the server when `GEMINI_API_KEY` is configured. Every field remains editable and must be reviewed before approval.
- Confirmed inventory purchases require each line to be mapped to an existing product. Only then does stock increase. Other expenses never change stock.
- Manual expenses, employee records, salary payments, receipts, and shop records currently persist in `data/shopledger-store.json`; uploaded files persist in `data/uploads`. This is local JSON persistence, not a relational database, and does not provide cross-process database transactions, migrations, or production-grade backup/retention.
- Salary payments are restricted to owner/manager roles and can be recorded only once per employee and month. The app retains audit entries and does not expose a delete action for finalized financial records.
- Customer receipts and salary slips use the browser print dialog; choose “Save as PDF” there for PDF output.
