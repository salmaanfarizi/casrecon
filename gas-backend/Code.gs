/**
 * Google Apps Script Backend for Cash Reconciliation System
 *
 * This script handles:
 * 1. Reading inventory data from source sheet (Inventory App)
 * 2. Writing cash reconciliation data to destination sheet (Cash App)
 * 3. Managing product catalog
 *
 * SETUP INSTRUCTIONS:
 * 1. Create/open your Google Apps Script project at script.google.com
 * 2. Copy this code into Code.gs
 * 3. Update the SHEET_IDS object with your actual Google Sheets IDs
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 5. Copy the deployment URL to your Netlify environment variable GAS_WEBAPP_URL
 */

// ============================================================================
// CONFIGURATION - UPDATE THESE WITH YOUR ACTUAL SHEET IDs
// ============================================================================

const SHEET_IDS = {
  // Source sheet (managed by Inventory App)
  INVENTORY_SOURCE: 'YOUR_INVENTORY_SHEET_ID_HERE',

  // Destination sheet (managed by Cash App)
  CASH_DESTINATION: 'YOUR_CASH_RECONCILIATION_SHEET_ID_HERE',

  // Product catalog sheet (can be in either workbook)
  CATALOG: 'YOUR_CATALOG_SHEET_ID_HERE'
};

const SHEET_NAMES = {
  // Tab names in the Inventory Source Sheet
  INVENTORY: {
    'Al-Hasa 1': 'Al-Hasa 1',
    'Al-Hasa 2': 'Al-Hasa 2',
    'Al-Hasa 3': 'Al-Hasa 3',
    'Al-Hasa 4': 'Al-Hasa 4',
    'Al-Hasa Wholesale': 'Al-Hasa Wholesale'
  },

  // Tab names in the Cash Destination Sheet
  CASH_RECON: 'Cash Reconciliation',
  CASH_TRANSACTIONS: 'Transactions',
  CASH_DENOMINATIONS: 'Cash Denominations',

  // Catalog tabs
  CATALOG: 'Product Catalog'
};

// ============================================================================
// WEB APP ENTRY POINT - Handle incoming requests
// ============================================================================

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    Logger.log('Action received: ' + action);

    let result;

    switch(action) {
      case 'init':
        result = handleInit();
        break;

      case 'ping':
        result = { status: 'success', message: 'pong' };
        break;

      case 'heartbeat':
        result = handleHeartbeat(payload);
        break;

      case 'calculateSalesFromInventory':
        result = calculateSalesFromInventory(payload);
        break;

      case 'saveCashReconciliation':
        result = saveCashReconciliation(payload);
        break;

      default:
        result = { status: 'error', error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// INIT - Load Product Catalog
// ============================================================================

function handleInit() {
  try {
    const catalog = loadCatalog();
    return {
      success: true,
      status: 'success',
      data: {
        catalog: catalog
      }
    };
  } catch (error) {
    Logger.log('Error in handleInit: ' + error.toString());
    return {
      success: false,
      status: 'error',
      error: error.toString()
    };
  }
}

function loadCatalog() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_IDS.CATALOG);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATALOG);

    if (!sheet) {
      Logger.log('Catalog sheet not found, returning default catalog');
      return getDefaultCatalog();
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const catalog = {};

    // Expected columns: Category, Code, Name, Unit, Price
    const catIdx = headers.indexOf('Category');
    const codeIdx = headers.indexOf('Code');
    const nameIdx = headers.indexOf('Name');
    const unitIdx = headers.indexOf('Unit');
    const priceIdx = headers.indexOf('Price');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const category = String(row[catIdx] || '').toLowerCase().replace(/\s+/g, '_');
      const item = {
        code: String(row[codeIdx] || ''),
        name: String(row[nameIdx] || ''),
        unit: String(row[unitIdx] || ''),
        price: Number(row[priceIdx] || 0)
      };

      if (!category || !item.code) continue;

      if (!catalog[category]) {
        catalog[category] = [];
      }
      catalog[category].push(item);
    }

    return Object.keys(catalog).length > 0 ? catalog : getDefaultCatalog();

  } catch (error) {
    Logger.log('Error loading catalog: ' + error.toString());
    return getDefaultCatalog();
  }
}

