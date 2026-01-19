/**
 * ĐÂY LÀ APP SCRIPT CODE CỦA SHEET BANHANG_DB, NƠI CHỨA CÁC TRƯỜNG THÔNG TIN CỦA APP
 * Google Apps Script - Database API cho Sales Management App
 * Sheet ID: 1XKzQTtPIXk5wMLptUU0boZJld2Y0jtaaziBk9p4xyPk
 *
 * Sheet tabs:
 * 1. Customers - Cột: customer_id, full_name, phone_number, address, notes, created_at
 * 2. Products - Cột: product_id, product_name, price, image_url, is_active
 * 3. Orders - Cột: order_id, order_code, customer_id, shipping_address, total_amount,
 *              payment_override, payment_proof_url, shipping_status, shipping_fee,
 *              note, vtp_order_code, created_at, items (JSON string)
 * 4. Transactions - Cột: transaction_id, amount, content, transaction_time, source,
 *              order_code, account_number, bank, created_at, reference_code,
 *              transaction_code, type, matched_at, note
 */

const SHEET_ID = '1XKzQTtPIXk5wMLptUU0boZJld2Y0jtaaziBk9p4xyPk';
const SEPAY_SHEET_ID = '1E5U3DEP2nDrM3MAIf2JdkuopXGENj0wrdr3AHiTlPb8';
const SEPAY_SHEET_NAME = 'Base';

function doGet(e) {
  const action = e.parameter.action || 'ping';

  try {
    // Parse data from URL params if present
    let data = {};
    if (e.parameter.data) {
      try {
        data = JSON.parse(e.parameter.data);
      } catch (parseErr) {
        // Ignore parse errors
      }
    }

    switch (action) {
      case 'ping':
        return jsonResponse({ ok: true, message: 'pong' });

      case 'get_all':
        return getAllData();

      case 'get_customers':
        return getSheetData('Customers');

      case 'get_products':
        return getSheetData('Products');

      case 'get_orders':
        return getSheetData('Orders');

      case 'get_transactions':
        return getSheetData('Transactions');

      // Write actions (via URL params)
      case 'save_customer':
      case 'upsert_customer':
        return saveToSheet('Customers', data.data || data.customer, 'customer_id');

      case 'delete_customer':
        return deleteFromSheet('Customers', data.customer_id, 'customer_id');

      case 'save_product':
      case 'upsert_product':
        return saveToSheet('Products', data.data || data.product, 'product_id');

      case 'delete_product':
        return deleteFromSheet('Products', data.product_id, 'product_id');

      case 'save_order':
      case 'upsert_order':
        const orderData = data.data || data.order || {};
        if (Array.isArray(orderData.items)) {
          orderData.items = JSON.stringify(orderData.items);
        }
        return saveToSheet('Orders', orderData, 'order_id');

      case 'delete_order':
        return deleteFromSheet('Orders', data.order_id, 'order_id');

      case 'save_transaction':
        return saveToSheet('Transactions', data.transaction, 'transaction_id');

      case 'delete_transaction':
        return deleteFromSheet('Transactions', data.transaction_id, 'transaction_id');

      default:
        return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'save_customer':
        return saveToSheet('Customers', data.customer, 'customer_id');
      
      case 'delete_customer':
        return deleteFromSheet('Customers', data.customer_id, 'customer_id');
      
      case 'save_product':
        return saveToSheet('Products', data.product, 'product_id');
      
      case 'delete_product':
        return deleteFromSheet('Products', data.product_id, 'product_id');
      
      case 'save_order':
        // Convert items array to JSON string for storage
        const orderData = { ...data.order };
        if (Array.isArray(orderData.items)) {
          orderData.items = JSON.stringify(orderData.items);
        }
        return saveToSheet('Orders', orderData, 'order_id');
      
      case 'delete_order':
        return deleteFromSheet('Orders', data.order_id, 'order_id');

      case 'save_transaction':
        return saveToSheet('Transactions', data.transaction, 'transaction_id');

      case 'delete_transaction':
        return deleteFromSheet('Transactions', data.transaction_id, 'transaction_id');

      case 'save_all':
        return saveAllData(data);

      case 'sync_sepay':
        return syncSepayTransactions();

      default:
        return jsonResponse({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function getAllData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const customers = sheetToArray(ss.getSheetByName('Customers'));
  const products = sheetToArray(ss.getSheetByName('Products'));
  const orders = sheetToArray(ss.getSheetByName('Orders')).map(order => {
    // Parse items from JSON string
    if (order.items && typeof order.items === 'string') {
      try {
        order.items = JSON.parse(order.items);
      } catch (e) {
        order.items = [];
      }
    }
    return order;
  });
  const transactions = sheetToArray(ss.getSheetByName('Transactions'));
  
  return jsonResponse({
    ok: true,
    data: { customers, products, orders, transactions }
  });
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return jsonResponse({ ok: false, error: `Sheet "${sheetName}" not found` });
  }
  
  const data = sheetToArray(sheet);
  return jsonResponse({ ok: true, data });
}

function sheetToArray(sheet) {
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // No data rows
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      let value = row[i];
      // Convert Date objects to ISO string
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      // Handle boolean
      if (header === 'is_active') {
        value = value === true || value === 'true' || value === 'TRUE';
      }
      // Handle numbers
      if (['price', 'total_amount', 'amount', 'quantity', 'unit_price', 'subtotal'].includes(header)) {
        value = Number(value) || 0;
      }
      obj[header] = value;
    });
    return obj;
  }).filter(obj => obj[headers[0]]); // Filter out empty rows
}

