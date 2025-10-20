# Google Apps Script Backend Setup Guide

## Overview

This Google Apps Script (GAS) backend properly separates your data storage:

- **Inventory Source Sheet**: Managed by your inventory app (separate repository)
- **Cash Destination Sheet**: Stores all cash reconciliation data
- **Catalog Sheet**: Product master data (can be in either workbook)

```
┌─────────────────────────────────────────────┐
│  Cash Reconciliation App (Frontend)        │
│  - Web-based PWA                            │
│  - Offline-capable                          │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│  Netlify Function (Proxy)                   │
│  - CORS handling                            │
│  - Request forwarding                       │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│  Google Apps Script (This Backend)          │
│  - Read from Inventory Source               │
│  - Write to Cash Destination                │
│  - Manage Product Catalog                   │
└──────────────┬──────────────────────────────┘
               │
               ↓
       ┌───────┴────────┐
       │                │
       ↓                ↓
┌─────────────┐  ┌─────────────┐
│ Inventory   │  │ Cash Recon  │
│ Source      │  │ Destination │
│ Sheet       │  │ Sheet       │
│ (Read Only) │  │ (Write)     │
└─────────────┘  └─────────────┘
```

---

## Part 1: Google Sheets Structure

### 1. Inventory Source Sheet (Read by Cash App, Written by Inventory App)

**Sheet ID**: Get from URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

**Required Tabs** (one per route):
- `Al-Hasa 1`
- `Al-Hasa 2`
- `Al-Hasa 3`
- `Al-Hasa 4`
- `Al-Hasa Wholesale`

**Column Structure** (each tab):
```
| Date       | Code | Product Name      | Opening Stock | Purchases | Closing Stock |
|------------|------|-------------------|---------------|-----------|---------------|
| 2025-10-19 | 4402 | Sunflower 200g    | 100          | 50        | 80           |
| 2025-10-19 | 4401 | Sunflower 100g    | 75           | 0         | 55           |
| 2025-10-20 | 4402 | Sunflower 200g    | 80           | 100       | 110          |
```

**Sales Calculation**:
```
Sales = Opening Stock + Purchases - Closing Stock
```

For example:
- Date: 2025-10-20
- Opening: 80, Purchases: 100, Closing: 110
- **Sales = 80 + 100 - 110 = 70 units**

---

### 2. Cash Destination Sheet (Written by Cash App)

**Sheet ID**: Get from URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

This workbook will have **3 tabs** auto-created by the GAS script:

#### Tab 1: `Cash Reconciliation` (Summary Records)

Auto-created with headers:
```
| Timestamp            | Date       | Route      | Total Sales | Discount Base | Discount w/VAT | Credit Sales | Credit Repay | Bank POS | Bank Transfer | Cheque | Expected Cash | Cash Notes | Coins | Actual Cash | Difference | Items Sold |
|----------------------|------------|------------|-------------|---------------|----------------|--------------|--------------|----------|---------------|--------|---------------|------------|-------|-------------|------------|------------|
| 2025-10-20T10:30:00Z | 2025-10-20 | Al-Hasa 1  | 1450.00    | 50.00        | 57.50          | 200.00       | 100.00       | 300.00   | 150.00        | 0.00   | 842.50        | 800.00     | 42.50 | 842.50      | 0.00       | 15         |
```

#### Tab 2: `Transactions` (Detailed Line Items)

Auto-created with headers:
```
| Timestamp            | Date       | Route      | Category         | Code | Item Name   | Unit | Price | Quantity | Total  |
|----------------------|------------|------------|------------------|------|-------------|------|-------|----------|--------|
| 2025-10-20T10:30:00Z | 2025-10-20 | Al-Hasa 1  | Sunflower Seeds  | 4402 | 200g        | bag  | 58.00 | 10       | 580.00 |
| 2025-10-20T10:30:00Z | 2025-10-20 | Al-Hasa 1  | Sunflower Seeds  | 4401 | 100g        | bag  | 34.00 | 5        | 170.00 |
```

#### Tab 3: `Cash Denominations` (Breakdown)

