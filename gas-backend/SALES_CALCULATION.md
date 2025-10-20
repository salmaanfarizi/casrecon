# Sales Calculation Logic - Updated for Non-Consecutive Days

## Problem Statement

The original sales calculation assumed consecutive days:
```
Sales = Previous Day Stock + Purchases - Current Day Stock
```

**Issue**: When there are non-working days (weekends, holidays, missed entries), the "previous day" might have no data.

---

## Solution: Smart Last Available Date Lookup

The backend now automatically finds the **last available date with data** before the current date.

### Updated Formula

```
Sales = Previous Closing Stock + Previous Stock Transfer + Current Purchases - Current Closing Stock
```

Where:
- **Previous Closing Stock**: From the LAST date with data (not necessarily yesterday)
- **Previous Stock Transfer**: Stock transferred from the LAST date with data
- **Current Purchases**: New stock added on current date
- **Current Closing Stock**: Remaining stock at end of current date

---

## Example Scenarios

### Scenario 1: Normal Consecutive Days

**Data**:
- Monday (Oct 20): Closing Stock = 100, Transfer = 20
- Tuesday (Oct 21): Purchases = 50, Closing Stock = 120

**Calculation for Tuesday**:
```
Sales = 100 (Monday closing) + 20 (Monday transfer) + 50 (Tuesday purchases) - 120 (Tuesday closing)
Sales = 50 units
```

---

### Scenario 2: Weekend Gap (Friday → Monday)

**Data**:
- Friday (Oct 17): Closing Stock = 100, Transfer = 20
- Saturday (Oct 18): NO DATA (weekend)
- Sunday (Oct 19): NO DATA (weekend)
- Monday (Oct 20): Purchases = 80, Closing Stock = 150

**Old Logic** (WRONG):
- Would look for Sunday's data → Not found → Might fail or use zeros

**New Logic** (CORRECT):
- Searches backward from Monday
- Finds Friday as the last available date
- Uses Friday's closing stock (100) and transfer (20)

**Calculation for Monday**:
```
Sales = 100 (Friday closing) + 20 (Friday transfer) + 80 (Monday purchases) - 150 (Monday closing)
Sales = 50 units
```

**Message shown to user**:
> "Sales calculated! Using data from 2025-10-17 (3 days ago)"

---

### Scenario 3: Long Holiday Gap

**Data**:
- Thursday (Oct 9): Closing Stock = 80, Transfer = 10
- Oct 10-15: NO DATA (holiday week)
- Monday (Oct 16): Purchases = 100, Closing Stock = 140

**New Logic**:
- Finds Oct 9 as last available date (7 days ago)
- Uses Oct 9's data for calculation

**Calculation**:
```
Sales = 80 + 10 + 100 - 140
Sales = 50 units
```

**Message**:
> "Sales calculated! Using data from 2025-10-09 (7 days ago)"

---

## Backend Implementation

### Step 1: Find All Available Dates

```javascript
const availableDates = new Set();
for (let i = 1; i < data.length; i++) {
  const rowDate = new Date(data[i][dateIdx]);
  const dateStr = rowDate.toISOString().split('T')[0];

  if (rowDate < currDateObj) {
    availableDates.add(dateStr);
  }
}
```

### Step 2: Find Last Available Date

```javascript
let lastAvailableDate = null;
if (availableDates.size > 0) {
  const sortedDates = Array.from(availableDates).sort().reverse();
  lastAvailableDate = sortedDates[0]; // Most recent
}
```

### Step 3: Calculate Sales

```javascript
const previous = inventoryByDate[lastAvailableDate] || {};
const current = inventoryByDate[currDateStr] || {};

const salesQty = previous.closing + previous.transfer + current.purchases - current.closing;
```

---

## Inventory Sheet Structure

### Required Columns

| Column Name | Description | Example |
|-------------|-------------|---------|
| **Date** | Entry date | 2025-10-20 |
| **Code** | Product SKU | 4402 |
| **Product Name** | Item name | Sunflower Seeds 200g |
| **Opening Stock** | Stock at start of day | 100 |
| **Purchases** | New stock received | 50 |
| **Stock Transfer** | Stock transferred (optional) | 20 |
| **Closing Stock** | Stock at end of day | 120 |

