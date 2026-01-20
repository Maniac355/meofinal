import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PaymentBadge from "./components/PaymentBadge";
import ShippingBadge from "./components/ShippingBadge";
import { getAPI, postAPI } from "./api/api";
import formatCurrency from "./utils/formatCurrency";
import calculatePaymentStatus from "./utils/paymentStatus";
import {
  DB_API_URL,
  ORDER_SORT_OPTIONS,
  PAYMENT_OPTIONS,
  SEPAY_API_URL,
  SHIPPING_FEE_OPTIONS,
  SHIPPING_OPTIONS,
  VTP_API_URL
} from "./constants";
import {
  IconBanknotes,
  IconCheck,
  IconChevronDown,
  IconClipboard,
  IconEye,
  IconFilter,
  IconHeart,
  IconMapPin,
  IconMoon,
  IconPackage,
  IconPencil,
  IconPhone,
  IconPlus,
  IconQrCode,
  IconRefresh,
  IconSearch,
  IconSort,
  IconSun,
  IconTrash,
  IconTruck,
  IconUsers,
  IconX
} from "./components/Icons";
import { generateId } from "./utils/ids";
import { normalizeOrderItemsForEdit } from "./utils/orderItems";
import { includesSearchValue, normalizeSearchValue } from "./utils/search";

// ============ UTILITIES ============
function generateOrderCode(orders) {
  const maxNum = orders.reduce((max, o) => {
    const match = o.order_code?.match(/DH(\d+)/);
    const num = match ? parseInt(match[1], 10) : 0;
    return num > max ? num : max;
  }, 0);
  const existingCodes = new Set(orders.map(o => o.order_code).filter(Boolean));
  const timeSeed = Number(String(Date.now()).slice(-4));
  let nextNum = Math.max(maxNum + 1, timeSeed);
  let code = `DH${String(nextNum).padStart(4, "0")}`;
  while (existingCodes.has(code)) {
    nextNum += 1;
    code = `DH${String(nextNum).padStart(4, "0")}`;
  }
  return code;
}

// ============ COMPONENTS ============
function FilterDropdown({ label, icon: Icon, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value) || options[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer ${value ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400" : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"}`}>
        <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}:</span><span>{selected.label}</span>
        <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <>
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
        <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg py-1 min-w-[140px]">
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} className={`w-full px-3 py-1.5 text-left text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${opt.value === value ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-medium" : "text-slate-700 dark:text-slate-300"}`}>{opt.label}</button>
          ))}
        </div>
      </>}
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">Hủy</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 cursor-pointer">Xóa</button>
        </div>
      </div>
    </div>
  );
}