function getDefaultCatalog() {
  return {
    sunflower_seeds: [
      {code: '4402', name: '200g', unit: 'bag', price: 58},
      {code: '4401', name: '100g', unit: 'bag', price: 34},
      {code: '1129', name: '25g', unit: 'bag', price: 16},
      {code: '1116', name: '800g', unit: 'bag', price: 17},
      {code: '1145', name: '130g', unit: 'box', price: 54},
      {code: '1126', name: '10KG', unit: 'sack', price: 160}
    ],
    pumpkin_seeds: [
      {code: '8001', name: '15g', unit: 'box', price: 16},
      {code: '8002', name: '110g', unit: 'box', price: 54},
      {code: '1142', name: '10KG', unit: 'sack', price: 230}
    ],
    melon_seeds: [
      {code: '9001', name: '15g', unit: 'box', price: 16},
      {code: '9002', name: '110g', unit: 'box', price: 54}
    ],
    popcorn: [
      {code: '1701', name: 'Cheese', unit: 'bag', price: 5},
      {code: '1702', name: 'Butter', unit: 'bag', price: 5},
      {code: '1703', name: 'Lightly Salted', unit: 'bag', price: 5}
    ]
  };
}

// ============================================================================
// HEARTBEAT - Keep session alive
// ============================================================================

function handleHeartbeat(payload) {
  const timestamp = new Date().toISOString();
  Logger.log('Heartbeat from ' + payload.userId + ' at ' + timestamp);

  return {
    status: 'success',
    timestamp: timestamp
  };
}

// ============================================================================
// CALCULATE SALES FROM INVENTORY - Read from Inventory Source Sheet
// ============================================================================

function calculateSalesFromInventory(payload) {
  try {
    const route = payload.route;
    const currentDate = payload.currentDate;
    const previousDate = payload.previousDate;

    if (!route || !currentDate || !previousDate) {
      return {
        status: 'error',
        error: 'Missing required parameters: route, currentDate, previousDate'
      };
    }

    // Open the INVENTORY SOURCE sheet
    const ss = SpreadsheetApp.openById(SHEET_IDS.INVENTORY_SOURCE);
    const sheetName = SHEET_NAMES.INVENTORY[route];

    if (!sheetName) {
      return {
        status: 'error',
        error: 'Invalid route: ' + route
      };
    }

    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return {
        status: 'error',
        error: 'Sheet not found: ' + sheetName
      };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indices
    const dateIdx = headers.indexOf('Date');
    const codeIdx = headers.indexOf('Code');
    const openingIdx = headers.indexOf('Opening Stock');
    const purchasesIdx = headers.indexOf('Purchases');
    const closingIdx = headers.indexOf('Closing Stock');

    if (dateIdx === -1 || codeIdx === -1) {
      return {
        status: 'error',
        error: 'Required columns not found in inventory sheet'
      };
    }

    // Parse dates for comparison
    const prevDateObj = new Date(previousDate);
    const currDateObj = new Date(currentDate);

    const inventory = {};

    // Collect inventory data
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = new Date(row[dateIdx]);
      const code = String(row[codeIdx] || '').trim();

      if (!code) continue;

      const dateStr = rowDate.toISOString().split('T')[0];
      const prevStr = prevDateObj.toISOString().split('T')[0];
      const currStr = currDateObj.toISOString().split('T')[0];

      if (!inventory[code]) {
        inventory[code] = {
          code: code,
          previousClosing: 0,
          currentOpening: 0,
          currentPurchases: 0,
          currentClosing: 0
        };
      }

      if (dateStr === prevStr) {
        inventory[code].previousClosing = Number(row[closingIdx] || 0);
      }

      if (dateStr === currStr) {
        inventory[code].currentOpening = Number(row[openingIdx] || 0);
        inventory[code].currentPurchases = Number(row[purchasesIdx] || 0);
        inventory[code].currentClosing = Number(row[closingIdx] || 0);
      }
    }

    // Calculate sales: Opening + Purchases - Closing
    const salesData = [];

    for (const code in inventory) {
      const item = inventory[code];
      const opening = item.currentOpening || item.previousClosing;
      const purchases = item.currentPurchases;
      const closing = item.currentClosing;

      const salesQty = opening + purchases - closing;

      if (salesQty > 0) {
        salesData.push({
          code: code,
          salesQty: salesQty,
          opening: opening,
          purchases: purchases,
          closing: closing
        });
      }
    }

    return {
      status: 'success',
      data: salesData
    };

  } catch (error) {
    Logger.log('Error calculating sales: ' + error.toString());
    return {
      status: 'error',
      error: error.toString()
    };
  }
}

// ============================================================================
// SAVE CASH RECONCILIATION - Write to Cash Destination Sheet
// ============================================================================