Auto-created with headers:
```
| Timestamp            | Date       | Route      | 500 SAR | 100 SAR | 50 SAR | 20 SAR | 10 SAR | 5 SAR | 2 SAR | 1 SAR | 0.50 SAR | 0.25 SAR | Total Notes | Total Coins | Total Cash |
|----------------------|------------|------------|---------|---------|--------|--------|--------|-------|-------|-------|----------|----------|-------------|-------------|------------|
| 2025-10-20T10:30:00Z | 2025-10-20 | Al-Hasa 1  | 1       | 3       | 0      | 0      | 0      | 0     | 20    | 5     | 0        | 0        | 800.00      | 45.00       | 845.00     |
```

---

### 3. Product Catalog Sheet (Reference Data)

**Sheet ID**: Can be in a separate workbook or in the Cash Destination sheet

**Required Tab**: `Product Catalog`

**Column Structure**:
```
| Category         | Code | Name                 | Unit  | Price |
|------------------|------|----------------------|-------|-------|
| Sunflower Seeds  | 4402 | 200g                | bag   | 58.00 |
| Sunflower Seeds  | 4401 | 100g                | bag   | 34.00 |
| Sunflower Seeds  | 1129 | 25g                 | bag   | 16.00 |
| Pumpkin Seeds    | 8001 | 15g                 | box   | 16.00 |
| Melon Seeds      | 9001 | 15g                 | box   | 16.00 |
| Popcorn          | 1701 | Cheese              | bag   | 5.00  |
```

**Notes**:
- Categories will be converted to lowercase with underscores for API consistency
- Example: "Sunflower Seeds" → `sunflower_seeds` in the API response

---

## Part 2: Deploy Google Apps Script

### Step 1: Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Rename the project to "Cash Reconciliation Backend"
4. Delete the default code in `Code.gs`
5. Copy the entire contents of `gas-backend/Code.gs` from this repo
6. Paste it into your `Code.gs` file

### Step 2: Configure Sheet IDs

At the top of `Code.gs`, update the `SHEET_IDS` object:

```javascript
const SHEET_IDS = {
  // Get these IDs from your Google Sheets URLs
  INVENTORY_SOURCE: 'YOUR_INVENTORY_SHEET_ID_HERE',
  CASH_DESTINATION: 'YOUR_CASH_RECONCILIATION_SHEET_ID_HERE',
  CATALOG: 'YOUR_CATALOG_SHEET_ID_HERE'
};
```

**How to find Sheet IDs**:
1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
3. Copy the long ID between `/d/` and `/edit`

### Step 3: Configure Sheet Tab Names (Optional)

If your inventory sheet tabs have different names, update:

```javascript
const SHEET_NAMES = {
  INVENTORY: {
    'Al-Hasa 1': 'Your_Actual_Tab_Name_1',
    'Al-Hasa 2': 'Your_Actual_Tab_Name_2',
    // ... etc
  },
  // ...
};
```

### Step 4: Test the Connection

1. In the Apps Script editor, click the function dropdown (next to Debug)
2. Select `testConnection`
3. Click **Run**
4. **Grant permissions**:
   - Click "Review permissions"
   - Select your Google account
   - Click "Advanced" → "Go to Cash Reconciliation Backend (unsafe)"
   - Click "Allow"
5. Check the **Execution log** (View → Logs)
6. You should see:
   ```
   ✓ Connected to Inventory Source: [Your Sheet Name]
   ✓ Connected to Cash Destination: [Your Sheet Name]
   ✓ Connected to Catalog: [Your Sheet Name]
   ```

### Step 5: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure:
   - **Description**: "Cash Reconciliation API"
   - **Execute as**: **Me** (your account)
   - **Who has access**: **Anyone** (required for external access)
