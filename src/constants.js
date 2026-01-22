// ============ API URLS ============
export const DB_API_URL = "https://script.google.com/macros/s/AKfycby_YKTsZhgyGmHtGHZwAqOXkC4PplwoYN6y01LlIY7PSTyFDxcs_xDiWSEvaDSE9FCZ/exec";
export const SEPAY_API_URL = "https://script.google.com/macros/s/AKfycbyzXm0kdoTcxI8gfCtszSEwiJ6mRSizMZ42CUvnFcGJTmZbzcXM25XovWgLpnok7qsx/exec";
export const VTP_API_URL = "https://script.google.com/macros/s/AKfycbxuIMd2HH4zCW0KzSHPSCzk68oT6l6zOzItjLiwBdBpzn2TrzswDGnLWgwDcuhk1U4W/exec";

// ============ STATUS OPTIONS ============
export const PAYMENT_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "CHUA_CHUYEN", label: "Chưa chuyển" },
  { value: "THIEU", label: "Thiếu" },
  { value: "DU", label: "Đã đủ" },
  { value: "THUA", label: "Có tip" },
];

export const SHIPPING_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "CHUA_GIAO", label: "Chưa giao" },
  { value: "DANG_GIAO", label: "Đang giao" },
  { value: "VIETTEL_POST", label: "Viettel Post" },
  { value: "DA_GIAO", label: "Đã giao" },
];

export const SHIPPING_FEE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "has", label: "Có phí" },
  { value: "none", label: "Không phí" },
];

export const ORDER_SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "order_code", label: "Mã đơn" },
  { value: "amount_desc", label: "Giá tiền ↓" },
  { value: "amount_asc", label: "Giá tiền ↑" },
];
