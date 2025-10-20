# Backend Configuration Status

## ✅ What's Already Configured

### 1. Google Apps Script Backend URL
```
https://script.google.com/macros/s/AKfycbzKiyFWj4QsKUakcSiqTwtLewCZeMM-bqRr2Ganjd0kZjHk0SXzJGt2HAejs_683um2/exec
```

**Status**: ✅ **DEPLOYED**

This URL is already set as the fallback in `netlify/functions/gas.js`.

### 2. Cash Destination Sheet ID
```
1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414
```

**Status**: ✅ **CONFIGURED** in `gas-backend/Code.gs`

---

## ⏳ What Still Needs Configuration

### 1. Netlify Environment Variable (Recommended)

Although the URL is hardcoded as fallback, it's **recommended** to set it as an environment variable for better security and flexibility.

**Steps**:
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Navigate to your site → **Site configuration** → **Environment variables**
3. Click **Add a variable**
4. Set:
   - **Key**: `GAS_WEBAPP_URL`
   - **Value**: `https://script.google.com/macros/s/AKfycbzKiyFWj4QsKUakcSiqTwtLewCZeMM-bqRr2Ganjd0kZjHk0SXzJGt2HAejs_683um2/exec`
5. Click **Save**
6. **Redeploy** your site

**Why?**
- ✅ Better security (URL not in code)
- ✅ Easy to update without code changes
- ✅ Different URLs for dev/prod environments

### 2. Inventory Source Sheet ID

In your deployed GAS backend (`Code.gs`), update this line:

```javascript
const SHEET_IDS = {
  INVENTORY_SOURCE: 'YOUR_INVENTORY_SHEET_ID_HERE',  // ← Add this
  CASH_DESTINATION: '1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414',  // ✅ Already set
  CATALOG: 'YOUR_CATALOG_SHEET_ID_HERE'  // ← Add this
};
```

**How to get Sheet IDs**:
1. Open the Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
3. Copy the ID between `/d/` and `/edit`

### 3. Product Catalog Sheet ID

Same as above - add your catalog sheet ID to the GAS backend configuration.

---

## 🧪 Test Your Backend

### Option 1: Quick Test via Browser

Open this URL in your browser:
```
https://script.google.com/macros/s/AKfycbzKiyFWj4QsKUakcSiqTwtLewCZeMM-bqRr2Ganjd0kZjHk0SXzJGt2HAejs_683um2/exec
```

**Expected**: You'll see an error (because it's a POST endpoint), but if the backend is deployed correctly, you'll get a response (not a 404).

### Option 2: Test via Your App

1. Open your cash reconciliation app
2. Check the **Sync Status** indicator at the top
3. Check the **Catalog Status** indicator

**Expected**:
- Sync Status: 🟢 Connected (or 🔴 Offline if something is wrong)
- Catalog Status: "Catalog: ready" (or "Catalog: using default" if catalog sheet not configured)

### Option 3: Test in Apps Script

In your Apps Script project (where you deployed the backend):

1. Open the script at [script.google.com](https://script.google.com)
2. Select function: `testConnection`
3. Click **Run** (▶️)
4. Check **View** → **Logs**

**Expected Output**:
```
Testing connection to sheets...
✓ Connected to Inventory Source: [Sheet Name]  // or error if not configured
✓ Connected to Cash Destination: [Your Cash Sheet Name]
✓ Connected to Catalog: [Sheet Name]  // or error if not configured
```

---

## 📋 Configuration Checklist

### Backend (Google Apps Script)
- [x] Script deployed as Web App
- [x] Deployment URL obtained
- [ ] INVENTORY_SOURCE sheet ID configured (in Code.gs)
- [x] CASH_DESTINATION sheet ID configured (in Code.gs)
- [ ] CATALOG sheet ID configured (in Code.gs)

### Frontend (Netlify)
- [ ] GAS_WEBAPP_URL environment variable set (recommended)
- [x] Fallback URL configured in gas.js (already done)
- [ ] Site redeployed after env variable added

### Google Sheets
- [x] Cash App sheet exists with data (33 records)
- [ ] Inventory source sheet exists and has data
- [ ] Product catalog sheet exists with products
- [ ] Migration script run (consolidate SALES tabs)

---

## 🔄 Current Data Flow Status

```
Frontend (PWA)
    ↓
Netlify Function (/gas.js)
    ↓ Uses: GAS_WEBAPP_URL (env var) OR fallback URL (hardcoded)
    ↓
Google Apps Script Backend
    ↓ URL: https://script.google.com/...Aejs_683um2/exec
    ↓
┌───────────────┬─────────────────┬──────────────┐
│               │                 │              │
↓               ↓                 ↓              ↓
Inventory       Cash              Catalog        ?
Source          Destination
❓ Not set      ✅ Configured     ❓ Not set
```

---

## 🚀 Next Steps

### Priority 1: Migrate Cash App Data
**Why**: Consolidate your 27 SALES tabs into proper structure

Follow: [`gas-backend/MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md)

### Priority 2: Configure Missing Sheet IDs
**Why**: Enable inventory integration and catalog loading

Update in your deployed GAS Code.gs:
- INVENTORY_SOURCE
- CATALOG

### Priority 3: Set Netlify Environment Variable (Optional but Recommended)
**Why**: Better security and flexibility

Add `GAS_WEBAPP_URL` in Netlify dashboard

---

## 🆘 Troubleshooting

### Issue: "Script URL not found" or 404 errors

**Solution**:
1. Check that the script is deployed as Web App
2. Verify "Execute as: Me" and "Who has access: Anyone"
3. Copy the exact deployment URL (ends with `/exec`)

### Issue: "Permission denied" errors

**Solution**:
1. Re-run authorization flow in Apps Script
2. Grant all requested permissions
3. Redeploy the web app

### Issue: "Sheet not found" errors

**Solution**:
1. Verify sheet IDs are correct in SHEET_IDS
2. Ensure your Google account has access to all sheets
3. Run `testConnection()` in Apps Script to diagnose

---

## 📞 Support

For detailed setup instructions:
- **[SETUP.md](./SETUP.md)** - Complete backend deployment guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Data migration steps
- **[QUICKSTART.md](../QUICKSTART.md)** - Overview of entire process

---

## Summary

✅ **Backend is deployed** and accessible at the URL above
✅ **Cash sheet is configured** and ready to receive data
⏳ **Inventory and Catalog** sheets need to be configured
⏳ **Data migration** needs to be run to consolidate SALES tabs
💡 **Netlify environment variable** recommended for production