5. Click **Deploy**
6. **Copy the Web App URL** (looks like):
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```

**IMPORTANT**: Save this URL! You'll need it in the next step.

---

## Part 3: Connect to Netlify

### Step 1: Set Environment Variable

1. Go to your Netlify dashboard
2. Navigate to your site → **Site configuration** → **Environment variables**
3. Click **Add a variable**
4. Set:
   - **Key**: `GAS_WEBAPP_URL`
   - **Value**: The Web App URL from Step 5 above
5. Click **Save**

### Step 2: Redeploy Site

1. In Netlify dashboard, go to **Deploys**
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete

### Step 3: Test the Connection

1. Open your Cash Reconciliation app
2. Check the **Sync Status** indicator (should show "Connected")
3. Check the **Catalog Status** (should show "Catalog: ready")
4. Try selecting a route and clicking "Fetch from Inventory"

---

## Part 4: Usage & Data Flow

### Reading Inventory Data

**When you click "Fetch from Inventory"**:

1. Frontend sends request:
   ```json
   {
     "action": "calculateSalesFromInventory",
     "route": "Al-Hasa 1",
     "currentDate": "2025-10-20",
     "previousDate": "2025-10-19"
   }
   ```

2. GAS script:
   - Opens **Inventory Source Sheet**
   - Finds the route tab
   - Reads inventory for both dates
   - Calculates: `Sales = Opening + Purchases - Closing`
   - Returns sales quantities per SKU

3. Frontend auto-populates the sales table

### Saving Cash Reconciliation

**When you click "Save Data"**:

1. Frontend sends complete reconciliation data
2. GAS script writes to **3 tabs** in Cash Destination Sheet:
   - Summary record → `Cash Reconciliation` tab
   - Individual line items → `Transactions` tab
   - Denomination breakdown → `Cash Denominations` tab

### Offline Mode

- When offline, data is saved to browser localStorage
- When connection is restored, pending changes sync automatically
- Check "Sync Status" indicator for connection state

---

## Part 5: Troubleshooting

### Issue: "Catalog: using default"

**Cause**: Can't connect to Catalog sheet

**Fix**:
1. Verify `SHEET_IDS.CATALOG` is correct
2. Check sheet has tab named "Product Catalog"
3. Verify columns: Category, Code, Name, Unit, Price

### Issue: "No inventory data found for calculation"

**Cause**: Can't find inventory records for the dates/route

**Fix**:
1. Verify inventory sheet has data for the selected date
2. Check date format is `YYYY-MM-DD`
3. Ensure "Code" column has SKU codes matching catalog
4. Check `SHEET_NAMES.INVENTORY` matches your actual tab names

### Issue: "Server returned non-JSON"

**Cause**: GAS deployment URL is incorrect or script has errors

**Fix**:
1. Re-check the `GAS_WEBAPP_URL` in Netlify environment variables
2. Test the script in Apps Script editor (use `testConnection`)
3. Check Apps Script execution logs for errors (View → Executions)

### Issue: "HTTP 403" or permission errors

**Cause**: Script doesn't have permissions

**Fix**:
1. Re-run `testConnection` and grant permissions
2. Verify "Execute as: Me" in deployment settings
3. Verify "Who has access: Anyone" in deployment settings

### Issue: Data not saving to sheets

**Cause**: Sheet IDs incorrect or tabs don't exist

**Fix**:
1. Verify `SHEET_IDS.CASH_DESTINATION` is correct
2. Let GAS auto-create the tabs (they'll be created on first save)
3. Check Apps Script execution log for error messages

---

## Part 6: Updating the Script

**When you make changes to the GAS code**:

1. Edit `Code.gs` in Apps Script editor
2. Click **Save** (💾)
3. Click **Deploy** → **Manage deployments**
4. Click the **pencil icon** ✏️ next to your deployment
5. Change **Version**: New version
6. Click **Deploy**
7. No need to update Netlify (URL stays the same)

---

## Part 7: Security & Permissions

### Current Setup

- **Execute as**: Your Google account (has access to all sheets)
- **Access**: Anyone with the URL (required for external apps)

### Data Protection

1. **Keep the Web App URL secret** (stored in Netlify env vars, not in code)
2. **Use HTTPS only** (enforced by Google)
3. **Google Sheets permissions**: Control who can view/edit the sheets directly
4. **Consider**: Add API key authentication for production

### Future Enhancements

If you want to add authentication:

```javascript
// In doPost(), add at the top:
const API_KEY = 'your-secret-api-key';
if (payload.apiKey !== API_KEY) {
  return ContentService
    .createTextOutput(JSON.stringify({status: 'error', error: 'Unauthorized'}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Then in frontend `config.js`:
```javascript
const CONFIG = {
  API_KEY: 'your-secret-api-key', // Store in Netlify env var in production
  // ...
};
```

---

## Summary

✅ **Inventory Source Sheet**: Managed by Inventory App (read-only for Cash App)
✅ **Cash Destination Sheet**: Managed by Cash App (3 auto-created tabs)
✅ **Product Catalog**: Reference data for both apps
✅ **GAS Backend**: Bridges the two apps with proper separation
✅ **Offline Support**: Data syncs when connection restored

Your data is now properly separated with clear boundaries between the inventory and cash reconciliation systems!