function saveCashReconciliation(payload) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_IDS.CASH_DESTINATION);

    // Save main reconciliation record
    saveReconciliationRecord(ss, payload);

    // Save individual transactions
    saveTransactions(ss, payload);

    // Save cash denomination breakdown
    saveCashDenominations(ss, payload);

    return {
      status: 'success',
      message: 'Cash reconciliation saved successfully'
    };

  } catch (error) {
    Logger.log('Error saving cash reconciliation: ' + error.toString());
    return {
      status: 'error',
      error: error.toString()
    };
  }
}

function saveReconciliationRecord(ss, payload) {
  let sheet = ss.getSheetByName(SHEET_NAMES.CASH_RECON);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.CASH_RECON);
    sheet.appendRow([
      'Timestamp',
      'Date',
      'Route',
      'Total Sales',
      'Discount Base',
      'Discount with VAT',
      'Credit Sales',
      'Credit Repayment',
      'Bank POS',
      'Bank Transfer',
      'Cheque',
      'Expected Cash',
      'Cash Notes',
      'Coins',
      'Actual Cash',
      'Difference',
      'Items Sold Count'
    ]);
  }

  const row = [
    payload.timestamp || new Date().toISOString(),
    payload.date,
    payload.route,
    payload.totalSales || 0,
    payload.discountBase || 0,
    payload.discountWithVAT || 0,
    payload.creditSales || 0,
    payload.creditRepayment || 0,
    payload.bankPOS || 0,
    payload.bankTransfer || 0,
    payload.cheque || 0,
    payload.expectedCash || 0,
    (payload.cashNotes && payload.cashNotes.total) || 0,
    payload.coins || 0,
    payload.actualCash || 0,
    payload.difference || 0,
    (payload.salesItems && payload.salesItems.length) || 0
  ];

  sheet.appendRow(row);
}

function saveTransactions(ss, payload) {
  let sheet = ss.getSheetByName(SHEET_NAMES.CASH_TRANSACTIONS);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.CASH_TRANSACTIONS);
    sheet.appendRow([
      'Timestamp',
      'Date',
      'Route',
      'Category',
      'Code',
      'Item Name',
      'Unit',
      'Price',
      'Quantity',
      'Total'
    ]);
  }

  const timestamp = payload.timestamp || new Date().toISOString();
  const salesItems = payload.salesItems || [];

  salesItems.forEach(item => {
    const row = [
      timestamp,
      payload.date,
      payload.route,
      item.category || '',
      item.code || '',
      item.name || '',
      item.unit || '',
      item.price || 0,
      item.quantity || 0,
      item.total || 0
    ];
    sheet.appendRow(row);
  });
}

function saveCashDenominations(ss, payload) {
  let sheet = ss.getSheetByName(SHEET_NAMES.CASH_DENOMINATIONS);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.CASH_DENOMINATIONS);
    sheet.appendRow([
      'Timestamp',
      'Date',
      'Route',
      '500 SAR',
      '100 SAR',
      '50 SAR',
      '20 SAR',
      '10 SAR',
      '5 SAR',
      '2 SAR',
      '1 SAR',
      '0.50 SAR',
      '0.25 SAR',
      'Total Notes',
      'Total Coins',
      'Total Cash'
    ]);
  }

  const timestamp = payload.timestamp || new Date().toISOString();
  const denoms = (payload.cashNotes && payload.cashNotes.denominations) || {};

  const row = [
    timestamp,
    payload.date,
    payload.route,
    denoms['500'] || 0,
    denoms['100'] || 0,
    denoms['50'] || 0,
    denoms['20'] || 0,
    denoms['10'] || 0,
    denoms['5'] || 0,
    denoms['2'] || 0,
    denoms['1'] || 0,
    denoms['0.50'] || 0,
    denoms['0.25'] || 0,
    (payload.cashNotes && payload.cashNotes.total) || 0,
    payload.coins || 0,
    payload.actualCash || 0
  ];

  sheet.appendRow(row);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function testConnection() {
  Logger.log('Testing connection to sheets...');

  try {
    const inventorySS = SpreadsheetApp.openById(SHEET_IDS.INVENTORY_SOURCE);
    Logger.log('✓ Connected to Inventory Source: ' + inventorySS.getName());

    const cashSS = SpreadsheetApp.openById(SHEET_IDS.CASH_DESTINATION);
    Logger.log('✓ Connected to Cash Destination: ' + cashSS.getName());

    const catalogSS = SpreadsheetApp.openById(SHEET_IDS.CATALOG);
    Logger.log('✓ Connected to Catalog: ' + catalogSS.getName());

    return {
      success: true,
      inventory: inventorySS.getName(),
      cash: cashSS.getName(),
      catalog: catalogSS.getName()
    };
  } catch (error) {
    Logger.log('✗ Connection test failed: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}