### Notes:
- **Stock Transfer** column is optional (defaults to 0 if not present)
- **Date** must be in YYYY-MM-DD format
- All dates must be unique per product code

---

## Response Format

The backend now returns metadata about which date was used:

```json
{
  "status": "success",
  "data": [
    {
      "code": "4402",
      "salesQty": 50,
      "previousClosing": 100,
      "previousTransfer": 20,
      "currentPurchases": 50,
      "currentClosing": 120,
      "lastDataDate": "2025-10-17"
    }
  ],
  "metadata": {
    "currentDate": "2025-10-20",
    "lastAvailableDate": "2025-10-17",
    "daysGap": 3,
    "message": "Using data from 2025-10-17 (3 days ago)"
  }
}
```

---

## Frontend Display

When fetching inventory data, users will see:

**Normal (consecutive days)**:
> ✅ Sales calculated! Using data from 2025-10-19 (1 days ago)

**After weekend**:
> ✅ Sales calculated! Using data from 2025-10-17 (3 days ago)

**After holiday**:
> ✅ Sales calculated! Using data from 2025-10-09 (11 days ago)

---

## Edge Cases Handled

### 1. No Previous Data Available
If it's the first entry ever:
- `lastAvailableDate` = `null`
- `previousClosing` = `0`
- `previousTransfer` = `0`
- Sales = Purchases - Closing Stock

### 2. No Current Data
If no data for current date:
- Returns empty sales data
- Shows error message

### 3. Negative Sales (Returns/Adjustments)
The system now includes negative sales:
```javascript
if (salesQty > 0 || salesQty < 0) {
  salesData.push(...);
}
```

This handles:
- Returns
- Damaged goods adjustments
- Inventory corrections

---

## Migration Impact

### For Existing Users

✅ **Backward Compatible**: The old `previousDate` parameter is still sent by frontend but **ignored** by backend

✅ **Automatic**: No changes needed to existing inventory sheets

✅ **Transparent**: Users see which date was actually used in the success message

### For New Users

Just ensure your inventory sheet has:
- Date column
- Code column
- Closing Stock column
- (Optional) Stock Transfer column

---

## Testing the Calculation

### Test Case 1: Weekend Gap

**Setup**:
1. Add inventory data for Friday (Oct 17)
2. Skip Saturday & Sunday (no entries)
3. Add inventory data for Monday (Oct 20)
4. Click "Fetch from Inventory" on Monday

**Expected**:
- Uses Friday's data as "previous"
- Shows message: "Using data from 2025-10-17 (3 days ago)"
- Calculates sales correctly

### Test Case 2: Missing Stock Transfer Column

**Setup**:
1. Inventory sheet without "Stock Transfer" column
2. Fetch inventory data

**Expected**:
- Transfer defaults to 0
- Calculation works: `Sales = Closing + 0 + Purchases - Closing`

### Test Case 3: First Entry Ever

**Setup**:
1. Brand new sheet with only today's data
2. No previous entries

**Expected**:
- `lastAvailableDate` = null
- Uses 0 for previous closing and transfer
- Sales = Purchases - Closing Stock

---

## Logging

The backend logs which date is being used:

```
Current Date: 2025-10-20
Last Available Date (with data): 2025-10-17
```

Check these logs in Apps Script:
1. Open your script at script.google.com
2. View → Executions
3. Check the logs for `calculateSalesFromInventory`

---

## Summary

### Before (Old Logic):
❌ Assumed consecutive days
❌ Failed on weekends/holidays
❌ Used literal "previous day"

### After (New Logic):
✅ Automatically finds last available date
✅ Handles gaps (weekends, holidays, missed entries)
✅ Shows user which date was used
✅ Includes stock transfer in calculation
✅ Handles negative sales (returns)
✅ Backward compatible

---

## Formula Summary

**Complete Formula**:
```
Sales Quantity = Previous Day Closing Stock
               + Previous Day Stock Transfer
               + Current Day Purchases
               - Current Day Closing Stock
```

**Where "Previous Day" = Last date with available data before current date**
