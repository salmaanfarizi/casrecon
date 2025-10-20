/**
 * Cash App Sheet Migration Script
 *
 * WHAT IT DOES:
 * Your sheet already has the right structure! This script will:
 * 1. Consolidate 27 separate SALES tabs into ONE "Transactions" tab
 * 2. Keep your existing CASH_RECONCILIATION tab (33 rows)
 * 3. Keep your existing CASH_DENOMINATIONS tab (33 rows)
 * 4. Add proper Timestamp column to all tabs
 * 5. Clean up empty Sheet1
 * 6. Archive old SALES tabs (optional)
 *
 * BEFORE RUNNING:
 * 1. Make a copy of your sheet (File → Make a copy) as backup
 * 2. Open the ORIGINAL sheet you want to migrate
 * 3. Go to Extensions → Apps Script
 * 4. Paste this code
 * 5. Run step by step (see instructions below)
 *
 * STEP-BY-STEP INSTRUCTIONS:
 * 1. Run: createBackup() - Creates a backup copy
 * 2. Run: step1_CreateTransactionsTab() - Creates new Transactions tab
 * 3. Run: step2_MigrateAllSalesData() - Consolidates all SALES tabs
 * 4. Run: step3_FixCashReconciliation() - Adds Timestamp column
 * 5. Run: step4_FixCashDenominations() - Adds Timestamp and Time columns
 * 6. Run: step5_CleanupOldTabs() - Removes empty Sheet1 and archives old SALES tabs
 * 7. Run: verifyMigration() - Checks everything is correct
 */

// ============================================================================
// BACKUP - ALWAYS RUN THIS FIRST!
// ============================================================================

function createBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timestamp = Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd_HH-mm-ss');
  const backupName = ss.getName() + ' - BACKUP - ' + timestamp;

  const backup = ss.copy(backupName);

  SpreadsheetApp.getUi().alert(
    '✅ Backup Created!',
    'Backup sheet: "' + backupName + '"\n\n' +
    'You can find it in your Google Drive.\n' +
    'Now you can safely run the migration steps.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  Logger.log('Backup created: ' + backupName);
  Logger.log('Backup ID: ' + backup.getId());
  Logger.log('URL: ' + backup.getUrl());
}

// ============================================================================
// STEP 1: Create Transactions Tab
// ============================================================================

