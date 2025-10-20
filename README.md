# Cash Reconciliation System

A Progressive Web Application (PWA) for daily cash reconciliation and sales tracking with inventory integration.

## Overview

This system helps you manage daily cash reconciliation across multiple sales routes by:
- Tracking sales by SKU with detailed breakdowns
- Calculating cash differences (expected vs actual)
- Managing payment methods (cash, POS, transfers, cheques)
- Tracking cash denominations (notes and coins)
- Auto-calculating sales from inventory data
- Supporting offline mode with automatic sync

## Features

✅ **Multi-Route Support**: 5 routes (Al-Hasa 1-4, Wholesale)
✅ **Inventory Integration**: Auto-calculate sales from inventory sheets
✅ **Payment Tracking**: Bank transfers, POS, cheques, credit sales/repayments
✅ **Cash Breakdown**: Detailed denomination counting (500, 100, 50, 20, 10, 5 SAR notes + coins)
✅ **Discount Management**: Base discount with automatic 15% VAT calculation
✅ **Offline Support**: Works without internet, syncs when connected
✅ **PWA**: Install as app on mobile/desktop
✅ **Real-time Status**: Connection, catalog, and sync indicators
✅ **CSV Export**: Export reconciliation reports

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (PWA)                             │
│  ├─ index.html (UI)                         │
│  ├─ app.js (Business Logic)                 │
│  ├─ config.js (Configuration)               │
│  ├─ styles.css (Styling)                    │
│  └─ sw.js (Service Worker)                  │
└──────────────┬──────────────────────────────┘
               │ Fetch API
┌──────────────▼──────────────────────────────┐
│  Netlify Functions                          │
│  └─ gas.js (CORS Proxy)                     │
└──────────────┬──────────────────────────────┘
               │ HTTPS POST
┌──────────────▼──────────────────────────────┐
│  Google Apps Script Backend                 │
│  └─ See gas-backend/ folder                 │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ↓                ↓
┌─────────────┐  ┌─────────────┐
│ Inventory   │  │ Cash Recon  │
│ Source      │  │ Destination │
│ Sheet       │  │ Sheet       │
│ (Read)      │  │ (Write)     │
└─────────────┘  └─────────────┘
```

## Project Structure

```
casrecon/
├── index.html              # Main UI
├── app.js                  # Application logic
├── config.js               # Configuration
├── styles.css              # Styling
├── sw.js                   # Service Worker (offline support)
├── manifest.json           # PWA manifest
├── netlify.toml            # Netlify configuration
├── netlify/
│   └── functions/
│       └── gas.js          # Google Apps Script proxy
└── gas-backend/            # Backend deployment files
    ├── Code.gs             # Google Apps Script code
    ├── SETUP.md            # Complete setup guide
    ├── README.md           # Backend overview
    └── SHEET_TEMPLATES.md  # Google Sheets templates
```

## Getting Started

### 1. Deploy Frontend (Netlify)

This app is designed to be deployed on Netlify:

1. **Connect Repository**:
   - Go to [Netlify](https://netlify.com)
   - New Site → Import from Git
   - Select this repository

2. **Build Settings**:
   - Build command: (leave empty - static site)
   - Publish directory: `.` (root)

3. **Deploy**:
   - Click "Deploy site"
   - Your app will be live at `https://your-site.netlify.app`

### 2. Deploy Backend (Google Apps Script)

See **[gas-backend/SETUP.md](./gas-backend/SETUP.md)** for complete instructions:

1. Create Google Apps Script project
2. Copy `gas-backend/Code.gs` to the project
3. Configure Sheet IDs
4. Deploy as Web App
5. Copy deployment URL

### 3. Connect Backend to Frontend

1. In Netlify dashboard → Site configuration → Environment variables
2. Add variable:
   - **Key**: `GAS_WEBAPP_URL`
   - **Value**: Your GAS Web App URL
3. Redeploy site

### 4. Set Up Google Sheets

See **[gas-backend/SHEET_TEMPLATES.md](./gas-backend/SHEET_TEMPLATES.md)** for templates.

You need 3 Google Sheets:

1. **Inventory Source Sheet** (managed by Inventory App)
   - 5 tabs (one per route)
   - Columns: Date, Code, Product Name, Opening Stock, Purchases, Closing Stock

2. **Cash Destination Sheet** (managed by this app)
   - Auto-created tabs on first save
   - Stores all cash reconciliation data

3. **Product Catalog Sheet** (shared reference)
   - Tab: Product Catalog
   - Columns: Category, Code, Name, Unit, Price

