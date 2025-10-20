# Cash App Sheet Migration Guide

## Overview

**Good News**: Your sheet already has a great structure! You just need to consolidate the data.

### Current Structure (Before Migration)
```
Your Sheet:
├── Sheet1 (empty) ❌
├── SALES_Al-Hasa 1_2025-10-19 (8 rows) ⚠️
├── SALES_Al-Hasa 2_2025-10-19 (9 rows) ⚠️
├── SALES_Al-Hasa Wholesale_2025-10-19 (6 rows) ⚠️
├── ... (24 more SALES tabs) ⚠️
├── CASH_RECONCILIATION (33 rows) ✅
└── CASH_DENOMINATIONS (33 rows) ✅
```

### Target Structure (After Migration)
```
Your Sheet:
├── Transactions (ALL sales data consolidated) ✅
├── CASH_RECONCILIATION (33 rows + Timestamp) ✅
└── CASH_DENOMINATIONS (33 rows + Timestamp) ✅
```

---

## What Needs to Change?

### ✅ Keep As-Is:
- **CASH_RECONCILIATION** tab (33 rows of summary data)
- **CASH_DENOMINATIONS** tab (33 rows of denomination breakdown)

### ⚠️ Needs Consolidation:
- **27 separate SALES tabs** → Merge into **ONE "Transactions" tab**

### ❌ Remove:
- **Sheet1** (empty)

### ➕ Add:
- **Timestamp column** to CASH_RECONCILIATION (combine Date + Time)
- **Timestamp column** to CASH_DENOMINATIONS (match with CASH_RECONCILIATION)

---

## Why Consolidate?

### Current Problem:
- 27 separate tabs (one per route/date)
- Hard to query all transactions at once
- Tab names like `SALES_Al-Hasa 1_2025-10-19` make it difficult to scale

### After Migration:
- **ONE Transactions tab** with all sales data
- Easy to filter by route, date, or product
- Matches the backend structure expected by the GAS script
- Scalable for future data

---

## Data Mapping

### SALES_* Tabs → Transactions Tab

**Before** (27 separate tabs):
```
SALES_Al-Hasa 1_2025-10-19:
Date | Time | Category | Code | Item Name | Unit | Unit Price | Quantity | Total Value
```

**After** (ONE Transactions tab):
```
Transactions:
Timestamp | Date | Route | Category | Code | Item Name | Unit | Price | Quantity | Total
```

**What Changes:**
- ✅ **Timestamp**: NEW column (combines Date + Time)
- ✅ **Route**: NEW column (extracted from tab name: "Al-Hasa 1")
- ✅ **Date**: Kept (from tab name for consistency)
- ✅ **Price**: Renamed from "Unit Price"
- ✅ **Total**: Renamed from "Total Value"

### CASH_RECONCILIATION Tab

**Before**:
```
Date | Time | Route | Total Sales | ... | Status
```

**After**:
```
Timestamp | Date | Time | Route | Total Sales | ... | Status
```

**What Changes:**
- ✅ **Timestamp**: NEW first column (combines Date + Time)
- ✅ All other columns stay the same

### CASH_DENOMINATIONS Tab

**Before**:
```
Date | Route | SAR 500 | SAR 100 | ... | Grand Total
```

**After**:
```
Timestamp | Date | Route | SAR 500 | SAR 100 | ... | Grand Total
```

**What Changes:**
- ✅ **Timestamp**: NEW first column (matches CASH_RECONCILIATION)
- ✅ All other columns stay the same

---

## Migration Steps (Step-by-Step)

### Prerequisites

1. **Open your Cash App Google Sheet**:
   ```
   https://docs.google.com/spreadsheets/d/1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414/edit
   ```

2. **Go to Extensions → Apps Script**

3. **Create new script file**:
   - Click **+** (Add a file) → **Script**
   - Name it "Migration"
   - Copy content from `gas-backend/MigrateCashSheet.gs`
   - Paste into the script editor
   - Click **Save** (💾)

---

### Step 0: Create Backup (CRITICAL!)

