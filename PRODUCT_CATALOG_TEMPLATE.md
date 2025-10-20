# Product Catalog Template

## 🎯 Purpose

This template shows how to create a "Product Catalog" tab in your inventory sheet so the backend can load your actual products.

## 📊 Required Structure

Create a new tab called **"Product Catalog"** (exact name, case-sensitive) in your inventory sheet with these columns:

| Category | Code | Name | Unit | Price |
|----------|------|------|------|-------|
| Sunflower Seeds | 4402 | 200g | bag | 58 |
| Sunflower Seeds | 4401 | 100g | bag | 34 |
| Sunflower Seeds | 1129 | 25g | bag | 16 |
| Sunflower Seeds | 1116 | 800g | bag | 17 |
| Sunflower Seeds | 1145 | 130g | box | 54 |
| Sunflower Seeds | 1126 | 10KG | sack | 160 |
| Pumpkin Seeds | 8001 | 15g | box | 16 |
| Pumpkin Seeds | 8002 | 110g | box | 54 |
| Pumpkin Seeds | 1142 | 10KG | sack | 230 |
| Melon Seeds | 9001 | 15g | box | 16 |
| Melon Seeds | 9002 | 110g | box | 54 |
| Popcorn | 1701 | Cheese | bag | 5 |
| Popcorn | 1702 | Butter | bag | 5 |
| Popcorn | 1703 | Lightly Salted | bag | 5 |

## 📋 Column Descriptions

1. **Category** (Text)
   - Group name for products (e.g., "Sunflower Seeds", "Pumpkin Seeds")
   - Used to organize products in the UI

2. **Code** (Text)
   - Unique product code/SKU (e.g., "4402", "8001")
   - **MUST match** the codes in your inventory sheets!
   - Case-sensitive

3. **Name** (Text)
   - Product description (e.g., "200g", "Cheese")
   - Displayed in the app

4. **Unit** (Text)
   - Unit of measurement (e.g., "bag", "box", "sack")
   - Displayed in the app

5. **Price** (Number)
   - Selling price in SAR
   - Used to calculate total sales

## ✅ How to Create

### Step 1: Open Your Inventory Sheet
https://docs.google.com/spreadsheets/d/1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0/edit

### Step 2: Create New Tab
1. Click the **+** button at the bottom to add a new sheet
2. Rename it to: **Product Catalog** (exact name!)

### Step 3: Add Headers
In row 1, add these column headers:
- A1: Category
- B1: Code
- C1: Name
- D1: Unit
- E1: Price

### Step 4: Add Your Products
Starting from row 2, add all your products following the template above.

**IMPORTANT**:
- Product codes in the catalog **must exactly match** the codes in your inventory sheets
- Category names will be used to group products in the UI

### Step 5: Save
Google Sheets auto-saves. Once done, the backend will automatically use your catalog!

## 🔍 Verification

After creating the catalog:
1. Deploy the backend Code.gs
2. Clear browser cache
3. Open the app
4. You should see your products listed in the sales table

## ❓ If You Already Have This Data

If you already have a product list in a different tab (with a different name), tell me:
1. What's the tab name?
2. What are the column names?

I can update the backend configuration to use your existing tab!

## 🆘 Using Default Catalog

If you don't create the "Product Catalog" tab, the backend will automatically use the built-in default catalog shown above. This is fine for testing!