## Usage

### Daily Workflow

1. **Select Route**: Choose your sales route (Al-Hasa 1-4 or Wholesale)

2. **Load Sales Data**:
   - **Option A**: Click "Fetch from Inventory" to auto-calculate from inventory
   - **Option B**: Manually enter quantities in the sales table

3. **Enter Discount** (if applicable):
   - Base discount amount
   - VAT (15%) calculated automatically

4. **Enter Payment Methods**:
   - Credit Sales (given to customers)
   - Credit Repayment (collected from customers)
   - Bank POS deposits
   - Bank Transfers
   - Cheques

5. **Count Cash**:
   - Enter note counts (500, 100, 50, 20, 10, 5 SAR)
   - Enter coin counts (2, 1, 0.50, 0.25 SAR)
   - System calculates total automatically

6. **Review Difference**:
   - Green: Balanced (expected = actual)
   - Red: Cash short (actual < expected)
   - Orange: Cash over (actual > expected)

7. **Save**: Click "Save Data" to store to Google Sheets

8. **Export** (optional): Download CSV report

### Sales Calculation from Inventory

The system calculates sales using the formula:

```
Sales = Opening Stock + Purchases - Closing Stock
```

For example:
- Previous day closing: 80 units
- Today opening: 80 units
- Purchases: 100 units
- Today closing: 110 units
- **Sales = 80 + 100 - 110 = 70 units**

### Cash Balance Calculation

```
Expected Cash = Total Sales
              - Discount (with 15% VAT)
              - Credit Sales
              + Credit Repayment
              - Bank POS
              - Bank Transfers
              - Cheques
```

```
Actual Cash = Cash Notes + Coins
```

```
Difference = Actual Cash - Expected Cash
```

## Offline Mode

The app works offline using:
- **Service Worker**: Caches app files
- **Local Storage**: Stores pending changes
- **Auto-sync**: Syncs when connection restored

**Status Indicators**:
- 🟢 Connected: Online and synced
- 🔴 Offline: No connection (data saved locally)
- 🟡 Syncing: Uploading pending changes

## Configuration

### Frontend Config (config.js)

```javascript
const CONFIG = {
  GOOGLE_SCRIPT_URL: '/.netlify/functions/gas',  // Netlify proxy
  HEARTBEAT_INTERVAL: 15_000,  // 15 seconds
  POLLING_INTERVAL: 5_000,     // 5 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2_000,
  USER_ID: 'auto-generated'
};
```

### Backend Config (gas-backend/Code.gs)

```javascript
const SHEET_IDS = {
  INVENTORY_SOURCE: 'your-inventory-sheet-id',
  CASH_DESTINATION: 'your-cash-sheet-id',
  CATALOG: 'your-catalog-sheet-id'
};
```

## Development

### Local Development

1. Clone repository
2. Open `index.html` in browser (or use local server)
3. Note: Backend features require GAS deployment

### Testing

Use browser DevTools:
- **Console**: Check for errors
- **Application → Service Workers**: Verify offline support
- **Application → Local Storage**: View cached data
- **Network**: Monitor API calls

## Troubleshooting

### "Catalog: using default"
- Check `GAS_WEBAPP_URL` environment variable
- Verify GAS deployment is accessible
- Check Sheet IDs in GAS code

### "No inventory data found"
- Verify inventory sheet has data for selected date
- Check date format: YYYY-MM-DD
- Ensure SKU codes match catalog

### "Offline" status when online
- Check network connection
- Verify GAS Web App is deployed correctly
- Check browser console for errors

### Data not saving
- Check sync status indicator
- Data saved locally if offline (will sync when online)
- Check Apps Script execution log

See **[gas-backend/SETUP.md](./gas-backend/SETUP.md)** for more troubleshooting.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Google Apps Script (JavaScript)
- **Hosting**: Netlify (static + functions)
- **Storage**: Google Sheets
- **Offline**: Service Workers, Local Storage

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## License

Private project - All rights reserved

## Support

For setup help, see:
- **[gas-backend/SETUP.md](./gas-backend/SETUP.md)** - Complete setup guide
- **[gas-backend/SHEET_TEMPLATES.md](./gas-backend/SHEET_TEMPLATES.md)** - Sheet structure templates

## Version History

- **v1.0** (Current): Separated architecture with inventory integration
  - Discount tracking with 15% VAT
  - Detailed cash denomination breakdown
  - Offline support with auto-sync
  - Multi-route support (5 routes)
  - CSV export functionality
