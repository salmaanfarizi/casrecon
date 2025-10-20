/**
 * CREATE PRODUCT CATALOG - Auto-Generate from Inventory Data
 *
 * This script scans your inventory sheets and creates a Product Catalog tab
 * with all unique products found in your routes.
 *
 * HOW TO USE:
 * 1. Copy this file to your Google Apps Script project (same as Code.gs)
 * 2. Go to the script editor
 * 3. Select function: createProductCatalog
 * 4. Click Run ▶️
 * 5. Grant permissions when prompted
 * 6. Check your inventory sheet - "Product Catalog" tab will be created!
 *
 * The catalog will be FULLY EDITABLE - you can:
 * - Update prices anytime
 * - Add new products manually
 * - Change categories, names, units
 */

// ============================================================================
// MAIN FUNCTION - Run this to create the Product Catalog
// ============================================================================

function createProductCatalog() {
  try {
    // Open your inventory source sheet
    const inventorySheetId = '1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0';
    const ss = SpreadsheetApp.openById(inventorySheetId);

    Logger.log('📖 Opening inventory sheet: ' + ss.getName());

    // Check if Product Catalog already exists
    let catalogSheet = ss.getSheetByName('Product Catalog');
    if (catalogSheet) {
      const response = Browser.msgBox(
        'Product Catalog already exists!',
        'Do you want to REPLACE it with fresh data from inventory sheets?\\n\\n' +
        'Click YES to replace (you will lose any manual edits)\\n' +
        'Click NO to keep existing catalog',
        Browser.Buttons.YES_NO
      );

      if (response === 'no') {
        Logger.log('❌ User chose to keep existing catalog');
        Browser.msgBox('Kept existing Product Catalog. No changes made.');
        return;
      }

      // Delete existing catalog
      ss.deleteSheet(catalogSheet);
      Logger.log('🗑️ Deleted old Product Catalog');
    }

    // Scan all route tabs and collect unique products
    const products = scanInventorySheetsForProducts(ss);

    if (Object.keys(products).length === 0) {
      Browser.msgBox('❌ No products found in inventory sheets!');
      return;
    }

    // Create new Product Catalog sheet
    catalogSheet = ss.insertSheet('Product Catalog');

    // Format the sheet
    setupCatalogSheet(catalogSheet, products);

    Logger.log('✅ Product Catalog created successfully!');

    Browser.msgBox(
      '✅ Success!',
      'Product Catalog created with ' + Object.keys(products).length + ' products!\\n\\n' +
      'You can now:\\n' +
      '• Edit prices directly in the sheet\\n' +
      '• Add new rows for new products\\n' +
      '• Update categories, names, units\\n\\n' +
      'The catalog will be used by your Cash Reconciliation app.',
      Browser.Buttons.OK
    );

  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    Browser.msgBox('Error', 'Failed to create catalog: ' + error.toString(), Browser.Buttons.OK);
  }
}

// ============================================================================
// SCAN INVENTORY SHEETS FOR PRODUCTS
// ============================================================================

function scanInventorySheetsForProducts(ss) {
  const routeNames = [
    'Al-Hasa 1',
    'Al-Hasa 2',
    'Al-Hasa 3',
    'Al-Hasa 4',
    'Al-Hasa Wholesale'
  ];

  const products = {}; // Store unique products by code

  routeNames.forEach(routeName => {
    const sheet = ss.getSheetByName(routeName);
    if (!sheet) {
      Logger.log('⚠️ Sheet not found: ' + routeName);
      return;
    }

    Logger.log('📊 Scanning: ' + routeName);

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('⚠️ No data in: ' + routeName);
      return;
    }

    const headers = data[0];
    const codeIdx = headers.indexOf('Code');
    const nameIdx = headers.indexOf('Item Name') !== -1 ? headers.indexOf('Item Name') : headers.indexOf('Product');

    if (codeIdx === -1) {
      Logger.log('⚠️ No "Code" column in: ' + routeName);
      return;
    }

    // Scan all rows for unique product codes
    for (let i = 1; i < data.length; i++) {
      const code = String(data[i][codeIdx] || '').trim();
      const name = nameIdx !== -1 ? String(data[i][nameIdx] || '').trim() : '';

      if (!code || code === '') continue;

      // Only add if we haven't seen this code before
      if (!products[code]) {
        products[code] = {
          code: code,
          name: name || code, // Use code as name if no name found
          category: guessCategory(code, name),
          unit: guessUnit(name),
          price: guessPrice(code, name) // Default price - user can edit
        };
      }
    }
  });

  Logger.log('✅ Found ' + Object.keys(products).length + ' unique products');
  return products;
}

// ============================================================================
// SETUP CATALOG SHEET WITH FORMATTING
// ============================================================================