function step1_CreateTransactionsTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Check if Transactions tab already exists
  let transactionsSheet = ss.getSheetByName('Transactions');
  if (transactionsSheet) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Transactions tab already exists',
      'Do you want to delete it and create a new one?',
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      ss.deleteSheet(transactionsSheet);
      transactionsSheet = null;
    } else {
      ui.alert('Migration cancelled. Please rename or delete the existing Transactions tab first.');
      return;
    }
  }

  // Create new Transactions sheet
  transactionsSheet = ss.insertSheet('Transactions');

  // Set headers matching the new backend structure
  const headers = [
    'Timestamp',          // Combined Date + Time
    'Date',               // Date only (for filtering)
    'Route',              // Route name
    'Category',           // Product category
    'Code',               // SKU code
    'Item Name',          // Product name
    'Unit',               // Unit of measure
    'Price',              // Unit price (renamed from Unit Price)
    'Quantity',           // Quantity sold
    'Total'               // Total value (renamed from Total Value)
  ];

  transactionsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format header row
  const headerRange = transactionsSheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4CAF50');
  headerRange.setFontColor('#FFFFFF');

  // Freeze header row
  transactionsSheet.setFrozenRows(1);

  // Auto-resize columns
  transactionsSheet.autoResizeColumns(1, headers.length);

  Logger.log('✅ Step 1 Complete: Transactions tab created');
  SpreadsheetApp.getUi().alert(
    '✅ Step 1 Complete',
    'Transactions tab has been created with proper headers.\n\n' +
    'Next: Run step2_MigrateAllSalesData()',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================================
// STEP 2: Migrate All SALES Data
// ============================================================================

function step2_MigrateAllSalesData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transactionsSheet = ss.getSheetByName('Transactions');

  if (!transactionsSheet) {
    SpreadsheetApp.getUi().alert('Error: Run step1_CreateTransactionsTab() first!');
    return;
  }

  const sheets = ss.getSheets();
  let totalRowsMigrated = 0;
  const salesSheets = [];

  // Find all SALES_* sheets
  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (name.startsWith('SALES_')) {
      salesSheets.push(sheet);
    }
  });

  Logger.log('Found ' + salesSheets.length + ' SALES sheets to migrate');

  // Process each SALES sheet
  salesSheets.forEach((sheet, index) => {
    const sheetName = sheet.getName();
    Logger.log('Processing: ' + sheetName + ' (' + (index + 1) + '/' + salesSheets.length + ')');

    // Extract route and date from sheet name
    // Format: SALES_Al-Hasa 1_2025-10-19
    const parts = sheetName.replace('SALES_', '').split('_');
    const date = parts[parts.length - 1]; // Last part is date
    const route = parts.slice(0, -1).join('_').replace(/_/g, ' '); // Everything else is route

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('  Skipping (no data): ' + sheetName);
      return; // Skip empty sheets
    }

    // Get all data (skip header row)
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 9);
    const data = dataRange.getValues();

    // Transform data to new format
    const transformedData = data.map(row => {
      const [dateCol, timeCol, category, code, itemName, unit, unitPrice, quantity, totalValue] = row;

      // Create timestamp by combining date and time
      let timestamp;
      try {
        const dateObj = new Date(dateCol);
        const timeObj = new Date(timeCol);
        timestamp = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate(),
          timeObj.getHours(),
          timeObj.getMinutes(),
          timeObj.getSeconds()
        );
      } catch (e) {
        timestamp = new Date(dateCol);
      }

      return [
        timestamp,      // Timestamp (combined)
        date,           // Date (from sheet name for consistency)
        route,          // Route (from sheet name)
        category,       // Category
        code,           // Code
        itemName,       // Item Name
        unit,           // Unit
        unitPrice,      // Price
        quantity,       // Quantity
        totalValue      // Total
      ];
    });

    // Append to Transactions sheet
    if (transformedData.length > 0) {
      const nextRow = transactionsSheet.getLastRow() + 1;
      transactionsSheet.getRange(nextRow, 1, transformedData.length, 10).setValues(transformedData);
      totalRowsMigrated += transformedData.length;
      Logger.log('  Migrated ' + transformedData.length + ' rows from ' + sheetName);
    }
  });

  // Sort by timestamp (most recent first)
  const lastRow = transactionsSheet.getLastRow();
  if (lastRow > 1) {
    const sortRange = transactionsSheet.getRange(2, 1, lastRow - 1, 10);
    sortRange.sort({column: 1, ascending: false});
  }

  // Auto-resize columns
  transactionsSheet.autoResizeColumns(1, 10);

  Logger.log('✅ Step 2 Complete: Migrated ' + totalRowsMigrated + ' total rows from ' + salesSheets.length + ' SALES sheets');
  SpreadsheetApp.getUi().alert(
    '✅ Step 2 Complete',
    'Successfully migrated ' + totalRowsMigrated + ' transactions from ' + salesSheets.length + ' SALES sheets.\n\n' +
    'Next: Run step3_FixCashReconciliation()',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================================
// STEP 3: Fix Cash Reconciliation Tab
// ============================================================================

function step3_FixCashReconciliation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CASH_RECONCILIATION');

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error: CASH_RECONCILIATION tab not found!');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if Timestamp column already exists
  if (headers[0] === 'Timestamp') {
    Logger.log('Timestamp column already exists, skipping...');
    SpreadsheetApp.getUi().alert(
      '✅ Step 3 Complete',
      'CASH_RECONCILIATION already has Timestamp column.\n\n' +
      'Next: Run step4_FixCashDenominations()',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  // Timestamp column doesn't exist, create it by combining Date + Time
  const dateIndex = headers.indexOf('Date');
  const timeIndex = headers.indexOf('Time');

  if (dateIndex === -1 || timeIndex === -1) {
    SpreadsheetApp.getUi().alert('Error: Date or Time column not found!');
    return;
  }

  // Insert Timestamp column at the beginning
  sheet.insertColumnBefore(1);
  sheet.getRange(1, 1).setValue('Timestamp');

  // Format header
  sheet.getRange(1, 1).setFontWeight('bold').setBackground('#4CAF50').setFontColor('#FFFFFF');

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    // Combine Date + Time into Timestamp
    for (let i = 2; i <= lastRow; i++) {
      const dateVal = sheet.getRange(i, dateIndex + 2).getValue(); // +2 because we inserted a column
      const timeVal = sheet.getRange(i, timeIndex + 2).getValue();

      let timestamp;
      try {
        const dateObj = new Date(dateVal);
        const timeObj = new Date(timeVal);
        timestamp = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate(),
          timeObj.getHours(),
          timeObj.getMinutes(),
          timeObj.getSeconds()
        );
      } catch (e) {
        timestamp = new Date(dateVal);
      }

      sheet.getRange(i, 1).setValue(timestamp);
    }
  }

  sheet.autoResizeColumns(1, sheet.getLastColumn());

  Logger.log('✅ Step 3 Complete: Added Timestamp column to CASH_RECONCILIATION');
  SpreadsheetApp.getUi().alert(
    '✅ Step 3 Complete',
    'Added Timestamp column to CASH_RECONCILIATION tab.\n\n' +
    'Next: Run step4_FixCashDenominations()',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================================
// STEP 4: Fix Cash Denominations Tab
// ============================================================================

function step4_FixCashDenominations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CASH_DENOMINATIONS');

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error: CASH_DENOMINATIONS tab not found!');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if Timestamp column already exists
  if (headers[0] === 'Timestamp') {
    Logger.log('Timestamp column already exists, skipping...');
    SpreadsheetApp.getUi().alert(
      '✅ Step 4 Complete',
      'CASH_DENOMINATIONS already has Timestamp column.\n\n' +
      'Next: Run step5_CleanupOldTabs()',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  // Get Cash Reconciliation to match timestamps
  const cashReconSheet = ss.getSheetByName('CASH_RECONCILIATION');
  if (!cashReconSheet) {
    SpreadsheetApp.getUi().alert('Error: Need CASH_RECONCILIATION to match timestamps!');
    return;
  }

  // Insert Timestamp column at the beginning
  sheet.insertColumnBefore(1);
  sheet.getRange(1, 1).setValue('Timestamp');
  sheet.getRange(1, 1).setFontWeight('bold').setBackground('#4CAF50').setFontColor('#FFFFFF');

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    // Match timestamps from CASH_RECONCILIATION by Date and Route
    const cashReconData = cashReconSheet.getDataRange().getValues();
    const cashReconHeaders = cashReconData[0];

    const timestampIdx = cashReconHeaders.indexOf('Timestamp');
    const dateIdx = cashReconHeaders.indexOf('Date');
    const routeIdx = cashReconHeaders.indexOf('Route');

    for (let i = 2; i <= lastRow; i++) {
      const denomDate = sheet.getRange(i, 2).getValue(); // Date column (now at position 2)
      const denomRoute = sheet.getRange(i, 3).getValue(); // Route column (now at position 3)

      // Find matching row in CASH_RECONCILIATION
      for (let j = 1; j < cashReconData.length; j++) {
        const reconRow = cashReconData[j];
        const reconDate = new Date(reconRow[dateIdx]).toDateString();
        const thisDenomDate = new Date(denomDate).toDateString();

        if (reconDate === thisDenomDate && reconRow[routeIdx] === denomRoute) {
          sheet.getRange(i, 1).setValue(reconRow[timestampIdx]);
          break;
        }
      }
    }
  }

  sheet.autoResizeColumns(1, sheet.getLastColumn());

  Logger.log('✅ Step 4 Complete: Added Timestamp column to CASH_DENOMINATIONS');
  SpreadsheetApp.getUi().alert(
    '✅ Step 4 Complete',
    'Added Timestamp column to CASH_DENOMINATIONS tab.\n\n' +
    'Next: Run step5_CleanupOldTabs()',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================================
// STEP 5: Cleanup Old Tabs
// ============================================================================

function step5_CleanupOldTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Cleanup Old Tabs',
    'This will:\n' +
    '1. Delete empty "Sheet1"\n' +
    '2. Hide all old SALES_* tabs (they will be hidden, not deleted)\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Cleanup cancelled.');
    return;
  }

  let deletedCount = 0;
  let hiddenCount = 0;

  sheets.forEach(sheet => {
    const name = sheet.getName();

    // Delete empty Sheet1
    if (name === 'Sheet1' && sheet.getLastRow() === 0) {
      ss.deleteSheet(sheet);
      deletedCount++;
      Logger.log('Deleted: ' + name);
    }
    // Hide old SALES tabs
    else if (name.startsWith('SALES_')) {
      sheet.hideSheet();
      hiddenCount++;
      Logger.log('Hidden: ' + name);
    }
  });

  Logger.log('✅ Step 5 Complete: Deleted ' + deletedCount + ' empty sheets, hidden ' + hiddenCount + ' old SALES sheets');
  ui.alert(
    '✅ Step 5 Complete',
    'Cleanup complete:\n' +
    '- Deleted ' + deletedCount + ' empty sheet(s)\n' +
    '- Hidden ' + hiddenCount + ' old SALES sheet(s)\n\n' +
    'Old SALES sheets are hidden (not deleted) for safety.\n' +
    'You can unhide them later if needed.\n\n' +
    'Next: Run verifyMigration() to check everything',
    ui.ButtonSet.OK
  );
}

// ============================================================================
// VERIFICATION
// ============================================================================

function verifyMigration() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let report = '='.repeat(60) + '\n';
  report += 'MIGRATION VERIFICATION REPORT\n';
  report += '='.repeat(60) + '\n\n';

  // Check Transactions tab
  const transactionsSheet = ss.getSheetByName('Transactions');
  if (transactionsSheet) {
    const transCount = transactionsSheet.getLastRow() - 1; // Minus header
    report += '✅ Transactions tab exists\n';
    report += '   - Rows: ' + transCount + '\n';
    report += '   - Columns: ' + transactionsSheet.getLastColumn() + '\n';
  } else {
    report += '❌ Transactions tab NOT FOUND\n';
  }

  // Check CASH_RECONCILIATION tab
  const cashReconSheet = ss.getSheetByName('CASH_RECONCILIATION');
  if (cashReconSheet) {
    const cashReconCount = cashReconSheet.getLastRow() - 1;
    report += '✅ CASH_RECONCILIATION tab exists\n';
    report += '   - Rows: ' + cashReconCount + '\n';
    report += '   - Columns: ' + cashReconSheet.getLastColumn() + '\n';

    const headers = cashReconSheet.getRange(1, 1, 1, cashReconSheet.getLastColumn()).getValues()[0];
    if (headers[0] === 'Timestamp') {
      report += '   - ✅ Timestamp column present\n';
    } else {
      report += '   - ❌ Timestamp column missing\n';
    }
  } else {
    report += '❌ CASH_RECONCILIATION tab NOT FOUND\n';
  }

  // Check CASH_DENOMINATIONS tab
  const cashDenomSheet = ss.getSheetByName('CASH_DENOMINATIONS');
  if (cashDenomSheet) {
    const cashDenomCount = cashDenomSheet.getLastRow() - 1;
    report += '✅ CASH_DENOMINATIONS tab exists\n';
    report += '   - Rows: ' + cashDenomCount + '\n';
    report += '   - Columns: ' + cashDenomSheet.getLastColumn() + '\n';

    const headers = cashDenomSheet.getRange(1, 1, 1, cashDenomSheet.getLastColumn()).getValues()[0];
    if (headers[0] === 'Timestamp') {
      report += '   - ✅ Timestamp column present\n';
    } else {
      report += '   - ❌ Timestamp column missing\n';
    }
  } else {
    report += '❌ CASH_DENOMINATIONS tab NOT FOUND\n';
  }

  report += '\n';

  // Count old SALES sheets
  const sheets = ss.getSheets();
  const salesSheets = sheets.filter(s => s.getName().startsWith('SALES_'));
  const hiddenSales = salesSheets.filter(s => s.isSheetHidden());

  report += 'Old SALES sheets: ' + salesSheets.length + ' total\n';
  report += '   - Hidden: ' + hiddenSales.length + '\n';
  report += '   - Visible: ' + (salesSheets.length - hiddenSales.length) + '\n';

  report += '\n' + '='.repeat(60) + '\n';
  report += 'MIGRATION STATUS: ';

  if (transactionsSheet && cashReconSheet && cashDenomSheet) {
    report += '✅ COMPLETE\n';
  } else {
    report += '⚠️ INCOMPLETE - Check errors above\n';
  }

  report += '='.repeat(60) + '\n';

  Logger.log(report);

  SpreadsheetApp.getUi().alert(
    'Migration Verification',
    report,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================================
// OPTIONAL: Delete Old SALES Tabs (USE WITH CAUTION!)
// ============================================================================

function DANGER_deleteOldSalesTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    '⚠️ WARNING - PERMANENT DELETE',
    'This will PERMANENTLY DELETE all old SALES_* tabs.\n\n' +
    'Make sure you have:\n' +
    '1. Created a backup\n' +
    '2. Verified the migration is correct\n' +
    '3. Checked the Transactions tab has all your data\n\n' +
    'This action CANNOT be undone!\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Delete cancelled. Old SALES tabs remain hidden.');
    return;
  }

  const sheets = ss.getSheets();
  let deletedCount = 0;

  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (name.startsWith('SALES_')) {
      ss.deleteSheet(sheet);
      deletedCount++;
      Logger.log('DELETED: ' + name);
    }
  });

  ui.alert(
    '✅ Deletion Complete',
    'Permanently deleted ' + deletedCount + ' old SALES tabs.\n\n' +
    'Your data is now consolidated in the Transactions tab.',
    ui.ButtonSet.OK
  );
}
