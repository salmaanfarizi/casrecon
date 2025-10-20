# Google Sheets Templates

This document provides copy-paste templates for setting up your Google Sheets.

---

## Template 1: Inventory Source Sheet

**Purpose**: Managed by your Inventory App, read by Cash App for sales calculation

### Create 5 Tabs (one per route):
- Al-Hasa 1
- Al-Hasa 2
- Al-Hasa 3
- Al-Hasa 4
- Al-Hasa Wholesale

### Header Row for Each Tab:
```
Date | Code | Product Name | Opening Stock | Purchases | Stock Transfer | Closing Stock
```

### Example Data:
```
2025-10-17 | 4402 | Sunflower Seeds 200g | 100 | 50  | 20 | 130
2025-10-17 | 4401 | Sunflower Seeds 100g | 75  | 0   | 10 | 65
2025-10-20 | 4402 | Sunflower Seeds 200g | 0   | 100 | 0  | 120
2025-10-20 | 4401 | Sunflower Seeds 100g | 0   | 50  | 0  | 85
```

### Important Notes:
- **Date format**: YYYY-MM-DD
- **Code**: Must match SKU codes in Product Catalog
- **Stock Transfer**: Optional column (defaults to 0 if not present)
- **Sales Calculation**: Previous Closing + Previous Transfer + Current Purchases - Current Closing
  - Example for Oct 20, Code 4402:
    - Previous (Oct 17) Closing: 130
    - Previous (Oct 17) Transfer: 0
    - Current (Oct 20) Purchases: 100
    - Current (Oct 20) Closing: 120
    - **Sales = 130 + 0 + 100 - 120 = 110 units sold**

**Smart Gap Handling**:
- If Oct 18-19 have no data (weekend), the system automatically uses Oct 17 as "previous day"
- You'll see: "Using data from 2025-10-17 (3 days ago)"

---

## Template 2: Product Catalog Sheet

**Purpose**: Master product data used by both apps

### Create 1 Tab:
- Product Catalog

### Header Row:
```
Category | Code | Name | Unit | Price
```

### Example Data:
```
Sunflower Seeds | 4402 | 200g            | bag   | 58.00
Sunflower Seeds | 4401 | 100g            | bag   | 34.00
Sunflower Seeds | 1129 | 25g             | bag   | 16.00
Sunflower Seeds | 1116 | 800g            | bag   | 17.00
Sunflower Seeds | 1145 | 130g            | box   | 54.00
Sunflower Seeds | 1126 | 10KG            | sack  | 160.00
Pumpkin Seeds   | 8001 | 15g             | box   | 16.00
Pumpkin Seeds   | 8002 | 110g            | box   | 54.00
Pumpkin Seeds   | 1142 | 10KG            | sack  | 230.00
Melon Seeds     | 9001 | 15g             | box   | 16.00
Melon Seeds     | 9002 | 110g            | box   | 54.00
Popcorn         | 1701 | Cheese          | bag   | 5.00
Popcorn         | 1702 | Butter          | bag   | 5.00
Popcorn         | 1703 | Lightly Salted  | bag   | 5.00
```

### Important Notes:
- **Category**: Used for grouping in the UI
- **Code**: Unique SKU identifier (must match inventory sheet)
- **Price**: In SAR (Saudi Riyal)

---

## Template 3: Cash Destination Sheet

**Purpose**: Written by Cash App (auto-created by GAS script)

### The GAS script will auto-create 3 tabs:

#### Tab 1: Cash Reconciliation
Headers auto-created:
```
Timestamp | Date | Route | Total Sales | Discount Base | Discount w/VAT | Credit Sales | Credit Repay | Bank POS | Bank Transfer | Cheque | Expected Cash | Cash Notes | Coins | Actual Cash | Difference | Items Sold
```

#### Tab 2: Transactions
Headers auto-created:
```
Timestamp | Date | Route | Category | Code | Item Name | Unit | Price | Quantity | Total
```

