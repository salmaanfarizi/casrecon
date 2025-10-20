# Quick Start Guide

## Your Current Situation

✅ **Cash App Google Sheet**: Already exists with 33 records + 200+ transactions
✅ **Frontend App**: Already deployed and working
❓ **Backend**: Needs to be set up to connect everything

---

## Your Sheet Structure (Right Now)

```
Your Sheet: 1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414
├── Sheet1 (empty) ❌
├── SALES_Al-Hasa 1_2025-10-19 (8 rows) ⚠️
├── SALES_Al-Hasa 2_2025-10-19 (9 rows) ⚠️
├── ... (25 more SALES tabs) ⚠️
├── CASH_RECONCILIATION (33 rows) ✅
└── CASH_DENOMINATIONS (33 rows) ✅
```

**Issue**: 27 separate SALES tabs make it hard to query and scale

---

## ✅ What's Already Done

**Good news!** Your backend is already deployed:

```
Backend URL: https://script.google.com/.../exec
Sheet ID: 1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414
```

Both are already configured in the code! ✨

---

## What You Need to Do

### Step 1: Migrate Your Existing Data (30 minutes)

**Follow**: [`gas-backend/MIGRATION_GUIDE.md`](./gas-backend/MIGRATION_GUIDE.md)

**Quick Steps**:
1. Open your sheet
2. Extensions → Apps Script
3. Copy `gas-backend/MigrateCashSheet.gs`
4. Run functions in order:
   - `createBackup()` ← **DO THIS FIRST!**
   - `step1_CreateTransactionsTab()`
   - `step2_MigrateAllSalesData()`
   - `step3_FixCashReconciliation()`
   - `step4_FixCashDenominations()`
   - `step5_CleanupOldTabs()`
   - `verifyMigration()`

**Result After Migration**:
```
Your Sheet (After):
├── Transactions (200+ rows) ✅ ALL sales data consolidated
├── CASH_RECONCILIATION (33 rows + Timestamp) ✅
└── CASH_DENOMINATIONS (33 rows + Timestamp) ✅

Hidden (safe backup):
└── 27 old SALES tabs (can delete later)
```

---

### Step 2: Configure Backend (10 minutes) - OPTIONAL

**Your backend is already deployed!** ✅

```
URL: https://script.google.com/macros/s/AKfycbzKiyFWj4QsKUakcSiqTwtLewCZeMM-bqRr2Ganjd0kZjHk0SXzJGt2HAejs_683um2/exec
```

