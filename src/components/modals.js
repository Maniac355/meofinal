import { useEffect, useMemo, useState } from "react";
import PaymentBadge from "./PaymentBadge";
import ShippingBadge from "./ShippingBadge";
import formatCurrency from "../utils/formatCurrency";
import calculatePaymentStatus from "../utils/paymentStatus";
import { VTP_API_URL } from "../constants";
import { generateId } from "../utils/ids";
import { normalizeOrderItemsForEdit } from "../utils/orderItems";
import { includesSearchValue, normalizeSearchValue } from "../utils/search";
import {
  IconBanknotes,
  IconCheck,
  IconClipboard,
  IconHeart,
  IconMapPin,
  IconPackage,
  IconPhone,
  IconPlus,
  IconQrCode,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTruck,
  IconX
} from "./Icons";

export function ConfirmModal({ title, message, onConfirm, onClose }) {
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

export function QRModal({ order, onClose }) {
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

export function CustomerModal({ customer, onSave, onClose }) {
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

export function ProductModal({ product, onSave, onClose }) {
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

export function OrderModal({ customers, products, onSave, onClose }) {
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

export function VTPTrackingModal({ orderCode, onClose }) {
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

export function OrderDetailModal({ order, customer, products, transactions, onUpdate, onDelete, onMatchTransaction, onUnmatchTransaction, onClose }) {
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

export function MatchTransactionModal({ order, transactions, onMatch, onClose }) {
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

export function ManualTransactionModal({ onSave, onClose }) {
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

export function MatchOrderModal({ transaction, orders, onMatch, onClose }) {
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

export function TransactionsModal({ transactions, orders, onSaveTransaction, onUnmatchTransaction, onClose }) {
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
