# Hướng dẫn Setup Google Sheets + Apps Script

## 🔧 Bước 1: Tạo Google Sheet

Mở Google Sheet với ID: `1XKzQTtPIXk5wMLptUU0boZJld2Y0jtaaziBk9p4xyPk`

Tạo 4 sheet tabs với các cột sau:

### Tab 1: `Customers`
| customer_id | full_name | phone_number | address | notes | created_at |
|-------------|-----------|--------------|---------|-------|------------|

### Tab 2: `Products`
| product_id | product_name | price | image_url | is_active |
|------------|--------------|-------|-----------|-----------|

### Tab 3: `Orders`
| order_id | order_code | customer_id | shipping_address | total_amount | payment_override | shipping_status | vtp_order_code | created_at | items |
|----------|------------|-------------|------------------|--------------|------------------|-----------------|----------------|------------|-------|

> **Lưu ý:** Cột `items` chứa JSON string, ví dụ: `[{"product_id":"P001","quantity":1,"unit_price":450000,"subtotal":450000}]`

### Tab 4: `Transactions`
| transaction_id | bank | transaction_time | account_number | content | amount | reference_code |
|----------------|------|------------------|----------------|---------|--------|----------------|

---

## 🔧 Bước 2: Tạo Google Apps Script

### Script 1: Database API

1. Vào **Extensions > Apps Script**
2. Xóa code mặc định, paste nội dung từ file `google-apps-script-db.js`
3. **Deploy > New deployment**
4. Chọn **Web app**
5. Execute as: **Me**
6. Who has access: **Anyone**
7. Click **Deploy**
8. Copy URL và thay vào `DB_API_URL` trong `App.js`

### Script 2: SePay Transactions API (Tùy chọn)

Nếu bạn muốn tách riêng API cho transactions:

1. Tạo Apps Script project mới
2. Paste nội dung từ file `google-apps-script-sepay.js`
3. Deploy như trên
4. Copy URL và thay vào `SEPAY_SHEET_API_URL` trong `App.js`

---

## 🔧 Bước 3: Cấu hình CORS (Quan trọng!)

Google Apps Script tự động xử lý CORS. Tuy nhiên, cần đảm bảo:

1. **Deployment access**: "Anyone" (không phải "Anyone with Google Account")
2. **Execute as**: "Me" (script chạy với quyền của bạn)

---

## ⚠️ Troubleshooting

### Lỗi "Script function not found"
- Kiểm tra tên hàm `doGet` và `doPost` đúng chính tả
- Redeploy sau khi sửa code

### Lỗi "Permission denied"
- Chạy thử hàm `test()` trong Apps Script Editor
- Cấp quyền khi được hỏi
- Redeploy

### Lỗi "Sheet not found"
- Kiểm tra tên sheet tabs đúng chính xác: `Customers`, `Products`, `Orders`, `Transactions`
- Case-sensitive!

### Lỗi CORS
- Đảm bảo URL bắt đầu bằng `https://script.google.com/macros/s/...`
- Không thêm dấu `/` cuối URL

### Dữ liệu không cập nhật
- Mỗi lần sửa code Apps Script phải **Deploy lại** với version mới
- URL sẽ thay đổi sau mỗi lần deploy!

---

## 📝 Test API

Mở browser và truy cập:

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=get_all
```

Kết quả mong đợi:
```json
{
  "ok": true,
  "data": {
    "customers": [...],
    "products": [...],
    "orders": [...],
    "transactions": [...]
  }
}
```

---

## 🔄 SePay Webhook (Tùy chọn nâng cao)

Nếu muốn tự động nhận giao dịch từ SePay:

1. Đăng ký SePay Business: https://sepay.vn
2. Vào **Cài đặt > Webhook**
3. Thêm URL của Apps Script (Script 2)
4. SePay sẽ POST giao dịch mới vào sheet `Transactions`