**Only if you want inventory integration:**
1. Open your deployed script at [script.google.com](https://script.google.com)
2. Update these in `Code.gs`:
   ```javascript
   const SHEET_IDS = {
     INVENTORY_SOURCE: 'YOUR_INVENTORY_SHEET_ID_HERE',  // ← Add if you have inventory app
     CASH_DESTINATION: '1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414',  // ✅ Already set
     CATALOG: 'YOUR_CATALOG_SHEET_ID_HERE'  // ← Add your catalog sheet
   };
   ```
3. Redeploy the script

**Test your backend**: Open `test-backend.html` in your browser

---

### Step 3: Connect Frontend to Backend (OPTIONAL)

**The backend URL is already hardcoded as a fallback!** ✅ Your app should work out of the box.

**For better security** (optional), set it as environment variable:
1. Go to Netlify dashboard
2. Your site → Site configuration → Environment variables
3. Add variable:
   - **Key**: `GAS_WEBAPP_URL`
   - **Value**: `https://script.google.com/macros/s/AKfycbzKiyFWj4QsKUakcSiqTwtLewCZeMM-bqRr2Ganjd0kZjHk0SXzJGt2HAejs_683um2/exec`
4. Redeploy site

**Why optional?** The URL is already in `netlify/functions/gas.js` as a fallback. Setting the env variable is just best practice for production.

---

## File Guide

### For Migration (Step 1):
- **[`gas-backend/MIGRATION_GUIDE.md`](./gas-backend/MIGRATION_GUIDE.md)** ← Start here
- **[`gas-backend/MigrateCashSheet.gs`](./gas-backend/MigrateCashSheet.gs)** ← Copy this to your sheet

### For Backend Setup (Step 2):
- **[`gas-backend/SETUP.md`](./gas-backend/SETUP.md)** ← Complete deployment guide
- **[`gas-backend/Code.gs`](./gas-backend/Code.gs)** ← Backend code (customized for your sheet)
- **[`gas-backend/SHEET_TEMPLATES.md`](./gas-backend/SHEET_TEMPLATES.md)** ← Sheet structure reference

### Additional Tools:
- **[`gas-backend/AnalyzeCurrentSheet.gs`](./gas-backend/AnalyzeCurrentSheet.gs)** ← Analyze any sheet structure
- **[`gas-backend/README.md`](./gas-backend/README.md)** ← Backend overview

---

## What's Already Configured for You

✅ **Your Sheet ID**: Pre-configured in Code.gs
✅ **Tab Names**: Match your existing structure (CASH_RECONCILIATION, CASH_DENOMINATIONS)
✅ **Column Headers**: Match your format (SAR 500, Discount (Base), etc.)
✅ **Status Calculation**: Auto-calculates BALANCED/SHORTAGE/EXCESS

---

## What You Still Need to Configure

1. **Inventory Source Sheet ID** (in Code.gs):
   ```javascript
   INVENTORY_SOURCE: 'YOUR_INVENTORY_SHEET_ID_HERE'
   ```

2. **Catalog Sheet ID** (in Code.gs):
   ```javascript
   CATALOG: 'YOUR_CATALOG_SHEET_ID_HERE'
   ```

3. **Netlify Environment Variable**:
   - `GAS_WEBAPP_URL` = Your deployed GAS URL

---

## Safety Features

✅ **Backup Script**: Creates timestamped copy before any changes
✅ **Hidden Tabs**: Old SALES tabs are hidden, not deleted
✅ **Verification**: Built-in verification checks
✅ **Step-by-step**: Each step can be run independently
✅ **Rollback**: Can restore from backup if needed

---

## Expected Timeline

| Task | Time | Status |
|------|------|--------|
| Run migration script | 30 min | ⏳ Pending |
| Deploy backend | 15 min | ⏳ Pending |
| Connect frontend | 5 min | ⏳ Pending |
| **Total** | **~50 min** | |

---

## After Everything is Set Up

### Your Data Flow:
```
Frontend App (PWA)
    ↓
Netlify Function (proxy)
    ↓
Google Apps Script Backend
    ↓
┌───────────────┬─────────────────┐
│               │                 │
↓               ↓                 ↓
Inventory       Cash              Catalog
Source          Destination
(Read)          (Write)           (Read)
```

### Daily Usage:
1. Open your cash app
2. Select route
3. Click "Fetch from Inventory" (auto-calculates sales)
4. Enter cash count
5. Click "Save Data"
6. Data goes to: Transactions, CASH_RECONCILIATION, CASH_DENOMINATIONS tabs

---

## Need Help?

### Migration Issues:
- Check: [`gas-backend/MIGRATION_GUIDE.md`](./gas-backend/MIGRATION_GUIDE.md) → Troubleshooting section
- Run: `verifyMigration()` to check status

### Backend Issues:
- Check: [`gas-backend/SETUP.md`](./gas-backend/SETUP.md) → Troubleshooting section
- Run: `testConnection()` in Apps Script
- Check: View → Executions (in Apps Script) for error logs

### Frontend Issues:
- Check sync status indicator in app
- Check browser console (F12)
- Verify `GAS_WEBAPP_URL` environment variable

---

## Summary

**You have**:
- ✅ Existing sheet with 33 reconciliation records
- ✅ 200+ transaction rows across 27 tabs
- ✅ Working frontend app

**You need to**:
1. ⏳ Consolidate 27 SALES tabs → 1 Transactions tab
2. ⏳ Deploy backend to connect everything
3. ⏳ Configure Netlify environment variable

**Then you'll have**:
- ✅ Clean, scalable data structure
- ✅ Automated sales calculation from inventory
- ✅ Real-time sync between frontend and sheets
- ✅ Separated inventory and cash data

---

## Next Step

👉 **Start with**: [`gas-backend/MIGRATION_GUIDE.md`](./gas-backend/MIGRATION_GUIDE.md)

Open your Google Sheet and let's consolidate that data!
