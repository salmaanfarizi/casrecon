# Google Apps Script Backend

This directory contains the backend code for the Cash Reconciliation System.

## Quick Start

1. **Read** [`SETUP.md`](./SETUP.md) for complete deployment instructions
2. **Copy** `Code.gs` to your Google Apps Script project
3. **Configure** the sheet IDs in the SHEET_IDS object
4. **Deploy** as a Web App
5. **Add** the deployment URL to Netlify environment variables

## Files

- **`Code.gs`**: Main backend script (deploy this to Google Apps Script)
- **`SETUP.md`**: Complete setup and deployment guide
- **`SHEET_TEMPLATES.md`**: Google Sheets structure templates

## Architecture

```
Frontend (PWA) → Netlify Function → Google Apps Script → Google Sheets
```

### Data Flow

**Reading Inventory** (from Inventory App's sheet):
- Action: `calculateSalesFromInventory`
- Source: Inventory Source Sheet (read-only)
- Returns: Calculated sales quantities per SKU

**Writing Cash Data** (to Cash App's sheet):
- Action: `saveCashReconciliation`
- Destination: Cash Destination Sheet (3 tabs)
  - Cash Reconciliation (summary)
  - Transactions (line items)
  - Cash Denominations (breakdown)

**Loading Catalog** (shared reference data):
- Action: `init`
- Source: Catalog Sheet
- Returns: Product catalog with SKUs, prices, categories

## Key Features

✅ **Separated Data Storage**: Clean separation between inventory and cash reconciliation
✅ **Auto-Sheet Creation**: Destination sheets are created automatically
✅ **Comprehensive Logging**: All actions logged for debugging
✅ **Error Handling**: Graceful fallbacks with default catalog
✅ **Multi-Route Support**: 5 routes (Al-Hasa 1-4, Wholesale)
✅ **Detailed Breakdown**: Tracks denominations, payment methods, discounts

## API Actions

| Action | Purpose | Payload | Response |
|--------|---------|---------|----------|
| `init` | Load product catalog | None | Catalog object |
| `ping` | Connection test | None | Success status |
| `heartbeat` | Keep session alive | userId, route, module | Timestamp |
| `calculateSalesFromInventory` | Get sales from inventory | route, currentDate, previousDate | Sales array |
| `saveCashReconciliation` | Save reconciliation | Full data object | Success status |

## Environment Requirements

- Google Account with access to all sheets
- Google Apps Script project
- Netlify environment variable: `GAS_WEBAPP_URL`

## Support

For issues or questions:
1. Check the Apps Script execution log (View → Executions)
2. Run `testConnection()` function to verify sheet access
3. Review [`SETUP.md`](./SETUP.md) troubleshooting section

## Version

Current: 1.0.0 (Initial separated architecture)