**Function to run**: `createBackup()`

1. In Apps Script, select **`createBackup`** from the function dropdown
2. Click **Run** (▶️)
3. **Grant permissions** when asked:
   - Click "Review permissions"
   - Select your account
   - Click "Advanced" → "Go to [Unsafe]"
   - Click "Allow"
4. Wait for the alert: **"✅ Backup Created!"**
5. Check your Google Drive - you'll see a backup copy with timestamp

**Result**: Full backup copy created in your Google Drive

---

### Step 1: Create Transactions Tab

**Function to run**: `step1_CreateTransactionsTab()`

1. Select **`step1_CreateTransactionsTab`** from function dropdown
2. Click **Run** (▶️)
3. Wait for alert: **"✅ Step 1 Complete"**

**What it does**:
- Creates new "Transactions" tab
- Adds proper headers
- Formats header row (green background)
- Freezes header row

**Result**: New empty "Transactions" tab ready for data

---

### Step 2: Migrate All SALES Data

**Function to run**: `step2_MigrateAllSalesData()`

1. Select **`step2_MigrateAllSalesData`** from function dropdown
2. Click **Run** (▶️)
3. **This may take 30-60 seconds** (processing 27 tabs)
4. Wait for alert: **"✅ Step 2 Complete"**
   - It will tell you how many rows were migrated

**What it does**:
- Finds all 27 SALES_* tabs
- Extracts route name from tab name (e.g., "Al-Hasa 1")
- Extracts date from tab name (e.g., "2025-10-19")
- Combines Date + Time into Timestamp
- Copies all data to Transactions tab
- Sorts by timestamp (most recent first)

**Result**: All sales data consolidated into Transactions tab

**Example**:
```
Before: SALES_Al-Hasa 1_2025-10-19 has 8 rows
After:  Those 8 rows are in Transactions with Route = "Al-Hasa 1"
```

---

### Step 3: Fix CASH_RECONCILIATION

**Function to run**: `step3_FixCashReconciliation()`

1. Select **`step3_FixCashReconciliation`** from function dropdown
2. Click **Run** (▶️)
3. Wait for alert: **"✅ Step 3 Complete"**

**What it does**:
- Adds "Timestamp" as first column
- Combines Date + Time columns into Timestamp
- Keeps all existing columns

**Result**: CASH_RECONCILIATION now has Timestamp column

---

### Step 4: Fix CASH_DENOMINATIONS

**Function to run**: `step4_FixCashDenominations()`

1. Select **`step4_FixCashDenominations`** from function dropdown
2. Click **Run** (▶️)
3. Wait for alert: **"✅ Step 4 Complete"**

**What it does**:
- Adds "Timestamp" as first column
- Matches timestamps from CASH_RECONCILIATION by Date + Route
- Keeps all existing columns

**Result**: CASH_DENOMINATIONS now has Timestamp column

---

### Step 5: Cleanup Old Tabs

**Function to run**: `step5_CleanupOldTabs()`

1. Select **`step5_CleanupOldTabs`** from function dropdown
2. Click **Run** (▶️)
3. Confirm when prompted: **"Continue?"** → Click **Yes**
4. Wait for alert: **"✅ Step 5 Complete"**

**What it does**:
- Deletes empty "Sheet1"
- **HIDES** (not deletes) all old SALES_* tabs
  - They're hidden for safety, not deleted
  - You can unhide later if needed: Right-click any tab → "Unhide"

**Result**: Clean sheet with only 3 visible tabs

---

### Step 6: Verify Migration

**Function to run**: `verifyMigration()`

1. Select **`verifyMigration`** from function dropdown
2. Click **Run** (▶️)
3. Read the verification report

**What it checks**:
- ✅ Transactions tab exists and has data
- ✅ CASH_RECONCILIATION has Timestamp column
- ✅ CASH_DENOMINATIONS has Timestamp column
- ✅ Row counts match expectations
- ✅ Old SALES tabs are hidden