function QRModal({ order, onClose }) {
  // QR không có số tiền cố định, chỉ có nội dung chuyển khoản
  const qrUrl = `https://img.vietqr.io/image/TPB-07566782401-compact.png?addInfo=${encodeURIComponent(order.order_code)}&accountName=NGO%20HOANG%20TUAN%20ANH`;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-xs w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold dark:text-white">QR Chuyển Khoản</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconX className="w-4 h-4 dark:text-slate-400" /></button>
        </div>
        <img src={qrUrl} alt="QR Code" className="w-full rounded-lg mb-3" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Nội dung CK</span><span className="font-semibold text-blue-600 dark:text-blue-400">{order.order_code}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Số tiền (tham khảo)</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(order.total_amount)}</span></div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-2 mt-2 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400 text-center">Khách tự nhập số tiền khi chuyển khoản</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerModal({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer || { full_name: "", phone_number: "", address: "", notes: "" });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form, customer_id: customer?.customer_id || generateId("C"), created_at: customer?.created_at || new Date().toISOString().split("T")[0] });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold dark:text-white">{customer ? "Sửa" : "Thêm"} Khách Hàng</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconX className="w-4 h-4 dark:text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" required placeholder="Họ tên *" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 outline-none" />
          <input type="tel" required placeholder="Số điện thoại *" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 outline-none" />
          <input type="text" placeholder="Địa chỉ" value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 outline-none" />
          <input type="text" placeholder="Ghi chú" value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 outline-none" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border dark:border-slate-600 font-medium dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">Hủy</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(product || { product_name: "", price: "", image_url: "", is_active: true });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form, price: Number(form.price), product_id: product?.product_id || generateId("P"), created_at: product?.created_at || new Date().toISOString().split("T")[0] });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold dark:text-white">{product ? "Sửa" : "Thêm"} Sản Phẩm</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconX className="w-4 h-4 dark:text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" required placeholder="Tên sản phẩm *" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 outline-none" />
          <input type="number" required min="0" placeholder="Giá *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 outline-none" />
          <input type="url" placeholder="URL ảnh" value={form.image_url || ""} onChange={e => setForm({ ...form, image_url: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 outline-none" />
          <label className="flex items-center gap-2 cursor-pointer dark:text-slate-300">
            <input type="checkbox" checked={form.is_active === true || form.is_active === "TRUE"} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
            <span>Đang kinh doanh</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border dark:border-slate-600 font-medium dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">Hủy</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderModal({ customers, products, onSave, onClose }) {
  const [mode, setMode] = useState("new");
  const [customer, setCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [newCust, setNewCust] = useState({ full_name: "", phone_number: "", address: "" });
  const [items, setItems] = useState([]);
  const [address, setAddress] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [trackingCode, setTrackingCode] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [prodSearch, setProdSearch] = useState("");

  const activeProducts = products.filter(p => p.is_active === true || p.is_active === "TRUE");
  const productQuery = normalizeSearchValue(prodSearch);
  const customerQuery = normalizeSearchValue(search);
  const filteredProducts = activeProducts.filter(p => includesSearchValue(p.product_name, productQuery));
  const filteredCustomers = customers.filter(c => includesSearchValue(c.full_name, customerQuery) || includesSearchValue(c.phone_number, customerQuery));
  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const toggleProduct = (p) => {
    const idx = items.findIndex(i => i.product_id === p.product_id);
    if (idx >= 0) setItems(items.filter((_, i) => i !== idx));
    else setItems([...items, { product_id: p.product_id, product_name: p.product_name, quantity: 1, unit_price: Number(p.price), subtotal: Number(p.price) }]);
  };

  const updateQty = (pid, qty) => {
    const q = Math.max(1, parseInt(qty) || 1);
    setItems(items.map(i => i.product_id === pid ? { ...i, quantity: q, subtotal: i.unit_price * q } : i));
  };

  const isValid = items.length > 0 && (mode === "existing" ? customer : newCust.full_name && newCust.phone_number);

  const handleSubmit = () => {
    if (!isValid) return;
    onSave({
      customer_id: mode === "existing" ? customer.customer_id : null,
      newCustomer: mode === "new" ? { ...newCust, customer_id: generateId("C"), created_at: new Date().toISOString().split("T")[0] } : null,
      shipping_address: address || newCust.address || customer?.address || "",
      shipping_fee: Number(shippingFee) || 0,
      vtp_order_code: trackingCode.trim(),
      note: orderNote,
      items, total_amount: total
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-3 border-b dark:border-slate-700">
          <h3 className="font-semibold dark:text-white">Tạo Đơn Hàng</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconX className="w-4 h-4 dark:text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-5">
            {/* Customer */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Khách hàng</span>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded p-0.5">
                  <button type="button" onClick={() => setMode("new")} className={`px-2 py-1 text-xs rounded cursor-pointer dark:text-slate-300 ${mode === "new" ? "bg-white dark:bg-slate-600 shadow" : ""}`}>Mới</button>
                  <button type="button" onClick={() => setMode("existing")} className={`px-2 py-1 text-xs rounded cursor-pointer dark:text-slate-300 ${mode === "existing" ? "bg-white dark:bg-slate-600 shadow" : ""}`}>Có sẵn</button>
                </div>
              </div>
              {mode === "new" ? (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                  <input placeholder="Họ tên *" value={newCust.full_name} onChange={e => setNewCust({ ...newCust, full_name: e.target.value })} className="w-full px-2.5 py-1.5 rounded border dark:border-slate-600 dark:bg-slate-600 dark:text-white text-sm" />
                  <input placeholder="SĐT *" value={newCust.phone_number} onChange={e => setNewCust({ ...newCust, phone_number: e.target.value })} className="w-full px-2.5 py-1.5 rounded border dark:border-slate-600 dark:bg-slate-600 dark:text-white text-sm" />
                  <input placeholder="Địa chỉ" value={newCust.address} onChange={e => { setNewCust({ ...newCust, address: e.target.value }); setAddress(e.target.value); }} className="w-full px-2.5 py-1.5 rounded border dark:border-slate-600 dark:bg-slate-600 dark:text-white text-sm" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input placeholder="Tìm khách..." value={customer ? customer.full_name : search} onChange={e => { setSearch(e.target.value); setCustomer(null); }} className="w-full pl-8 pr-3 py-1.5 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm" />
                  </div>
                  {!customer && search && (
                    <div className="bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg max-h-32 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <button key={c.customer_id} type="button" onClick={() => { setCustomer(c); setSearch(""); setAddress(c.address || ""); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer">
                          <div className="font-medium text-sm dark:text-white">{c.full_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{c.phone_number}</div>
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Không tìm thấy</div>}
                    </div>
                  )}
                  {customer && (
                    <div className="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800 flex justify-between items-start">
                      <div><div className="font-medium text-blue-900 dark:text-blue-300 text-sm">{customer.full_name}</div><div className="text-xs text-blue-700 dark:text-blue-400">{customer.phone_number}</div></div>
                      <button type="button" onClick={() => setCustomer(null)} className="text-blue-600 dark:text-blue-400 cursor-pointer"><IconX className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Địa chỉ giao</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Địa chỉ giao hàng" className="w-full px-2.5 py-1.5 rounded border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Phí ship</label>
                <input type="number" min="0" value={shippingFee} onChange={e => setShippingFee(e.target.value)} placeholder="0" className="w-full px-2.5 py-1.5 rounded border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Mã vận đơn (nếu có)</label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={e => setTrackingCode(e.target.value)}
                  placeholder="Nhập mã vận đơn..."
                  className="w-full px-2.5 py-1.5 rounded border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ghi chú đơn hàng</label>
                <textarea rows={3} value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="Nhập ghi chú..." className="w-full px-2.5 py-1.5 rounded border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1" />
              </div>
            </div>
            {/* Products */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Sản phẩm</span>
                {items.length > 0 && <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full">{items.length}</span>}
              </div>
              <div className="relative">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input placeholder="Tìm sản phẩm..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm" />
              </div>
              <div className="border dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto">
                {filteredProducts.map(p => {
                  const sel = items.find(i => i.product_id === p.product_id);
                  return (
                    <div key={p.product_id} onClick={() => toggleProduct(p)} className={`flex items-center gap-2 p-2 border-b dark:border-slate-600 last:border-b-0 cursor-pointer ${sel ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${sel ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-500"}`}>
                        {sel && <IconCheck className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate dark:text-white">{p.product_name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(p.price)}</div>
                      </div>
                      {sel && (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button type="button" onClick={() => updateQty(p.product_id, sel.quantity - 1)} className="w-5 h-5 rounded border dark:border-slate-500 dark:text-slate-300 flex items-center justify-center text-xs cursor-pointer">-</button>
                          <input type="number" min="1" value={sel.quantity} onChange={e => updateQty(p.product_id, e.target.value)} className="w-8 h-5 text-center rounded border dark:border-slate-500 dark:bg-slate-600 dark:text-white text-xs" />
                          <button type="button" onClick={() => updateQty(p.product_id, sel.quantity + 1)} className="w-5 h-5 rounded border dark:border-slate-500 dark:text-slate-300 flex items-center justify-center text-xs cursor-pointer">+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">Không có sản phẩm</div>}
              </div>
              {items.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2.5">
                  {items.map(i => (
                    <div key={i.product_id} className="flex justify-between text-xs dark:text-slate-300">
                      <span>{i.product_name} x{i.quantity}</span>
                      <span className="font-medium">{formatCurrency(i.subtotal)}</span>
                    </div>
                  ))}
                  <div className="border-t dark:border-slate-600 mt-2 pt-2 flex justify-between text-sm font-semibold dark:text-white">
                    <span>Tổng</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border dark:border-slate-600 font-medium dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer">Hủy</button>
          <button onClick={handleSubmit} disabled={!isValid} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer">Tạo đơn</button>
        </div>
      </div>
    </div>
  );
}

function VTPTrackingModal({ orderCode, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    async function track() {
      try {
        const res = await fetch(`${VTP_API_URL}?action=track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderCode }),
        });
        const json = await res.json();
        if (json.ok && json.data) {
          setTracking(json.data);
        } else {
          setError(json.data?.message || json.message || "Không thể tra cứu");
        }
      } catch (e) {
        setError("Lỗi kết nối: " + e.message);
      }
      setLoading(false);
    }
    track();
  }, [orderCode]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-3 border-b bg-orange-50 dark:bg-orange-900/30 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <IconTruck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-300">Tra cứu Viettel Post</h3>
              <p className="text-xs text-orange-700 dark:text-orange-400">{orderCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-orange-100 dark:hover:bg-orange-800/50 rounded cursor-pointer"><IconX className="w-4 h-4 text-orange-600 dark:text-orange-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-8">
              <IconRefresh className="w-6 h-6 text-orange-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Đang tra cứu...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-3">
                <IconX className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : tracking ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Trạng thái</div>
                <div className="font-semibold text-orange-900 dark:text-orange-300">{tracking.STATUS_NAME || tracking.ORDER_STATUS_NAME || "Đang xử lý"}</div>
                {tracking.LAST_LOCATION && <div className="text-xs text-orange-700 dark:text-orange-400 mt-1">{tracking.LAST_LOCATION}</div>}
              </div>
              {/* Timeline */}
              {tracking.LIST_ITEM_TRACE && tracking.LIST_ITEM_TRACE.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">LỊCH SỬ VẬN CHUYỂN</div>
                  <div className="space-y-3">
                    {tracking.LIST_ITEM_TRACE.map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${idx === 0 ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                          {idx < tracking.LIST_ITEM_TRACE.length - 1 && <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-600 mt-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="text-sm font-medium dark:text-white">{item.STATUS_NAME}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.TIME}</div>
                          {item.NOTE && <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.NOTE}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, customer, products, transactions, onUpdate, onDelete, onMatchTransaction, onUnmatchTransaction, onClose }) {
  const [shipping, setShipping] = useState(order.shipping_status || "CHUA_GIAO");
  const [vtpCode, setVtpCode] = useState(order.vtp_order_code || "");
  const [showQR, setShowQR] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showVTP, setShowVTP] = useState(false);
  const [paymentOverride, setPaymentOverride] = useState(order.payment_override || "AUTO");
  const [proofUrl, setProofUrl] = useState(order.payment_proof_url || "");
  const [notes, setNotes] = useState(order.note || "");
  const payment = calculatePaymentStatus(order, transactions);
  const baseItems = useMemo(() => normalizeOrderItemsForEdit(order.items), [order.items]);
  const matchedTransactions = useMemo(
    () => transactions.filter(tx => tx.order_code === order.order_code),
    [transactions, order.order_code]
  );

  // Editable items state
  const [editItems, setEditItems] = useState(() => normalizeOrderItemsForEdit(order.items));
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [showMatchTransaction, setShowMatchTransaction] = useState(false);

  // Calculate new total from editItems
  const newTotal = editItems.reduce((s, i) => s + i.subtotal, 0);
  const hasChanges = JSON.stringify(editItems) !== JSON.stringify(baseItems) || newTotal !== order.total_amount;

  // Filter products for adding (exclude already added ones)
  const activeProducts = products.filter(p => p.is_active === true || p.is_active === "TRUE");
  const availableProducts = activeProducts.filter(p =>
    !editItems.find(i => i.product_id === p.product_id) &&
    includesSearchValue(p.product_name, normalizeSearchValue(prodSearch))
  );

  // Update quantity
  const updateQty = (productId, newQty) => {
    const qty = Math.max(1, parseInt(newQty) || 1);
    setEditItems(editItems.map(i =>
      i.product_id === productId
        ? { ...i, quantity: qty, subtotal: i.unit_price * qty }
        : i
    ));
  };

  // Remove item
  const removeItem = (productId) => {
    setEditItems(editItems.filter(i => i.product_id !== productId));
  };

  // Add product
  const addProduct = (product) => {
    setEditItems([...editItems, {
      product_id: product.product_id,
      product_name: product.product_name,
      quantity: 1,
      unit_price: Number(product.price),
      subtotal: Number(product.price)
    }]);
    setShowAddProduct(false);
    setProdSearch("");
  };

  const handleSave = () => {
    onUpdate({
      ...order,
      shipping_status: shipping,
      vtp_order_code: vtpCode,
      payment_override: paymentOverride,
      payment_proof_url: proofUrl,
      note: notes,
      items: editItems,
      total_amount: newTotal
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b dark:border-slate-700 bg-gradient-to-r from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-800 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <IconClipboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{order.order_code}</span>
                  <PaymentBadge order={order} transactions={transactions} />
                  <ShippingBadge status={order.shipping_status} />
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Ngày tạo: {order.created_at}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowQR(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer shadow-sm">
                <IconQrCode className="w-4 h-4" /> QR
              </button>
              <button onClick={() => setShowDelete(true)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-lg cursor-pointer"><IconTrash className="w-5 h-5" /></button>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"><IconX className="w-5 h-5 dark:text-slate-400" /></button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Customer & Products */}
              <div className="space-y-5">
                {/* Customer Info */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                      {(customer?.full_name || "?").charAt(0)}
                    </div>
                    <div>
                      <div className="text-lg font-semibold dark:text-white">{customer?.full_name || "N/A"}</div>
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                        <IconPhone className="w-4 h-4" /> {customer?.phone_number || "N/A"}
                      </div>
                    </div>
                  </div>
                  {order.shipping_address && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
                        <IconMapPin className="w-4 h-4" /> Địa chỉ giao hàng
                      </div>
                      <div className="text-sm text-blue-900 dark:text-blue-300">{order.shipping_address}</div>
                    </div>
                  )}
                  {/* Order Notes */}
                  <div className="mt-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      <IconClipboard className="w-4 h-4" /> Ghi chú đơn hàng
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Nhập ghi chú cho đơn hàng..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm resize-none focus:border-blue-500 outline-none"
                    />
                  </div>
                  {/* Matched Transactions */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <IconBanknotes className="w-4 h-4" /> Giao dịch đã khớp
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMatchTransaction(true)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 cursor-pointer"
                      >
                        Chọn giao dịch
                      </button>
                    </div>
                    {matchedTransactions.length > 0 ? (
                      <div className="space-y-2">
                        {matchedTransactions.map(tx => (
                          <div key={tx.transaction_id || tx.reference_code} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-700 rounded-lg border dark:border-slate-600 px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(tx.amount)}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{tx.bank} • {tx.transaction_time}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onUnmatchTransaction(tx)}
                              className="px-2 py-1 text-xs rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                            >
                              Xóa khớp
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-slate-400">Chưa khớp giao dịch.</div>
                    )}
                  </div>
                </div>

                {/* Products List */}
                <div className="bg-white dark:bg-slate-700/50 rounded-xl border dark:border-slate-600 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700 border-b dark:border-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold dark:text-white">Sản phẩm ({editItems.length})</span>
                      <button
                        onClick={() => setShowAddProduct(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 cursor-pointer"
                      >
                        <IconPlus className="w-3.5 h-3.5" /> Thêm SP
                      </button>
                    </div>
                  </div>
                  <div className="divide-y dark:divide-slate-600 max-h-64 overflow-y-auto">
                    {editItems.map((item, idx) => {
                      const prod = products.find(p => p.product_id === item.product_id);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-600/50">
                          <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {prod?.image_url ? (
                              <img src={prod.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <IconPackage className="w-7 h-7 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium dark:text-white text-sm">{prod?.product_name || item.product_name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(item.unit_price)}</div>
                          </div>
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQty(item.product_id, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg border dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateQty(item.product_id, e.target.value)}
                              className="w-10 h-7 text-center rounded-lg border dark:border-slate-500 dark:bg-slate-600 dark:text-white text-sm"
                            />
                            <button
                              onClick={() => updateQty(item.product_id, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg border dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right w-24 flex-shrink-0">
                            <div className="font-semibold text-blue-600 dark:text-blue-400 text-sm">{formatCurrency(item.subtotal)}</div>
                          </div>
                          {/* Remove button */}
                          <button
                            onClick={() => removeItem(item.product_id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg cursor-pointer flex-shrink-0"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {editItems.length === 0 && (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <IconPackage className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có sản phẩm</p>
                      </div>
                    )}
                  </div>
                  {/* Total */}
                  <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-slate-700 dark:to-slate-700 border-t dark:border-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold dark:text-white">Tổng cộng</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(newTotal)}</span>
                        {hasChanges && newTotal !== order.total_amount && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 line-through">{formatCurrency(order.total_amount)}</div>
                        )}
                      </div>
                    </div>
                    {payment.tip > 0 && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-pink-200 dark:border-pink-800">
                        <span className="text-sm text-pink-700 dark:text-pink-400 flex items-center gap-1"><IconHeart className="w-4 h-4" /> Tip khách tặng</span>
                        <span className="font-bold text-pink-600 dark:text-pink-400">+{formatCurrency(payment.tip)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Product Modal */}
                {showAddProduct && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddProduct(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center px-5 py-3 border-b dark:border-slate-700">
                        <h3 className="font-semibold dark:text-white">Thêm sản phẩm</h3>
                        <button onClick={() => setShowAddProduct(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer">
                          <IconX className="w-4 h-4 dark:text-slate-400" />
                        </button>
                      </div>
                      <div className="px-5 py-3 border-b dark:border-slate-700">
                        <div className="relative">
                          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={prodSearch}
                            onChange={e => setProdSearch(e.target.value)}
                            placeholder="Tìm sản phẩm..."
                            className="w-full pl-9 pr-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {availableProducts.length > 0 ? (
                          <div className="divide-y dark:divide-slate-700">
                            {availableProducts.map(p => (
                              <button
                                key={p.product_id}
                                onClick={() => addProduct(p)}
                                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-left"
                              >
                                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <IconPackage className="w-6 h-6 text-slate-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium dark:text-white text-sm">{p.product_name}</div>
                                  <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(p.price)}</div>
                                </div>
                                <IconPlus className="w-5 h-5 text-blue-500" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            <p className="text-sm">{prodSearch ? "Không tìm thấy sản phẩm" : "Đã thêm hết sản phẩm"}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Status & Actions */}
              <div className="space-y-5">
                {/* Payment Status */}
                <div className="bg-white dark:bg-slate-700/50 rounded-xl border dark:border-slate-600 p-5">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <IconBanknotes className="w-5 h-5" /> Thanh toán
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-4 border border-emerald-100 dark:border-emerald-800">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Đã nhận</div>
                      <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(payment.received)}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Cần thanh toán</div>
                      <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(newTotal)}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Thanh toán thủ công</label>
                      <select value={paymentOverride} onChange={e => setPaymentOverride(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm cursor-pointer">
                        <option value="AUTO">Tự động đối soát</option>
                        <option value="DU">Đã chuyển</option>
                        <option value="CHUA_CHUYEN">Chưa chuyển</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Ảnh giao dịch</label>
                      <input
                        type="text"
                        value={proofUrl}
                        onChange={e => setProofUrl(e.target.value)}
                        placeholder="Dán URL ảnh giao dịch..."
                        className="w-full px-4 py-2.5 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                      />
                      {proofUrl && (
                        <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                          Xem ảnh giao dịch ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping Status */}
                <div className="bg-white dark:bg-slate-700/50 rounded-xl border dark:border-slate-600 p-5">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <IconTruck className="w-5 h-5" /> Giao hàng
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Trạng thái giao hàng</label>
                    <select value={shipping} onChange={e => setShipping(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm cursor-pointer">
                      <option value="CHUA_GIAO">Chưa giao</option>
                      <option value="DANG_GIAO">Đang giao</option>
                      <option value="VIETTEL_POST">Viettel Post</option>
                      <option value="DA_GIAO">Đã giao</option>
                    </select>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Mã vận đơn (nếu có)</label>
                    <input
                      type="text"
                      value={vtpCode}
                      onChange={e => setVtpCode(e.target.value)}
                      placeholder="Nhập mã vận đơn..."
                      className="w-full px-4 py-2.5 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                    />
                  </div>
                  {/* Viettel Post Tracking */}
                  {shipping === "VIETTEL_POST" && (
                    <div className="mt-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-400 mb-3 flex items-center gap-2">
                        <IconTruck className="w-4 h-4" /> Tra cứu Viettel Post
                      </div>
                      <button
                        onClick={() => setShowVTP(true)}
                        disabled={!vtpCode}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium cursor-pointer ${vtpCode ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-orange-200 text-orange-500 cursor-not-allowed"}`}
                      >
                        <IconTruck className="w-4 h-4" /> Tra cứu vận đơn
                      </button>
                      {!vtpCode && (
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">Nhập mã vận đơn để tra cứu.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex gap-4 rounded-b-2xl">
            <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl border dark:border-slate-600 font-medium dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer transition-all">
              Đóng
            </button>
            <button onClick={handleSave} className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer shadow-lg shadow-blue-500/25 transition-all">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
      {showQR && <QRModal order={order} onClose={() => setShowQR(false)} />}
      {showVTP && vtpCode && <VTPTrackingModal orderCode={vtpCode} onClose={() => setShowVTP(false)} />}
      {showDelete && <ConfirmModal title="Xóa đơn hàng?" message={`Xóa đơn ${order.order_code}?`} onConfirm={() => { onDelete(order.order_id); onClose(); }} onClose={() => setShowDelete(false)} />}
      {showMatchTransaction && (
        <MatchTransactionModal
          order={order}
          transactions={transactions}
          onMatch={onMatchTransaction}
          onClose={() => setShowMatchTransaction(false)}
        />
      )}
    </>
  );
}

function MatchTransactionModal({ order, transactions, onMatch, onClose }) {
  const [search, setSearch] = useState("");
  const availableTx = transactions.filter(tx => !tx.order_code);
  const filteredTx = availableTx.filter(tx => {
    const q = normalizeSearchValue(search);
    return !q ||
      includesSearchValue(tx.content, q) ||
      includesSearchValue(tx.transaction_code, q) ||
      includesSearchValue(tx.reference_code, q) ||
      includesSearchValue(tx.amount, q);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-3 border-b dark:border-slate-700">
          <div>
            <h3 className="font-semibold dark:text-white">Chọn giao dịch</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Đơn hàng: {order.order_code}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer">
            <IconX className="w-4 h-4 dark:text-slate-400" />
          </button>
        </div>
        <div className="px-5 py-3 border-b dark:border-slate-700">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm giao dịch..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {filteredTx.length > 0 ? (
            <div className="space-y-2">
              {filteredTx.map(tx => (
                <button
                  key={tx.transaction_id || tx.reference_code}
                  onClick={() => { onMatch(tx, order); onClose(); }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 text-left cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(tx.amount)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{tx.bank} • {tx.transaction_time}</div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">{tx.content}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                      {Number(tx.amount) === Number(order.total_amount) ? "Khớp số tiền" : `Chênh ${formatCurrency(Number(tx.amount || 0) - Number(order.total_amount || 0))}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p className="text-sm">Không có giao dịch phù hợp</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ManualTransactionModal({ onSave, onClose }) {
  const [amount, setAmount] = useState("");
  const [content, setContent] = useState("");
  const [transactionTime, setTransactionTime] = useState(new Date().toISOString().slice(0, 16));
  const [bank, setBank] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = amount && parseFloat(amount) > 0 && content.trim();

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    const transaction = {
      transaction_id: `MANUAL_${Date.now()}`,
      amount: parseFloat(amount),
      content: content.trim(),
      transaction_time: transactionTime.replace("T", " "),
      bank: bank || "Thủ công",
      source: "Manual",
      note: note,
      created_at: new Date().toISOString().split("T")[0]
    };
    await onSave(transaction);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-3 border-b dark:border-slate-700">
          <h3 className="font-semibold dark:text-white">Thêm giao dịch thủ công</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconX className="w-4 h-4 dark:text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Số tiền *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nội dung chuyển khoản *</label>
            <input type="text" value={content} onChange={e => setContent(e.target.value)} placeholder="Nội dung..." className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Thời gian</label>
            <input type="datetime-local" value={transactionTime} onChange={e => setTransactionTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ngân hàng</label>
            <input type="text" value={bank} onChange={e => setBank(e.target.value)} placeholder="VD: Vietcombank" className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ghi chú</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú..." className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm mt-1" />
          </div>
        </div>
        <div className="px-5 py-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border dark:border-slate-600 font-medium dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer">Hủy</button>
          <button onClick={handleSubmit} disabled={!isValid || saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
            {saving ? "Đang lưu..." : "Thêm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchOrderModal({ transaction, orders, onMatch, onClose }) {
  const [search, setSearch] = useState("");
  const unmatchedOrders = orders.filter(o => {
    const matchSearch = !search ||
      includesSearchValue(o.order_code, normalizeSearchValue(search)) ||
      includesSearchValue(o.total_amount, normalizeSearchValue(search));
    return matchSearch;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-3 border-b dark:border-slate-700">
          <div>
            <h3 className="font-semibold dark:text-white">Khớp đơn hàng</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Giao dịch: {formatCurrency(transaction.amount)}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconX className="w-4 h-4 dark:text-slate-400" /></button>
        </div>
        <div className="px-5 py-3 border-b dark:border-slate-700">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm mã đơn hoặc số tiền..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {unmatchedOrders.length > 0 ? (
            <div className="space-y-2">
              {unmatchedOrders.map(order => (
                <button
                  key={order.order_id}
                  onClick={() => onMatch(transaction, order)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800 border border-transparent text-left cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-blue-600 dark:text-blue-400">{order.order_code}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{order.created_at}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold dark:text-white">{formatCurrency(order.total_amount)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {order.total_amount === transaction.amount ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Khớp số tiền</span>
                        ) : (
                          <span>Chênh: {formatCurrency(transaction.amount - order.total_amount)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p className="text-sm">Không tìm thấy đơn hàng</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionsModal({ transactions, orders, onSaveTransaction, onUnmatchTransaction, onClose }) {
  const [showAdd, setShowAdd] = useState(false);
  const [matchingTx, setMatchingTx] = useState(null);

  const handleMatch = async (transaction, order) => {
    const updated = {
      ...transaction,
      order_code: order.order_code,
      matched_at: new Date().toISOString().split("T")[0]
    };
    await onSaveTransaction(updated);
    setMatchingTx(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center px-5 py-3 border-b dark:border-slate-700">
            <div>
              <h3 className="font-semibold dark:text-white">Giao dịch SePay</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{transactions.length} giao dịch • Cập nhật mỗi 15s</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 cursor-pointer flex items-center gap-1">
                <IconPlus className="w-4 h-4" /> Thêm
              </button>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconX className="w-4 h-4 dark:text-slate-400" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((tx, idx) => (
                  <div key={tx.transaction_id || idx} className={`p-3 rounded-lg ${tx.source === 'Manual' ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-700'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(tx.amount)}</span>
                          {tx.source === 'Manual' && <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded">Thủ công</span>}
                          {tx.order_code && <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">{tx.order_code}</span>}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md truncate">{tx.content}</div>
                        <div className="text-xs text-slate-400">{tx.bank} • {tx.transaction_time}</div>
                      </div>
                      {!tx.order_code ? (
                        <button
                          onClick={() => setMatchingTx(tx)}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900 cursor-pointer"
                        >
                          Khớp đơn
                        </button>
                      ) : (
                        <button
                          onClick={() => onUnmatchTransaction(tx)}
                          className="px-2 py-1 text-xs text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                        >
                          Xóa khớp
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <IconRefresh className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Đang tải...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAdd && <ManualTransactionModal onSave={onSaveTransaction} onClose={() => setShowAdd(false)} />}
      {matchingTx && <MatchOrderModal transaction={matchingTx} orders={orders} onMatch={handleMatch} onClose={() => setMatchingTx(null)} />}
    </>
  );
}

// ============ SYNC CONFIG ============
const SYNC_INTERVAL = 10000; // 10 seconds
const SEPAY_INTERVAL = 15000; // 15 seconds

// ============ MAIN APP ============
export default function App() {
  const [tab, setTab] = useState("orders");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Sync state
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const loadInFlightRef = useRef(false);

  // Filters
  const [filterPayment, setFilterPayment] = useState("");
  const [filterShipping, setFilterShipping] = useState("");
  const [filterShippingFee, setFilterShippingFee] = useState("");
  const [orderSort, setOrderSort] = useState("newest");

  // SePay filters
  const [sepayDateFrom, setSepayDateFrom] = useState("");
  const [sepayDateTo, setSepayDateTo] = useState("");
  const [sepayAmountMin, setSepayAmountMin] = useState("");
  const [sepayAmountMax, setSepayAmountMax] = useState("");
  const [sepaySortOrder, setSepaySortOrder] = useState("newest");
  const [sepaySearch, setSepaySearch] = useState("");

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Modals
  const [showCustomer, setShowCustomer] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [showProduct, setShowProduct] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showOrder, setShowOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTx, setShowTx] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [matchingTx, setMatchingTx] = useState(null);

  const parseItemsJson = (itemsJson, fallbackItems = [], orderCode = "") => {
    if (!itemsJson) {
      if (typeof fallbackItems === "string") {
        try {
          return JSON.parse(fallbackItems);
        } catch (error) {
          console.warn("Failed to parse items fallback", { orderCode, error });
          return [];
        }
      }
      return fallbackItems;
    }
    try {
      return JSON.parse(itemsJson);
    } catch (error) {
      console.warn("Failed to parse items_json", { orderCode, error });
      return fallbackItems;
    }
  };

  // Load DB data function (reusable)
  const loadData = useCallback(async (isManual = false) => {
    if (loadInFlightRef.current && !isManual) return;
    loadInFlightRef.current = true;
    setSyncing(true);
    try {
      // Load DB data and SePay transactions in parallel
      const [dbRes, sepayRes] = await Promise.all([
        getAPI(DB_API_URL, "get_all"),
        fetch(`${SEPAY_API_URL}?key=nhtavantmp`)
      ]);

      const dbJson = await dbRes.json();
      const sepayJson = await sepayRes.json();

      if (dbJson.ok && dbJson.data) {
        // Track new orders
        const newOrders = (dbJson.data.orders || []).map(o => ({
          ...o,
          items: parseItemsJson(o.items_json, o.items || [], o.order_code),
          total_amount: Number(o.total_amount) || 0,
        }));

        setCustomers(dbJson.data.customers || []);
        setProducts(dbJson.data.products || []);

        // Merge transactions: SePay API data + DB match info
        const dbTransactions = dbJson.data.transactions || [];
        const dbMatchByRef = new Map();
        const dbMatchById = new Map();
        dbTransactions.forEach(tx => {
          if (tx.order_code) {
            const matchData = {
              order_code: tx.order_code,
              matched_at: tx.matched_at,
              transaction_id: tx.transaction_id
            };
            // Index by reference_code
            if (tx.reference_code) {
              dbMatchByRef.set(tx.reference_code, matchData);
            }
            // Index by transaction_id (which equals reference_code when we save)
            if (tx.transaction_id) {
              dbMatchById.set(tx.transaction_id, matchData);
            }
          }
        });

        // Use SePay API as primary source, merge with DB match info
        let mergedTransactions = [];
        if (sepayJson.ok && Array.isArray(sepayJson.data)) {
          mergedTransactions = sepayJson.data.map(tx => {
            // Try match by reference_code first, then by transaction_id
            const matchInfo = dbMatchByRef.get(tx.reference_code) || dbMatchById.get(tx.reference_code);
            if (matchInfo) {
              return { ...tx, ...matchInfo };
            }
            // Generate transaction_id if not exists
            if (!tx.transaction_id) {
              tx.transaction_id = tx.reference_code || `TX_${Date.now()}`;
            }
            return tx;
          });
        }

        // Also include manual transactions from DB (source === 'Manual')
        const manualTxs = dbTransactions.filter(tx => tx.source === 'Manual');
        mergedTransactions = [...mergedTransactions, ...manualTxs];

        setTransactions(mergedTransactions);

        // Count new orders (compare by length for simplicity)
        setOrders(prevOrders => {
          if (prevOrders.length > 0 && newOrders.length > prevOrders.length) {
            const diff = newOrders.length - prevOrders.length;
            setNewOrdersCount(prev => prev + diff);
          }
          return newOrders;
        });

        setLastSync(new Date());
      }
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      loadInFlightRef.current = false;
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  // Initial load + Auto sync every 10s
  useEffect(() => {
    loadData();
    const id = setInterval(() => loadData(false), SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [loadData]);

  
  // Manual sync
  const handleManualSync = () => {
    setNewOrdersCount(0);
    loadData(true);
  };

  // Clear new orders badge when viewing orders tab
  useEffect(() => {
    if (tab === "orders") setNewOrdersCount(0);
  }, [tab]);

  // Save helpers
  async function saveCustomer(data) {
    setShowCustomer(false);
    setEditCustomer(null);
    if (editCustomer) {
      setCustomers(customers.map(c => c.customer_id === data.customer_id ? data : c));
    } else {
      setCustomers([...customers, data]);
    }
    await postAPI(DB_API_URL, "upsert_customer", { data });
  }

  async function deleteCustomer(id) {
    setCustomers(customers.filter(c => c.customer_id !== id));
    setDeleteConfirm(null);
    await postAPI(DB_API_URL, "delete_customer", { customer_id: id });
  }

  async function saveProduct(data) {
    setShowProduct(false);
    setEditProduct(null);
    if (editProduct) {
      setProducts(products.map(p => p.product_id === data.product_id ? data : p));
    } else {
      setProducts([...products, data]);
    }
    await postAPI(DB_API_URL, "upsert_product", { data });
  }

  async function deleteProduct(id) {
    setProducts(products.filter(p => p.product_id !== id));
    setDeleteConfirm(null);
    await postAPI(DB_API_URL, "delete_product", { product_id: id });
  }

  async function createOrder(data) {
    setShowOrder(false);
    let custId = data.customer_id;
    if (data.newCustomer) {
      setCustomers(prev => [...prev, data.newCustomer]);
      custId = data.newCustomer.customer_id;
      await postAPI(DB_API_URL, "upsert_customer", { data: data.newCustomer });
    }
    const newOrder = {
      order_id: generateId("O"),
      order_code: generateOrderCode(orders),
      customer_id: custId,
      shipping_address: data.shipping_address,
      shipping_fee: data.shipping_fee,
      vtp_order_code: data.vtp_order_code || "",
      total_amount: data.total_amount,
      payment_override: "AUTO",
      shipping_status: "CHUA_GIAO",
      note: data.note,
      created_at: new Date().toISOString().split("T")[0],
      items: data.items,
      items_json: JSON.stringify(data.items),
    };
    setOrders([newOrder, ...orders]);
    await postAPI(DB_API_URL, "upsert_order", { data: newOrder });
  }

  async function updateOrder(data) {
    const toSave = { ...data, items_json: JSON.stringify(data.items || []), vtp_order_code: data.vtp_order_code || "" };
    setOrders(orders.map(o => o.order_id === data.order_id ? toSave : o));
    await postAPI(DB_API_URL, "upsert_order", { data: toSave });
  }

  async function markOrderDelivered(order) {
    const updated = { ...order, shipping_status: "DA_GIAO" };
    await updateOrder(updated);
  }

  async function deleteOrder(id) {
    setOrders(orders.filter(o => o.order_id !== id));
    await postAPI(DB_API_URL, "delete_order", { order_id: id });
  }

  async function saveTransaction(transaction) {
    // Update local state - match by transaction_id OR reference_code
    setTransactions(prev => {
      const exists = prev.find(t =>
        t.transaction_id === transaction.transaction_id ||
        (t.reference_code && t.reference_code === transaction.reference_code)
      );
      if (exists) {
        return prev.map(t =>
          (t.transaction_id === transaction.transaction_id ||
           (t.reference_code && t.reference_code === transaction.reference_code))
            ? { ...t, ...transaction }
            : t
        );
      }
      return [transaction, ...prev];
    });
    // Save to API
    await postAPI(DB_API_URL, "save_transaction", { transaction });
  }

  // Handle match order from SePay tab
  async function handleMatchOrder(transaction, order) {
    const updated = {
      ...transaction,
      // Use reference_code as transaction_id for DB storage (more stable than TX1, TX2...)
      transaction_id: transaction.reference_code || transaction.transaction_id,
      order_code: order.order_code,
      matched_at: new Date().toISOString().split("T")[0]
    };
    await saveTransaction(updated);
    setMatchingTx(null);
  }

  async function handleUnmatchTransaction(transaction) {
    const updated = {
      ...transaction,
      order_code: "",
      matched_at: ""
    };
    await saveTransaction(updated);
  }

  // Stats
  const stats = useMemo(() => {
    let revenue = 0, tip = 0, pendingPay = 0, pendingShip = 0;
    orders.forEach(o => {
      const p = calculatePaymentStatus(o, transactions);
      if (p.status === "DU" || p.status === "THUA") revenue += Number(o.total_amount) || 0;
      tip += p.tip;
      if (p.status === "CHUA_CHUYEN" || p.status === "THIEU") pendingPay++;
      if (o.shipping_status === "CHUA_GIAO") pendingShip++;
    });
    return { revenue, tip, pendingPay, pendingShip };
  }, [orders, transactions]);

  // Filtered data
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(o => {
      if (search) {
        const c = customers.find(x => x.customer_id === o.customer_id);
        const q = normalizeSearchValue(search);
        if (
          !includesSearchValue(o.order_code, q) &&
          !includesSearchValue(o.vtp_order_code, q) &&
          !includesSearchValue(c?.full_name, q) &&
          !includesSearchValue(c?.phone_number, q)
        ) {
          return false;
        }
      }
      if (filterPayment) {
        const p = calculatePaymentStatus(o, transactions);
        if (p.status !== filterPayment) return false;
      }
      if (filterShipping && o.shipping_status !== filterShipping) return false;
      if (filterShippingFee) {
        const hasFee = Number(o.shipping_fee) > 0;
        if (filterShippingFee === "has" && !hasFee) return false;
        if (filterShippingFee === "none" && hasFee) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (orderSort) {
        case "oldest":
          return String(a.created_at || "").localeCompare(String(b.created_at || ""));
        case "order_code":
          return String(a.order_code || "").localeCompare(String(b.order_code || ""), "vi", { numeric: true });
        case "amount_asc":
          return (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
        case "amount_desc":
          return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
        case "newest":
        default:
          return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      }
    });
    return sorted;
  }, [orders, customers, transactions, search, filterPayment, filterShipping, filterShippingFee, orderSort]);

  const filteredCustomers = customers.filter(c => !search || includesSearchValue(c.full_name, normalizeSearchValue(search)) || includesSearchValue(c.phone_number, normalizeSearchValue(search)));
  const filteredProducts = products.filter(p => !search || includesSearchValue(p.product_name, normalizeSearchValue(search)));

  // Filtered transactions for SePay tab
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by search (transaction code, reference code, content)
    if (sepaySearch) {
      const q = normalizeSearchValue(sepaySearch);
      result = result.filter(tx =>
        includesSearchValue(tx.transaction_code, q) ||
        includesSearchValue(tx.reference_code, q) ||
        includesSearchValue(tx.content, q)
      );
    }

    // Filter by date range
    if (sepayDateFrom) {
      result = result.filter(tx => {
        const txDate = tx.transaction_time?.split(" ")[0];
        return txDate >= sepayDateFrom;
      });
    }
    if (sepayDateTo) {
      result = result.filter(tx => {
        const txDate = tx.transaction_time?.split(" ")[0];
        return txDate <= sepayDateTo;
      });
    }

    // Filter by amount range
    if (sepayAmountMin) {
      const min = parseFloat(sepayAmountMin) || 0;
      result = result.filter(tx => (tx.amount || 0) >= min);
    }
    if (sepayAmountMax) {
      const max = parseFloat(sepayAmountMax) || Infinity;
      result = result.filter(tx => (tx.amount || 0) <= max);
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = a.transaction_time || "";
      const dateB = b.transaction_time || "";
      return sepaySortOrder === "newest" ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });

    return result;
  }, [transactions, sepaySearch, sepayDateFrom, sepayDateTo, sepayAmountMin, sepayAmountMax, sepaySortOrder]);

  const tabs = [
    { id: "orders", label: "Đơn hàng", icon: IconClipboard, count: orders.length },
    { id: "customers", label: "Khách hàng", icon: IconUsers, count: customers.length },
    { id: "products", label: "Sản phẩm", icon: IconPackage, count: products.length },
    { id: "sepay", label: "SePay", icon: IconBanknotes, count: transactions.length },
  ];

  const hasFilters = filterPayment || filterShipping || filterShippingFee;
  const hasSepayFilters = sepayDateFrom || sepayDateTo || sepayAmountMin || sepayAmountMax || sepaySearch;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <IconRefresh className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-slate-600 dark:text-slate-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <IconPackage className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white">Meoooo</h1>
                {lastSync && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 -mt-0.5">
                    Cập nhật: {lastSync.toLocaleTimeString("vi-VN")}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer transition-all"
                title={darkMode ? "Chuyển sang sáng" : "Chuyển sang tối"}
              >
                {darkMode ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
              </button>
              {/* Sync Button */}
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-all ${syncing ? "bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300"}`}
              >
                <IconRefresh className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline font-medium">{syncing ? "Đang tải..." : "Đồng bộ"}</span>
              </button>
              {/* Add Button */}
              <button
                onClick={() => {
                  if (tab === "customers") { setEditCustomer(null); setShowCustomer(true); }
                  else if (tab === "products") { setEditProduct(null); setShowProduct(true); }
                  else setShowOrder(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer text-sm shadow-lg shadow-blue-500/25"
              >
                <IconPlus className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Thêm mới</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* New Orders Notification */}
      {newOrdersCount > 0 && tab !== "orders" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <button 
            onClick={() => { setTab("orders"); setNewOrdersCount(0); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 cursor-pointer animate-pulse"
          >
            <IconClipboard className="w-4 h-4" />
            Có {newOrdersCount} đơn hàng mới! Xem ngay
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Sync Status Bar */}
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${syncing ? "bg-blue-500 animate-pulse" : "bg-emerald-500"}`}></span>
            <span>{syncing ? "Đang đồng bộ..." : "Tự động đồng bộ mỗi 10s"}</span>
          </div>
          {lastSync && (
            <span>Lần cuối: {lastSync.toLocaleTimeString("vi-VN")}</span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border dark:border-slate-700 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400">Doanh thu</div>
            <div className="text-lg font-bold dark:text-white">{formatCurrency(stats.revenue)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border dark:border-slate-700 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><IconHeart className="w-3 h-3 text-pink-500" /> Tip</div>
            <div className="text-lg font-bold text-pink-600 dark:text-pink-400">{formatCurrency(stats.tip)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border dark:border-slate-700 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400">Chờ TT</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.pendingPay}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border dark:border-slate-700 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400">Chờ giao</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.pendingShip}</div>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border dark:border-slate-700 shadow-sm">
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium cursor-pointer text-sm ${tab === t.id ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                <t.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20" : "bg-slate-100 dark:bg-slate-600"}`}>{t.count}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..." className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm text-sm dark:text-white outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Filters */}
        {tab === "orders" && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <IconFilter className="w-4 h-4" /> Lọc:
            </div>
            <FilterDropdown label="Thanh toán" icon={IconBanknotes} value={filterPayment} options={PAYMENT_OPTIONS} onChange={setFilterPayment} />
            <FilterDropdown label="Giao hàng" icon={IconTruck} value={filterShipping} options={SHIPPING_OPTIONS} onChange={setFilterShipping} />
            <FilterDropdown label="Phí ship" icon={IconBanknotes} value={filterShippingFee} options={SHIPPING_FEE_OPTIONS} onChange={setFilterShippingFee} />
            {hasFilters && (
              <button onClick={() => { setFilterPayment(""); setFilterShipping(""); setFilterShippingFee(""); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer">
                <IconX className="w-3.5 h-3.5" /> Xóa lọc
              </button>
            )}
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <IconSort className="w-4 h-4" /> Sắp xếp:
            </div>
            <FilterDropdown label="Đơn hàng" icon={IconSort} value={orderSort} options={ORDER_SORT_OPTIONS} onChange={setOrderSort} />
            <div className="text-xs text-slate-500 ml-auto">{filteredOrders.length} / {orders.length} đơn</div>
          </div>
        )}

        {/* Orders */}
        {tab === "orders" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Mã đơn</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Vận đơn</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Khách hàng</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Tổng tiền</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Phí ship</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Tip</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Thanh toán</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Giao hàng</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ngày</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {filteredOrders.map(order => {
                    const cust = customers.find(c => c.customer_id === order.customer_id);
                    const pay = calculatePaymentStatus(order, transactions);
                    const canConfirmDelivered = order.shipping_status === "VIETTEL_POST" && String(order.vtp_order_code || "").trim();
                    return (
                      <tr key={order.order_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-2.5"><span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">{order.order_code}</span></td>
                        <td className="px-4 py-2.5">
                          {order.vtp_order_code ? (
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{order.vtp_order_code}</span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-sm dark:text-white">{cust?.full_name || "N/A"}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{cust?.phone_number}</div>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-sm dark:text-white">{formatCurrency(order.total_amount)}</td>
                        <td className="px-4 py-2.5 text-sm dark:text-white">
                          {Number(order.shipping_fee) > 0 ? formatCurrency(order.shipping_fee) : <span className="text-xs text-slate-400">-</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {pay.tip > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400">
                              <IconHeart className="w-3 h-3" /> +{formatCurrency(pay.tip)}
                            </span>
                          ) : <span className="text-xs text-slate-400">-</span>}
                        </td>
                        <td className="px-4 py-2.5"><PaymentBadge order={order} transactions={transactions} /></td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col items-start gap-1.5">
                            <ShippingBadge status={order.shipping_status} />
                            {canConfirmDelivered && (
                              <button
                                onClick={() => markOrderDelivered(order)}
                                className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 cursor-pointer"
                              >
                                Xác nhận đã giao
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{order.created_at}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => setSelectedOrder(order)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconEye className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredOrders.length === 0 && <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">{search || hasFilters ? "Không tìm thấy" : "Chưa có đơn hàng"}</div>}
          </div>
        )}

        {/* Customers */}
        {tab === "customers" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredCustomers.map(c => (
              <div key={c.customer_id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer group" onClick={() => { setEditCustomer(c); setShowCustomer(true); }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">{(c.full_name || "?").charAt(0)}</div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={e => { e.stopPropagation(); setEditCustomer(c); setShowCustomer(true); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"><IconPencil className="w-3.5 h-3.5 text-slate-400" /></button>
                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: "customer", id: c.customer_id, name: c.full_name }); }} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded cursor-pointer"><IconTrash className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
                <div className="font-semibold text-sm dark:text-white">{c.full_name}</div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><IconPhone className="w-3 h-3" />{c.phone_number}</div>
                {c.address && <div className="flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1"><IconMapPin className="w-3 h-3 mt-0.5" /><span className="line-clamp-1">{c.address}</span></div>}
              </div>
            ))}
            {filteredCustomers.length === 0 && <div className="col-span-full text-center py-8 text-slate-500 dark:text-slate-400 text-sm">{search ? "Không tìm thấy" : "Chưa có khách hàng"}</div>}
          </div>
        )}

        {/* Products */}
        {tab === "products" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(p => (
              <div key={p.product_id} className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer group ${p.is_active === false || p.is_active === "FALSE" ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20" : ""}`} onClick={() => { setEditProduct(p); setShowProduct(true); }}>
                <div className="aspect-square bg-slate-100 dark:bg-slate-700 relative">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><IconPackage className="w-12 h-12" /></div>}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: "product", id: p.product_id, name: p.product_name }); }} className="p-1 rounded bg-white/90 dark:bg-slate-800/90 hover:bg-red-50 dark:hover:bg-red-900/50 cursor-pointer shadow"><IconTrash className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold text-sm dark:text-white line-clamp-1">{p.product_name}</div>
                    {(p.is_active === false || p.is_active === "FALSE") && <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full">Ngừng</span>}
                  </div>
                  <div className="text-base font-bold text-blue-600 dark:text-blue-400">{formatCurrency(p.price)}</div>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && <div className="col-span-full text-center py-8 text-slate-500 dark:text-slate-400 text-sm">{search ? "Không tìm thấy" : "Chưa có sản phẩm"}</div>}
          </div>
        )}

        {/* SePay Tab */}
        {tab === "sepay" && (
          <>
            {/* SePay Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm p-4 mb-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tìm kiếm (mã GD, nội dung)</label>
                  <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={sepaySearch}
                      onChange={e => setSepaySearch(e.target.value)}
                      placeholder="Nhập mã giao dịch, nội dung..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={sepayDateFrom}
                    onChange={e => setSepayDateFrom(e.target.value)}
                    className="px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={sepayDateTo}
                    onChange={e => setSepayDateTo(e.target.value)}
                    className="px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Số tiền từ</label>
                  <input
                    type="number"
                    value={sepayAmountMin}
                    onChange={e => setSepayAmountMin(e.target.value)}
                    placeholder="0"
                    className="w-28 px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Số tiền đến</label>
                  <input
                    type="number"
                    value={sepayAmountMax}
                    onChange={e => setSepayAmountMax(e.target.value)}
                    placeholder="∞"
                    className="w-28 px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sắp xếp</label>
                  <select
                    value={sepaySortOrder}
                    onChange={e => setSepaySortOrder(e.target.value)}
                    className="px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                  </select>
                </div>
                {hasSepayFilters && (
                  <button
                    onClick={() => {
                      setSepaySearch("");
                      setSepayDateFrom("");
                      setSepayDateTo("");
                      setSepayAmountMin("");
                      setSepayAmountMax("");
                      setSepaySortOrder("newest");
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                  >
                    <IconX className="w-4 h-4" /> Xóa lọc
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{filteredTransactions.length} / {transactions.length} giao dịch</div>
            </div>

            {/* SePay Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ngày GD</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Mã tham chiếu</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Nội dung</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ngân hàng</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Số tiền</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Đơn hàng</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={tx.reference_code || tx.transaction_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300">{tx.transaction_time}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded">{tx.reference_code || "-"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-sm dark:text-slate-300 max-w-xs truncate">{tx.content || "-"}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400">{tx.bank || "-"}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(tx.amount)}</td>
                        <td className="px-4 py-2.5">
                          {tx.order_code ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400">{tx.order_code}</span>
                          ) : (
                            <span className="text-xs text-slate-400">Chưa khớp</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {!tx.order_code ? (
                            <button
                              onClick={() => setMatchingTx(tx)}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900 cursor-pointer"
                            >
                              Khớp đơn
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnmatchTransaction(tx)}
                              className="px-2 py-1 text-xs text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                            >
                              Xóa khớp
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  {hasSepayFilters ? "Không tìm thấy giao dịch phù hợp" : "Chưa có giao dịch"}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showCustomer && <CustomerModal customer={editCustomer} onSave={saveCustomer} onClose={() => { setShowCustomer(false); setEditCustomer(null); }} />}
      {showProduct && <ProductModal product={editProduct} onSave={saveProduct} onClose={() => { setShowProduct(false); setEditProduct(null); }} />}
      {showOrder && <OrderModal customers={customers} products={products} onSave={createOrder} onClose={() => setShowOrder(false)} />}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          customer={customers.find(c => c.customer_id === selectedOrder.customer_id)}
          products={products}
          transactions={transactions}
          onUpdate={updateOrder}
          onDelete={deleteOrder}
          onMatchTransaction={handleMatchOrder}
          onUnmatchTransaction={handleUnmatchTransaction}
          onClose={() => setSelectedOrder(null)}
        />
      )}
      {showTx && (
        <TransactionsModal
          transactions={transactions}
          orders={orders}
          onSaveTransaction={saveTransaction}
          onUnmatchTransaction={handleUnmatchTransaction}
          onClose={() => setShowTx(false)}
        />
      )}
      {matchingTx && <MatchOrderModal transaction={matchingTx} orders={orders} onMatch={handleMatchOrder} onClose={() => setMatchingTx(null)} />}
      {deleteConfirm && (
        <ConfirmModal
          title={`Xóa ${deleteConfirm.type === "customer" ? "khách hàng" : "sản phẩm"}?`}
          message={`Xóa "${deleteConfirm.name}"?`}
          onConfirm={() => deleteConfirm.type === "customer" ? deleteCustomer(deleteConfirm.id) : deleteProduct(deleteConfirm.id)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
