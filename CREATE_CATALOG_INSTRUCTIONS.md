# 📦 Auto-Generate Product Catalog - Step-by-Step Guide

## 🎯 What This Does

This script will **automatically create** a "Product Catalog" tab by:
1. ✅ Scanning ALL your route tabs (Al-Hasa 1, 2, 3, 4, Wholesale)
2. ✅ Finding all unique product codes
3. ✅ Creating a formatted "Product Catalog" tab
4. ✅ Pre-filling smart default prices (which you can edit)
5. ✅ Making it fully editable for future updates

**Result**: A complete, editable product catalog with all your actual products!

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Open Google Apps Script

1. Go to your **inventory sheet**:
   https://docs.google.com/spreadsheets/d/1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0/edit

2. Click **Extensions** → **Apps Script**

3. You should see your existing Code.gs file

### Step 2: Add the CreateProductCatalog Script

1. Click the **+** button next to "Files"
2. Choose **Script**
3. Name it: `CreateProductCatalog`
4. Delete the sample code in the new file
5. Copy **ALL** the code from `gas-backend/CreateProductCatalog.gs` (in this repository)
6. Paste it into the new file
7. Click **Save** (💾 icon)

### Step 3: Run the Script

1. Make sure `CreateProductCatalog.gs` is open
2. In the function dropdown (top toolbar), select: **createProductCatalog**
3. Click **Run** (▶️ icon)
4. **First time only**: Grant permissions
   - Click "Review permissions"
   - Choose your Google account
   - Click "Advanced" → "Go to Untitled project (unsafe)"
   - Click "Allow"
5. Wait a few seconds...
6. You'll see a success message: **"Product Catalog created with X products!"**

### Step 4: Check Your Sheet

1. Go back to your inventory sheet
2. Look at the bottom tabs - you should see a new **"Product Catalog"** tab!
3. Click on it to see all your products

---

## ✏️ Editing the Catalog (Anytime)

### Update Prices
1. Click on any price cell
2. Type the new price
3. Press Enter
4. Done! Auto-saves

### Add New Product
1. Click on a new empty row
2. Fill in: Category | Code | Name | Unit | Price
3. Press Enter
4. Done! Auto-saves

### Example:
| Category | Code | Name | Unit | Price |
|----------|------|------|------|-------|
| Sunflower Seeds | 5501 | 500g Premium | bag | 75 |

---

## 🎨 Features of the Generated Catalog

✅ **Beautiful Formatting**
- Purple header row (#667eea - matches your app!)
- Alternating row colors for easy reading
- Frozen header row
- Auto-sized columns

✅ **Smart Categorization**
- Automatically groups products:
  - Sunflower Seeds (codes 44xx, 11xx)
  - Pumpkin Seeds (codes 80xx, 1142)
  - Melon Seeds (codes 90xx)
  - Popcorn (codes 17xx)
  - Other Products (anything else)

✅ **Smart Price Defaults**
- 10KG bags: SAR 150-230
- 200g bags: SAR 58
- 100g bags: SAR 34
- Small boxes: SAR 16
- Popcorn: SAR 5
- **You can change any price!**

✅ **Custom Menu**
After running once, you'll see a new menu: **🧾 Cash Recon Tools**
- Create Product Catalog
- About

---

## 📋 What to Expect

### Sample Output:

```
Product Catalog created with 47 products!

You can now:
• Edit prices directly in the sheet
• Add new rows for new products
• Update categories, names, units

The catalog will be used by your Cash Reconciliation app.
```

### Your catalog will look like:

| Category | Code | Name | Unit | Price |
|----------|------|------|------|-------|
| Sunflower Seeds | 4402 | 200g | bag | 58.00 |
| Sunflower Seeds | 4401 | 100g | bag | 34.00 |
| Sunflower Seeds | 1129 | 25g | bag | 16.00 |
| Pumpkin Seeds | 8001 | 15g | box | 16.00 |
| Pumpkin Seeds | 8002 | 110g | box | 54.00 |
| ... | ... | ... | ... | ... |

---

## ⚠️ Important Notes

### 1. **Product Codes Must Match**
The codes in the catalog **must exactly match** the codes in your inventory sheets.
- The script automatically extracts codes from your sheets
- Don't change codes unless you also update inventory sheets

### 2. **If Catalog Already Exists**
When you run the script and a catalog exists:
- You'll get a prompt: "Replace existing catalog?"
- **YES**: Creates fresh catalog from current inventory (loses manual edits)
- **NO**: Keeps existing catalog

### 3. **What Sheets Are Scanned**
The script scans these tabs:
- Al-Hasa 1
- Al-Hasa 2
- Al-Hasa 3
- Al-Hasa 4
- Al-Hasa Wholesale

### 4. **Column Requirements**
Your inventory sheets should have:
- ✅ **Code** column (required - product code/SKU)
- ✅ **Item Name** or **Product** column (optional - helps with names)

---

## 🆘 Troubleshooting

### Error: "No products found"
**Cause**: Script couldn't find "Code" column in your sheets
**Fix**: Make sure your inventory sheets have a column named exactly "Code"

### Error: "Sheet not found: Al-Hasa 1"
**Cause**: Tab name doesn't match exactly
**Fix**: Make sure tabs are named exactly as listed (case-sensitive)

### Prices seem wrong
**Cause**: Script uses smart defaults based on product names
**Fix**: Just edit the prices directly in the catalog! That's what it's for.

### Want to add a product manually?
**How**:
1. Go to Product Catalog tab
2. Click on empty row at bottom
3. Type: Category, Code, Name, Unit, Price
4. Done!

---

## 🔄 Re-running the Script

You can run it again anytime to:
- Rebuild catalog from scratch
- Pick up new products from inventory
- Reset to smart defaults

**Warning**: Re-running will replace your manually edited prices!

**Best Practice**:
- Run once to create
- Edit prices manually after
- Only re-run if you add many new products to inventory

---

## ✅ After Creating Catalog

### Next Steps:

1. **Review the catalog**
   - Check if product names make sense
   - Verify prices are reasonable
   - Edit any prices that are wrong

2. **Deploy the backend**
   - Follow `BACKEND_DEPLOY.md` instructions
   - The backend will now use your custom catalog!

3. **Test the app**
   - Clear browser cache (`/clear-cache.html`)
   - Select a route
   - Click "Fetch from Inventory"
   - You should see your products with correct prices!

---

## 🎉 Benefits

✅ **No manual data entry** - Automated extraction
✅ **All products included** - Scans every route
✅ **Smart defaults** - Intelligent price guessing
✅ **Fully editable** - Update anytime
✅ **Beautiful formatting** - Professional look
✅ **Easy maintenance** - Simple to add products

---

## 📞 Need Help?

If you encounter any issues:
1. Check the error message
2. Verify column names in inventory sheets
3. Share the error with me for debugging

**Pro Tip**: After first run, you'll have a custom menu in your sheet for easy access!
