# 🔧 Backend Configuration - IMPORTANT!

## ⚠️ ACTION REQUIRED

Your backend Code.gs has been updated with the correct sheet IDs, but you need to **deploy this to Google Apps Script** for it to work.

## 📊 Configured Sheet IDs

### ✅ Updated Configuration

```javascript
const SHEET_IDS = {
  // Inventory Source (where sales data is calculated from)
  INVENTORY_SOURCE: '1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0',

  // Cash Destination (where cash reconciliation is saved)
  CASH_DESTINATION: '1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414',

  // Product Catalog (using same as inventory source)
  CATALOG: '1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0'
};
```

### 📋 Sheet URLs

- **Inventory Source**: https://docs.google.com/spreadsheets/d/1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0/edit
- **Cash Destination**: https://docs.google.com/spreadsheets/d/1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414/edit

## 🚀 How to Deploy

### Step 1: Copy Updated Code.gs

1. Open the file: `gas-backend/Code.gs` (in this repository)
2. **Copy ALL the code** (the entire file)

### Step 2: Update Google Apps Script

1. Go to: https://script.google.com
2. Open your existing Cash Reconciliation script project
   - OR create a new project if you haven't yet
3. Delete all existing code in Code.gs
4. Paste the new code from `gas-backend/Code.gs`
5. Click **Save** (💾 icon)

### Step 3: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click ⚙️ (gear icon) → Select **Web app**
3. Set configuration:
   - **Description**: "Cash Recon v2 - Updated Sheet IDs"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/AKfycb.../exec`)
6. Click **Done**

### Step 4: Verify Deployment URL

Your current backend URL is:
```
https://script.google.com/macros/s/AKfycbzKiyFWj4QsKUakcSiqTwtLewCZeMM-bqRr2Ganjd0kZjHk0SXzJGt2HAejs_683um2/exec
```

If you created a new deployment, update the URL in:
- Your Netlify environment variable `GAS_WEBAPP_URL`
- OR in `netlify/functions/gas.js` (fallback URL)

## 🧪 How to Test

After deploying:

1. Clear your browser cache (go to `/clear-cache.html`)
2. Select a route (e.g., "Al-Hasa 1")
3. Select today's date
4. Click "Fetch from Inventory"
5. Check console logs - you should see data!

## 📋 Expected Tab Names in Sheets

### In Inventory Source Sheet (`1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0`)

The backend expects these tab names:
- `Al-Hasa 1` (for route 1)
- `Al-Hasa 2` (for route 2)
- `Al-Hasa 3` (for route 3)
- `Al-Hasa 4` (for route 4)
- `Al-Hasa Wholesale` (for wholesale route)
- `Product Catalog` (for product list with codes, names, prices)

### In Cash Destination Sheet (`1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414`)

The backend expects these tab names:
- `CASH_RECONCILIATION` (for daily cash records)
- `CASH_DENOMINATIONS` (for denomination breakdowns)
- `Transactions` (optional - for consolidated sales)

## ❓ If Data Still Shows Zero

After deploying, if data is still zero, check:

1. **Tab names match exactly** (case-sensitive!)
2. **Sheet permissions**: The script can access both sheets
3. **Data exists** in the inventory sheet for the selected date
4. **Console logs** show what the backend is returning

## 🆘 Need Help?

Share the console output after clicking "Fetch from Inventory" and I can help debug further!
