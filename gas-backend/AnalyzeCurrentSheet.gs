/**
 * Sheet Structure Analyzer
 *
 * HOW TO USE:
 * 1. Open your Cash App Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Create a new script file
 * 4. Paste this code
 * 5. Click "Run" → Select "analyzeSheetStructure"
 * 6. Check View → Logs for the output
 * 7. Copy the output and share it with me
 */

function analyzeSheetStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  Logger.log('='.repeat(80));
  Logger.log('GOOGLE SHEET STRUCTURE ANALYSIS');
  Logger.log('Sheet Name: ' + ss.getName());
  Logger.log('Sheet ID: ' + ss.getId());
  Logger.log('Number of Tabs: ' + sheets.length);
  Logger.log('='.repeat(80));
  Logger.log('');

  sheets.forEach((sheet, index) => {
    Logger.log('-'.repeat(80));
    Logger.log('TAB #' + (index + 1) + ': ' + sheet.getName());
    Logger.log('-'.repeat(80));

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    Logger.log('Total Rows with Data: ' + lastRow);
    Logger.log('Total Columns with Data: ' + lastCol);
    Logger.log('');

    if (lastRow > 0 && lastCol > 0) {
      // Get headers (first row)
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      Logger.log('COLUMN HEADERS:');
      headers.forEach((header, colIndex) => {
        Logger.log('  Column ' + String.fromCharCode(65 + colIndex) + ': ' + header);
      });
      Logger.log('');

      // Get sample data (rows 2-6, or less if not enough data)
      const sampleRows = Math.min(5, lastRow - 1);
      if (sampleRows > 0) {
        Logger.log('SAMPLE DATA (First ' + sampleRows + ' rows):');
        const sampleData = sheet.getRange(2, 1, sampleRows, lastCol).getValues();

        sampleData.forEach((row, rowIndex) => {
          Logger.log('  Row ' + (rowIndex + 2) + ':');
          row.forEach((cell, cellIndex) => {
            const cellValue = String(cell).substring(0, 50); // Truncate long values
            const cellType = typeof cell;
            Logger.log('    ' + headers[cellIndex] + ': ' + cellValue + ' (type: ' + cellType + ')');
          });
          Logger.log('');
        });
      }

      // Data type analysis
      Logger.log('DATA TYPE ANALYSIS:');
      if (lastRow > 1) {
        const dataRange = sheet.getRange(2, 1, Math.min(10, lastRow - 1), lastCol).getValues();

        headers.forEach((header, colIndex) => {
          const columnData = dataRange.map(row => row[colIndex]);
          const types = columnData.map(cell => {
            if (cell === null || cell === '') return 'empty';
            if (cell instanceof Date) return 'date';
            if (typeof cell === 'number') return 'number';
            if (typeof cell === 'string') return 'string';
            return 'other';
          });

          const typeCounts = {};
          types.forEach(type => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          });

          Logger.log('  ' + header + ': ' + JSON.stringify(typeCounts));
        });
      }
    } else {
      Logger.log('  (Empty sheet)');
    }

    Logger.log('');
  });

  Logger.log('='.repeat(80));
  Logger.log('ANALYSIS COMPLETE');
  Logger.log('='.repeat(80));
  Logger.log('');
  Logger.log('NEXT STEPS:');
  Logger.log('1. Copy the entire log output above');
  Logger.log('2. Share it with me so I can create the migration plan');
  Logger.log('3. I will create scripts to reorganize your data without losing anything');
}

/**
 * Alternative: Export structure as JSON and save to a new sheet
 */
function exportStructureToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  // Create or get Analysis sheet
  let analysisSheet = ss.getSheetByName('STRUCTURE_ANALYSIS');
  if (analysisSheet) {
    analysisSheet.clear();
  } else {
    analysisSheet = ss.insertSheet('STRUCTURE_ANALYSIS');
  }

  analysisSheet.appendRow(['Tab Name', 'Row Count', 'Column Count', 'Headers', 'Sample Row 2']);

  sheets.forEach(sheet => {
    if (sheet.getName() === 'STRUCTURE_ANALYSIS') return;

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    let headers = '';
    let sampleData = '';

    if (lastRow > 0 && lastCol > 0) {
      const headerRange = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      headers = headerRange.join(' | ');

      if (lastRow > 1) {
        const row2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
        sampleData = row2.join(' | ');
      }
    }

    analysisSheet.appendRow([
      sheet.getName(),
      lastRow,
      lastCol,
      headers,
      sampleData
    ]);
  });

  analysisSheet.autoResizeColumns(1, 5);

  SpreadsheetApp.getUi().alert(
    'Analysis Complete!',
    'Check the "STRUCTURE_ANALYSIS" tab for the structure summary.\n\n' +
    'Please share a screenshot or copy the contents of this tab.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