function setupCatalogSheet(sheet, products) {
  // Set up headers
  const headers = ['Category', 'Code', 'Name', 'Unit', 'Price'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#667eea');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // Add products data
  const productList = Object.values(products);
  const rows = productList.map(p => [
    p.category,
    p.code,
    p.name,
    p.unit,
    p.price
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }

  // Format columns
  sheet.setColumnWidth(1, 150); // Category
  sheet.setColumnWidth(2, 100); // Code
  sheet.setColumnWidth(3, 200); // Name
  sheet.setColumnWidth(4, 80);  // Unit
  sheet.setColumnWidth(5, 100); // Price

  // Format price column as currency
  const priceRange = sheet.getRange(2, 5, rows.length, 1);
  priceRange.setNumberFormat('0.00');

  // Freeze header row
  sheet.setFrozenRows(1);

  // Add data validation for category (optional - helps consistency)
  const categoryRange = sheet.getRange(2, 1, rows.length, 1);

  // Add alternating row colors
  for (let i = 2; i <= rows.length + 1; i++) {
    if (i % 2 === 0) {
      sheet.getRange(i, 1, 1, 5).setBackground('#f9fafb');
    }
  }

  // Add instructions at the top (as note on A1)
  sheet.getRange('A1').setNote(
    'PRODUCT CATALOG - How to Use:\n\n' +
    '1. EDIT PRICES: Click any price and type new value\n' +
    '2. ADD PRODUCTS: Insert new row and fill in all columns\n' +
    '3. CATEGORIES: Group products (e.g., "Sunflower Seeds")\n' +
    '4. CODE: Must match inventory sheet codes exactly!\n' +
    '5. SAVE: Auto-saves as you edit\n\n' +
    'This catalog is used by the Cash Reconciliation app.'
  );

  Logger.log('✅ Formatted catalog sheet with ' + rows.length + ' products');
}

// ============================================================================
// SMART GUESSING FUNCTIONS - Categorize products intelligently
// ============================================================================

function guessCategory(code, name) {
  const lowerName = (name || '').toLowerCase();
  const lowerCode = (code || '').toLowerCase();

  // Check by code patterns
  if (code.startsWith('44')) return 'Sunflower Seeds';
  if (code.startsWith('11') && (code.includes('26') || code.includes('29'))) return 'Sunflower Seeds';
  if (code.startsWith('80')) return 'Pumpkin Seeds';
  if (code.startsWith('11') && code.includes('42')) return 'Pumpkin Seeds';
  if (code.startsWith('90')) return 'Melon Seeds';
  if (code.startsWith('17')) return 'Popcorn';

  // Check by name
  if (lowerName.includes('sunflower')) return 'Sunflower Seeds';
  if (lowerName.includes('pumpkin')) return 'Pumpkin Seeds';
  if (lowerName.includes('melon') || lowerName.includes('watermelon')) return 'Melon Seeds';
  if (lowerName.includes('popcorn') || lowerName.includes('corn')) return 'Popcorn';

  // Default
  return 'Other Products';
}

function guessUnit(name) {
  const lowerName = (name || '').toLowerCase();

  if (lowerName.includes('kg') || lowerName.includes('kilo')) return 'sack';
  if (lowerName.includes('g') && !lowerName.includes('kg')) {
    // Extract weight to determine unit
    if (lowerName.includes('box')) return 'box';
    return 'bag';
  }
  if (lowerName.includes('box')) return 'box';
  if (lowerName.includes('bag')) return 'bag';
  if (lowerName.includes('pack')) return 'pack';

  return 'unit'; // Default
}

function guessPrice(code, name) {
  // Use smart defaults based on patterns
  // Users can edit these after catalog is created

  const lowerName = (name || '').toLowerCase();

  // Large sizes (KG)
  if (lowerName.includes('10kg') || lowerName.includes('10 kg')) {
    if (code.startsWith('11') && code.includes('26')) return 160; // Sunflower 10KG
    if (code.startsWith('11') && code.includes('42')) return 230; // Pumpkin 10KG
    return 150; // Default for 10KG
  }

  // Medium sizes (100-200g)
  if (lowerName.includes('200g') || lowerName.includes('200 g')) return 58;
  if (lowerName.includes('100g') || lowerName.includes('100 g')) return 34;
  if (lowerName.includes('130g') || lowerName.includes('130 g')) return 54;
  if (lowerName.includes('110g') || lowerName.includes('110 g')) return 54;

  // Small sizes (15-50g)
  if (lowerName.includes('25g') || lowerName.includes('25 g')) return 16;
  if (lowerName.includes('15g') || lowerName.includes('15 g')) return 16;

  // Popcorn
  if (code.startsWith('17')) return 5;

  // Other large bags
  if (lowerName.includes('800g') || lowerName.includes('800 g')) return 17;

  // Default prices by code range
  if (code.startsWith('44')) return 40; // Sunflower default
  if (code.startsWith('80')) return 30; // Pumpkin default
  if (code.startsWith('90')) return 30; // Melon default

  return 20; // Conservative default - user should update
}

// ============================================================================
// HELPER: ADD SINGLE PRODUCT MANUALLY (Optional utility)
// ============================================================================

function addProductToCatalog(code, name, category, unit, price) {
  const ss = SpreadsheetApp.openById('1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0');
  const sheet = ss.getSheetByName('Product Catalog');

  if (!sheet) {
    throw new Error('Product Catalog does not exist. Run createProductCatalog() first!');
  }

  // Find last row
  const lastRow = sheet.getLastRow();

  // Add new product
  sheet.getRange(lastRow + 1, 1, 1, 5).setValues([[
    category,
    code,
    name,
    unit,
    price
  ]]);

  Logger.log('✅ Added product: ' + code + ' - ' + name);
}

// ============================================================================
// MENU: Add custom menu to Google Sheets
// ============================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🧾 Cash Recon Tools')
    .addItem('📦 Create Product Catalog', 'createProductCatalog')
    .addSeparator()
    .addItem('ℹ️ About', 'showAbout')
    .addToUi();
}

function showAbout() {
  Browser.msgBox(
    'Cash Reconciliation Tools',
    'This script helps manage your Cash Reconciliation system.\\n\\n' +
    'Available Tools:\\n' +
    '• Create Product Catalog - Auto-generate catalog from inventory data\\n\\n' +
    'Created by Claude Code',
    Browser.Buttons.OK
  );
}
