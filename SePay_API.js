/**
 * SePay Transactions API
 * ĐÂY LÀ APP SCRIPT CỦA SHEET "BASE: NƠI CHỨA TOÀN BỘ NỘI DUNG CHUYỂN KHOẢN ĐƯỢC ĐẨY VỀ TỪ SePay
 * Đọc giao dịch từ sheet "Base" 
 * Sheet ID: 1E5U3DEP2nDrM3MAIf2JdkuopXGENj0wrdr3AHiTlPb8
 * 
 * Cấu trúc sheet Base:
 * Ngân hàng | Ngày giao dịch | Số tài khoản | Tài khoản phụ | Code TT | Nội dung thanh toán | Loại | Số tiền | Mã tham chiếu | Lũy kế
 */

const SEPAY_SHEET_ID = '1E5U3DEP2nDrM3MAIf2JdkuopXGENj0wrdr3AHiTlPb8';
const SEPAY_SHEET_NAME = 'Base';

function doGet(e) {
  const key = e?.parameter?.key;
  
  // Validate API key
  if (key !== 'nhtavantmp') {
    return jsonResponse({ ok: false, error: 'Invalid API key' });
  }
  
  try {
    const ss = SpreadsheetApp.openById(SEPAY_SHEET_ID);
    const sheet = ss.getSheetByName(SEPAY_SHEET_NAME);
    
    if (!sheet) {
      return jsonResponse({ ok: false, error: 'Sheet "Base" not found' });
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return jsonResponse({ ok: true, data: [] });
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Map headers tiếng Việt sang format chuẩn
    const headerMap = {
      'Ngân hàng': 'bank',
      'Ngày giao dịch': 'transaction_time',
      'Số tài khoản': 'account_number',
      'Tài khoản phụ': 'sub_account',
      'Code TT': 'code',
      'Nội dung thanh toán': 'content',
      'Loại': 'type',
      'Số tiền': 'amount',
      'Mã tham chiếu': 'reference_code',
      'Lũy kế': 'balance'
    };
    
    const transactions = rows
      .filter(row => row.some(cell => String(cell || '').trim() !== ''))
      .map((row, idx) => {
        const obj = {
          transaction_id: `TX${idx + 1}`,
        };
        
        headers.forEach((header, i) => {
          const key = headerMap[header] || header;
          let value = row[i];
          
          // Convert Date to string
          if (value instanceof Date) {
            value = Utilities.formatDate(value, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
          }
          
          // Parse amount - remove currency formatting
          if (key === 'amount' || key === 'balance') {
            value = parseFloat(String(value || '0').replace(/[^\d.-]/g, '')) || 0;
          }
          
          obj[key] = value;
        });
        
        return obj;
      })
      .filter(tx => tx.amount > 0 || tx.content);
    
    return jsonResponse({ ok: true, data: transactions });
    
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
function testDoGet() {
  const mockEvent = { parameter: { key: 'nhtavantmp' } };
  const result = doGet(mockEvent);
  Logger.log(result.getContent());
}