function saveToSheet(sheetName, data, idField) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return jsonResponse({ ok: false, error: `Sheet "${sheetName}" not found` });
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dataRange = sheet.getDataRange().getValues();
  
  // Find existing row
  const idIndex = headers.indexOf(idField);
  let rowIndex = -1;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIndex] === data[idField]) {
      rowIndex = i + 1; // Sheet rows are 1-indexed
      break;
    }
  }
  
  // Prepare row data
  const rowData = headers.map(header => data[header] !== undefined ? data[header] : '');
  
  if (rowIndex > 0) {
    // Update existing row
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
  } else {
    // Append new row
    sheet.appendRow(rowData);
  }
  
  return jsonResponse({ ok: true, data });
}

function deleteFromSheet(sheetName, id, idField) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return jsonResponse({ ok: false, error: `Sheet "${sheetName}" not found` });
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dataRange = sheet.getDataRange().getValues();
  const idIndex = headers.indexOf(idField);
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ ok: true, deleted: id });
    }
  }
  
  return jsonResponse({ ok: false, error: 'Record not found' });
}

function saveAllData(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  if (data.customers) {
    replaceSheetData(ss.getSheetByName('Customers'), data.customers);
  }
  if (data.products) {
    replaceSheetData(ss.getSheetByName('Products'), data.products);
  }
  if (data.orders) {
    const orders = data.orders.map(order => ({
      ...order,
      items: JSON.stringify(order.items || [])
    }));
    replaceSheetData(ss.getSheetByName('Orders'), orders);
  }
  
  return jsonResponse({ ok: true, message: 'All data saved' });
}

function replaceSheetData(sheet, dataArray) {
  if (!sheet || !dataArray || dataArray.length === 0) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Clear existing data (keep headers)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  // Write new data
  const rows = dataArray.map(item => headers.map(h => item[h] !== undefined ? item[h] : ''));
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

/**
 * Đồng bộ giao dịch từ SePay Base vào tab Transactions
 * - Đọc từ sheet Base (SePay)
 * - Chuẩn hoá theo schema Transactions
 * - Chỉ thêm giao dịch mới (không trùng reference_code)
 * - Không ghi đè giao dịch Manual
 */
function syncSepayTransactions() {
  try {
    // 1. Đọc giao dịch từ sheet Base (SePay)
    const sepaySheet = SpreadsheetApp.openById(SEPAY_SHEET_ID).getSheetByName(SEPAY_SHEET_NAME);
    if (!sepaySheet) {
      return jsonResponse({ ok: false, error: 'Sheet Base not found' });
    }

    const sepayData = sepaySheet.getDataRange().getValues();
    if (sepayData.length < 2) {
      return jsonResponse({ ok: true, message: 'No data in Base', added: 0 });
    }

    const sepayHeaders = sepayData[0];
    const sepayRows = sepayData.slice(1);

    // Map header tiếng Việt sang tiếng Anh
    const headerMap = {
      'Ngân hàng': 'bank',
      'Ngày giao dịch': 'transaction_time',
      'Số tài khoản': 'account_number',
      'Code TT': 'transaction_code',
      'Nội dung thanh toán': 'content',
      'Loại': 'type',
      'Số tiền': 'amount',
      'Mã tham chiếu': 'reference_code'
    };

    // Chuẩn hoá giao dịch từ Base
    const sepayTransactions = sepayRows
      .filter(row => row.some(cell => String(cell || '').trim() !== ''))
      .map((row, idx) => {
        const tx = { source: 'SePay' };
        sepayHeaders.forEach((header, i) => {
          const key = headerMap[header];
          if (key) {
            let value = row[i];
            // Convert Date to string
            if (value instanceof Date) {
              value = Utilities.formatDate(value, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
            }
            // Parse amount
            if (key === 'amount') {
              value = parseFloat(String(value || '0').replace(/[^\d.-]/g, '')) || 0;
            }
            tx[key] = value;
          }
        });
        // Generate transaction_id from reference_code
        tx.transaction_id = tx.reference_code || `SEPAY_${idx + 1}`;
        tx.created_at = new Date().toISOString().split('T')[0];
        return tx;
      })
      .filter(tx => tx.amount > 0 || tx.content);

    // 2. Đọc transactions hiện có trong DB
    const dbSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Transactions');
    if (!dbSheet) {
      return jsonResponse({ ok: false, error: 'Transactions sheet not found' });
    }

    const existingTransactions = sheetToArray(dbSheet);
    const existingRefCodes = new Set(
      existingTransactions
        .filter(tx => tx.source === 'SePay')
        .map(tx => tx.reference_code)
        .filter(Boolean)
    );

    // 3. Lọc giao dịch mới (chưa có trong DB)
    const newTransactions = sepayTransactions.filter(tx =>
      tx.reference_code && !existingRefCodes.has(tx.reference_code)
    );

    if (newTransactions.length === 0) {
      return jsonResponse({ ok: true, message: 'No new transactions', added: 0 });
    }

    // 4. Ghi giao dịch mới vào DB
    const headers = dbSheet.getRange(1, 1, 1, dbSheet.getLastColumn()).getValues()[0];
    const rows = newTransactions.map(tx =>
      headers.map(h => tx[h] !== undefined ? tx[h] : '')
    );

    const lastRow = dbSheet.getLastRow();
    dbSheet.getRange(lastRow + 1, 1, rows.length, headers.length).setValues(rows);

    return jsonResponse({
      ok: true,
      message: `Synced ${newTransactions.length} transactions`,
      added: newTransactions.length
    });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test function
function test() {
  Logger.log(getAllData().getContent());
}
