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
  INVENTORY_SOURCE: '1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0',

  // Destination sheet (managed by Cash App)
  CASH_DESTINATION: '1hLGPDXqyhfyBGAt1g-Jl3Tmc3g3YASjkH47cm_Rx414',

  // Product catalog sheet (using inventory source for catalog)
  CATALOG: '1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0'
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
  // IMPORTANT: These match your existing sheet tab names
  CASH_RECON: 'CASH_RECONCILIATION',    // Your existing tab (no spaces)
  CASH_TRANSACTIONS: 'Transactions',     // Will be created by migration
  CASH_DENOMINATIONS: 'CASH_DENOMINATIONS',  // Your existing tab (no spaces)

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
    const transferIdx = headers.indexOf('Stock Transfer'); // Add support for stock transfer

    if (dateIdx === -1 || codeIdx === -1) {
      return {
        status: 'error',
        error: 'Required columns not found in inventory sheet'
      };
    }

    const currDateObj = new Date(currentDate);
    const currDateStr = currDateObj.toISOString().split('T')[0];

    // Step 1: Find all unique dates in the sheet that are BEFORE currentDate
    const availableDates = new Set();
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][dateIdx]);
      const dateStr = rowDate.toISOString().split('T')[0];

      if (rowDate < currDateObj) {
        availableDates.add(dateStr);
      }
    }

    // Step 2: Find the LAST available date before currentDate
    let lastAvailableDate = null;
    if (availableDates.size > 0) {
      const sortedDates = Array.from(availableDates).sort().reverse();
      lastAvailableDate = sortedDates[0]; // Most recent date before currentDate
    }

    Logger.log('Current Date: ' + currDateStr);
    Logger.log('Last Available Date (with data): ' + lastAvailableDate);

    // Step 3: Collect inventory data by date
    const inventoryByDate = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = new Date(row[dateIdx]);
      const code = String(row[codeIdx] || '').trim();

      if (!code) continue;

      const dateStr = rowDate.toISOString().split('T')[0];

      if (!inventoryByDate[dateStr]) {
        inventoryByDate[dateStr] = {};
      }

      if (!inventoryByDate[dateStr][code]) {
        inventoryByDate[dateStr][code] = {
          code: code,
          opening: 0,
          purchases: 0,
          transfer: 0,
          closing: 0
        };
      }

      inventoryByDate[dateStr][code] = {
        code: code,
        opening: Number(row[openingIdx] || 0),
        purchases: Number(row[purchasesIdx] || 0),
        transfer: transferIdx !== -1 ? Number(row[transferIdx] || 0) : 0,
        closing: Number(row[closingIdx] || 0)
      };
    }

    // Step 4: Calculate sales for current date
    // Formula: Previous Day Closing + Previous Day Transfer + Current Day Purchases - Current Day Closing
    const salesData = [];
    const currentInventory = inventoryByDate[currDateStr] || {};
    const previousInventory = lastAvailableDate ? inventoryByDate[lastAvailableDate] : {};

    // Get all unique product codes from both dates
    const allCodes = new Set([
      ...Object.keys(currentInventory),
      ...Object.keys(previousInventory)
    ]);

    for (const code of allCodes) {
      const current = currentInventory[code] || { opening: 0, purchases: 0, transfer: 0, closing: 0 };
      const previous = previousInventory[code] || { opening: 0, purchases: 0, transfer: 0, closing: 0 };

      // Sales = Previous Closing + Previous Transfer + Current Purchases - Current Closing
      const prevClosing = previous.closing;
      const prevTransfer = previous.transfer;
      const currPurchases = current.purchases;
      const currClosing = current.closing;

      const salesQty = prevClosing + prevTransfer + currPurchases - currClosing;

      if (salesQty > 0 || salesQty < 0) { // Include negative sales (returns/adjustments)
        salesData.push({
          code: code,
          salesQty: salesQty,
          previousClosing: prevClosing,
          previousTransfer: prevTransfer,
          currentPurchases: currPurchases,
          currentClosing: currClosing,
          lastDataDate: lastAvailableDate || 'N/A'
        });
      }
    }

    return {
      status: 'success',
      data: salesData,
      metadata: {
        currentDate: currDateStr,
        lastAvailableDate: lastAvailableDate,
        daysGap: lastAvailableDate ? Math.floor((currDateObj - new Date(lastAvailableDate)) / (1000 * 60 * 60 * 24)) : null,
        message: lastAvailableDate
          ? `Using data from ${lastAvailableDate} (${Math.floor((currDateObj - new Date(lastAvailableDate)) / (1000 * 60 * 60 * 24))} days ago)`
          : 'No previous data found'
      }
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

  // Calculate status based on difference
  const difference = payload.difference || 0;
  let status = 'BALANCED';
  if (Math.abs(difference) < 0.01) {
    status = 'BALANCED';
  } else if (difference < 0) {
    status = 'SHORTAGE';
  } else {
    status = 'EXCESS';
  }

  // Check if sheet exists and has the correct structure
  if (!sheet) {
    // Sheet doesn't exist - should not happen after migration
    Logger.log('WARNING: CASH_RECONCILIATION sheet not found. Creating new one.');
    sheet = ss.insertSheet(SHEET_NAMES.CASH_RECON);
    sheet.appendRow([
      'Timestamp',
      'Date',
      'Time',
      'Route',
      'Total Sales',
      'Discount (Base)',
      'Discount (+15%)',
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
      'Status'
    ]);
  }

  // Create timestamp and extract time
  const timestampObj = new Date(payload.timestamp || new Date());
  const timeOnly = Utilities.formatDate(timestampObj, 'GMT+3', 'HH:mm:ss');

  const row = [
    timestampObj,                          // Timestamp
    payload.date,                          // Date
    timeOnly,                              // Time
    payload.route,                         // Route
    payload.totalSales || 0,               // Total Sales
    payload.discountBase || 0,             // Discount (Base)
    payload.discountWithVAT || 0,          // Discount (+15%)
    payload.creditSales || 0,              // Credit Sales
    payload.creditRepayment || 0,          // Credit Repayment
    payload.bankPOS || 0,                  // Bank POS
    payload.bankTransfer || 0,             // Bank Transfer
    payload.cheque || 0,                   // Cheque
    payload.expectedCash || 0,             // Expected Cash
    (payload.cashNotes && payload.cashNotes.total) || 0,  // Cash Notes
    payload.coins || 0,                    // Coins
    payload.actualCash || 0,               // Actual Cash
    difference,                            // Difference
    status                                 // Status
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

  // Create sheet if it doesn't exist (should not happen after migration)
  if (!sheet) {
    Logger.log('WARNING: CASH_DENOMINATIONS sheet not found. Creating new one.');
    sheet = ss.insertSheet(SHEET_NAMES.CASH_DENOMINATIONS);
    sheet.appendRow([
      'Timestamp',
      'Date',
      'Route',
      'SAR 500',        // Match existing format
      'SAR 100',
      'SAR 50',
      'SAR 20',
      'SAR 10',
      'SAR 5',
      'Notes Total',    // Match existing format
      'SAR 2',
      'SAR 1',
      'SAR 0.50',
      'SAR 0.25',
      'Coins Total',    // Match existing format
      'Grand Total'     // Match existing format
    ]);
  }

  const timestampObj = new Date(payload.timestamp || new Date());
  const denoms = (payload.cashNotes && payload.cashNotes.denominations) || {};

  const row = [
    timestampObj,                          // Timestamp
    payload.date,                          // Date
    payload.route,                         // Route
    denoms['500'] || 0,                    // SAR 500
    denoms['100'] || 0,                    // SAR 100
    denoms['50'] || 0,                     // SAR 50
    denoms['20'] || 0,                     // SAR 20
    denoms['10'] || 0,                     // SAR 10
    denoms['5'] || 0,                      // SAR 5
    (payload.cashNotes && payload.cashNotes.total) || 0,  // Notes Total
    denoms['2'] || 0,                      // SAR 2
    denoms['1'] || 0,                      // SAR 1
    denoms['0.50'] || 0,                   // SAR 0.50
    denoms['0.25'] || 0,                   // SAR 0.25
    payload.coins || 0,                    // Coins Total
    payload.actualCash || 0                // Grand Total
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