**Expected Report**:
```
=============================================================
MIGRATION VERIFICATION REPORT
=============================================================

✅ Transactions tab exists
   - Rows: 200+ (depends on your data)
   - Columns: 10
✅ CASH_RECONCILIATION tab exists
   - Rows: 33
   - Columns: 18
   - ✅ Timestamp column present
✅ CASH_DENOMINATIONS tab exists
   - Rows: 33
   - Columns: 16
   - ✅ Timestamp column present

Old SALES sheets: 27 total
   - Hidden: 27
   - Visible: 0

=============================================================
MIGRATION STATUS: ✅ COMPLETE
=============================================================
```

---

## After Migration

### Your Final Sheet Structure:

**Visible Tabs:**
1. **Transactions** (200+ rows) - All historical sales data
2. **CASH_RECONCILIATION** (33 rows) - Summary records
3. **CASH_DENOMINATIONS** (33 rows) - Cash breakdown

**Hidden Tabs** (for safety):
- 27 old SALES_* tabs (can be deleted later if everything works)

---

## Optional: Delete Old SALES Tabs (After Verification)

**⚠️ WARNING: This is PERMANENT!**

Once you've verified everything is correct and the backend is working:

**Function to run**: `DANGER_deleteOldSalesTabs()`

1. **Wait at least 1 week** after migration
2. Verify the Transactions tab has all your data
3. Verify the backend is working correctly
4. Run this function to permanently delete the old tabs

**This action CANNOT be undone!**

---

## Troubleshooting

### Issue: "Script requires authorization"

**Solution**:
1. Click "Review permissions"
2. Select your Google account
3. Click "Advanced"
4. Click "Go to [Project Name] (unsafe)"
5. Click "Allow"

### Issue: Step X says "Run step Y first"

**Solution**: You must run steps in order (1 → 2 → 3 → 4 → 5)

### Issue: "Transactions tab already exists"

**Solution**:
- Choose "Yes" to delete and recreate
- OR rename the existing tab first

### Issue: Row counts don't match after migration

**Solution**:
1. Check the verification report
2. Unhide old SALES tabs (right-click any tab → Unhide)
3. Manually count rows
4. Re-run step2_MigrateAllSalesData()

### Issue: Timestamps are wrong

**Solution**:
- Check that your original Date and Time columns have valid dates
- The script combines them to create ISO timestamps

---

## Data Validation Checklist

After migration, verify:

- [ ] Transactions tab has data from all 27 SALES tabs
- [ ] Total row count in Transactions matches sum of all SALES tabs
- [ ] CASH_RECONCILIATION has Timestamp column
- [ ] CASH_DENOMINATIONS has Timestamp column
- [ ] No data loss (compare backup with migrated sheet)
- [ ] Timestamps are correct
- [ ] Routes are correctly extracted (check "Al-Hasa 1", "Al-Hasa 2", etc.)
- [ ] Dates are correct
- [ ] Old SALES tabs are hidden (not deleted yet)

---

## Next Steps After Migration

1. **Update the backend Code.gs**:
   - Your sheet ID: `1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414`
   - Use this as `SHEET_IDS.CASH_DESTINATION` in the backend

2. **Keep using the same structure**:
   - New data from the frontend will go into:
     - Transactions tab
     - CASH_RECONCILIATION tab
     - CASH_DENOMINATIONS tab

3. **No more SALES_* tabs will be created**:
   - Everything goes into the consolidated structure

---

## Summary

### Before:
- ❌ 27 separate SALES tabs (hard to manage)
- ❌ No Timestamp columns
- ❌ Empty Sheet1

### After:
- ✅ ONE Transactions tab (all data consolidated)
- ✅ Timestamp columns added
- ✅ Clean, organized structure
- ✅ Ready for backend integration
- ✅ Old data preserved (hidden, not deleted)

---

## Need Help?

If you encounter issues:
1. Check the Apps Script execution log (View → Executions)
2. Review the error messages
3. Your backup is safe in Google Drive
4. You can always restore from backup if needed

**Backup Location**:
- Google Drive → Search for: "BACKUP"
- Filename: `[Your Sheet Name] - BACKUP - [Timestamp]`