#### Tab 3: Cash Denominations
Headers auto-created:
```
Timestamp | Date | Route | 500 SAR | 100 SAR | 50 SAR | 20 SAR | 10 SAR | 5 SAR | 2 SAR | 1 SAR | 0.50 SAR | 0.25 SAR | Total Notes | Total Coins | Total Cash
```

**You don't need to create anything** - just create a blank Google Sheet and let the GAS script populate it on first save.

---

## Quick Setup Checklist

- [ ] Create "Inventory Source Sheet" with 5 route tabs
- [ ] Add inventory data with correct date format (YYYY-MM-DD)
- [ ] Create "Product Catalog Sheet" with catalog tab
- [ ] Add all your products with SKU codes
- [ ] Create blank "Cash Destination Sheet" (tabs will auto-create)
- [ ] Copy all 3 Sheet IDs from URLs
- [ ] Paste IDs into GAS `SHEET_IDS` configuration
- [ ] Deploy GAS as Web App
- [ ] Add GAS URL to Netlify environment variable

---

## Sample Google Sheets Formulas

### In Inventory Sheet: Auto-calculate Sales
If you want to add a "Sales" column for reference:

```
Column G: Sales
Formula in G2: =D2+E2-F2
(assuming D=Opening, E=Purchases, F=Closing)
```

### In Cash Destination: Summary Report
Create a separate "Daily Summary" tab:

```
=QUERY('Cash Reconciliation'!A:Q,
  "SELECT B, C, SUM(D), SUM(O), COUNT(A)
   WHERE B >= date '"&TEXT(TODAY()-7,"yyyy-MM-dd")&"'
   GROUP BY B, C
   ORDER BY B DESC", 1)
```
This creates a weekly summary by route.

### Conditional Formatting for Cash Difference

In the Cash Reconciliation tab, highlight differences:

1. Select column P (Difference)
2. Format → Conditional formatting
3. Format rules:
   - **Red**: Custom formula = `=P2<0` (shortage)
   - **Green**: Custom formula = `=AND(P2>=0, P2>0)` (excess)
   - **Blue**: Custom formula = `=P2=0` (balanced)

---

## Data Validation Examples

### Ensure Valid Dates
1. Select Date column
2. Data → Data validation
3. Criteria: Date → is valid date
4. Show warning on invalid data

### Ensure Positive Numbers
1. Select Opening Stock, Purchases, Closing Stock columns
2. Data → Data validation
3. Criteria: Number → greater than or equal to → 0

### Route Dropdown
1. Select Route column in Cash Reconciliation
2. Data → Data validation
3. Criteria: List of items
4. Items: `Al-Hasa 1, Al-Hasa 2, Al-Hasa 3, Al-Hasa 4, Al-Hasa Wholesale`

---

## Sharing & Permissions

### Inventory Source Sheet:
- **Inventory App**: Editor access (writes data)
- **Your Google Account** (for GAS): Viewer access (reads data)

### Cash Destination Sheet:
- **Your Google Account** (for GAS): Editor access (writes data)
- **Accountant/Manager**: Viewer access (reviews reports)

### Product Catalog:
- **Product Manager**: Editor access (updates catalog)
- **Your Google Account** (for GAS): Viewer access (reads catalog)

---

## Backup Strategy

### Automated Backups (Recommended)

Create a Google Apps Script in your sheets:

```javascript
function createDailyBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backupFolder = DriveApp.getFolderById('YOUR_BACKUP_FOLDER_ID');

  const today = Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd');
  const backupName = ss.getName() + ' - Backup - ' + today;

  ss.copy(backupName).moveTo(backupFolder);
}
```

Set up a time-driven trigger (daily at 11:59 PM).

---

## Need Help?

- **Check SETUP.md** for troubleshooting
- **Apps Script Logs**: View → Executions in GAS editor
- **Sheet IDs**: Always from URL, not sheet name
- **Date Format**: Must be YYYY-MM-DD for calculations to work
