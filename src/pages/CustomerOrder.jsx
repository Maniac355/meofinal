import { useEffect, useMemo, useState } from "react";
import formatCurrency from "../utils/formatCurrency";
import { generateId } from "../utils/ids";
import { includesSearchValue, normalizeSearchValue } from "../utils/search";
import { IconCheck, IconPackage, IconSearch } from "../components/Icons";
import legacyProvinces from "../data/legacy_tinh_tp.json";
import legacyDistricts from "../data/legacy_quan_huyen.json";
import legacyWards from "../data/legacy_xa_phuong.json";

export default function CustomerOrder({ products, onCreateOrder, onNavigateAdmin }) {
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    note: ""
  });
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [paidNote, setPaidNote] = useState("");
  const [useLegacyAddress, setUseLegacyAddress] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const [apiProvinces, setApiProvinces] = useState([]);
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  const activeProducts = useMemo(
    () => products.filter(p => p.is_active === true || p.is_active === "TRUE"),
    [products]
  );
  const productQuery = normalizeSearchValue(productSearch);
  const filteredProducts = activeProducts.filter(p => includesSearchValue(p.product_name, productQuery));
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const isValid = items.length > 0 && form.full_name.trim() && form.phone_number.trim();

  useEffect(() => {
    if (useLegacyAddress || apiProvinces.length > 0) {
      setAddressError(false);
      return;
    }
    const controller = new AbortController();
    setAddressLoading(true);
    setAddressError(false);
    fetch("https://provinces.open-api.vn/api/?depth=3", { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error("Load failed");
        return res.json();
      })
      .then(data => {
        setApiProvinces(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          setAddressError(true);
        }
      })
      .finally(() => {
        setAddressLoading(false);
      });
    return () => controller.abort();
  }, [useLegacyAddress, apiProvinces.length]);

  useEffect(() => {
    setProvinceCode("");
    setDistrictCode("");
    setWardCode("");
  }, [useLegacyAddress]);

  const legacyProvinceList = useMemo(() => (
    Object.values(legacyProvinces).map(p => ({
      code: p.code,
      name: p.name_with_type || p.name
    })).sort((a, b) => a.name.localeCompare(b.name, "vi"))
  ), []);

  const legacyDistrictList = useMemo(() => (
    Object.values(legacyDistricts)
      .filter(d => d.parent_code === provinceCode)
      .map(d => ({ code: d.code, name: d.name_with_type || d.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
  ), [provinceCode]);

  const legacyWardList = useMemo(() => (
    Object.values(legacyWards)
      .filter(w => w.parent_code === districtCode)
      .map(w => ({ code: w.code, name: w.name_with_type || w.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
  ), [districtCode]);

  const apiProvinceList = useMemo(() => (
    apiProvinces.map(p => ({
      code: String(p.code),
      name: p.name,
      districts: p.districts || []
    })).sort((a, b) => a.name.localeCompare(b.name, "vi"))
  ), [apiProvinces]);

  const selectedApiProvince = useMemo(
    () => apiProvinceList.find(p => p.code === provinceCode),
    [apiProvinceList, provinceCode]
  );
  const apiDistrictList = useMemo(() => (
    (selectedApiProvince?.districts || []).map(d => ({
      code: String(d.code),
      name: d.name,
      wards: d.wards || []
    })).sort((a, b) => a.name.localeCompare(b.name, "vi"))
  ), [selectedApiProvince]);
  const selectedApiDistrict = useMemo(
    () => apiDistrictList.find(d => d.code === districtCode),
    [apiDistrictList, districtCode]
  );
  const apiWardList = useMemo(() => (
    (selectedApiDistrict?.wards || []).map(w => ({
      code: String(w.code),
      name: w.name
    })).sort((a, b) => a.name.localeCompare(b.name, "vi"))
  ), [selectedApiDistrict]);

  const provinceOptions = useLegacyAddress ? legacyProvinceList : apiProvinceList;
  const districtOptions = useLegacyAddress ? legacyDistrictList : apiDistrictList;
  const wardOptions = useLegacyAddress ? legacyWardList : apiWardList;

  const selectedProvinceName = useLegacyAddress
    ? legacyProvinces[provinceCode]?.name_with_type || legacyProvinces[provinceCode]?.name
    : selectedApiProvince?.name;
  const selectedDistrictName = useLegacyAddress
    ? legacyDistricts[districtCode]?.name_with_type || legacyDistricts[districtCode]?.name
    : selectedApiDistrict?.name;
  const selectedWardName = useLegacyAddress
    ? legacyWards[wardCode]?.name_with_type || legacyWards[wardCode]?.name
    : apiWardList.find(w => w.code === wardCode)?.name;

  const builtAddress = [addressDetail, selectedWardName, selectedDistrictName, selectedProvinceName]
    .filter(Boolean)
    .join(", ");
  const shippingAddress = addressError && manualAddress.trim()
    ? manualAddress.trim()
    : builtAddress;

  const toggleProduct = (product) => {
    const existing = items.find(i => i.product_id === product.product_id);
    if (existing) {
      setItems(items.filter(i => i.product_id !== product.product_id));
      return;
    }
    const price = Number(product.price) || 0;
    setItems([...items, {
      product_id: product.product_id,
      product_name: product.product_name,
      quantity: 1,
      unit_price: price,
      subtotal: price
    }]);
  };

  const updateQty = (productId, qty) => {
    const nextQty = Math.max(1, parseInt(qty, 10) || 1);
    setItems(items.map(item =>
      item.product_id === productId
        ? { ...item, quantity: nextQty, subtotal: item.unit_price * nextQty }
        : item
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setShowPaidConfirm(false);
    setPaidNote("");

    const newCustomer = {
      customer_id: generateId("C"),
      full_name: form.full_name.trim(),
      phone_number: form.phone_number.trim(),
      address: shippingAddress,
      notes: form.note.trim(),
      created_at: new Date().toISOString().split("T")[0]
    };

    const payload = {
      customer_id: null,
      newCustomer,
      shipping_address: shippingAddress,
      shipping_fee: 0,
      vtp_order_code: "",
      note: form.note.trim(),
      items,
      total_amount: total
    };

    const created = await onCreateOrder(payload);
    setLastOrder(created || null);
    setSubmitting(false);
    setItems([]);
    setForm({ full_name: "", phone_number: "", note: "" });
    setProvinceCode("");
    setDistrictCode("");
    setWardCode("");
    setAddressDetail("");
    setManualAddress("");
  };

  const qrContent = lastOrder?.order_code || lastOrder?.order_id || "";
  const qrUrl = qrContent
    ? `https://img.vietqr.io/image/TPB-07566782401-compact.png?addInfo=${encodeURIComponent(qrContent)}&accountName=NGO%20HOANG%20TUAN%20ANH`
    : "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <IconPackage className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Đặt hàng nhanh</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chọn sản phẩm và gửi thông tin</p>
            </div>
          </div>
          <button
            onClick={onNavigateAdmin}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Admin
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chọn sản phẩm</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{items.length} sản phẩm</span>
          </div>
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={productSearch}
              onChange={event => setProductSearch(event.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
            />
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredProducts.map(product => {
              const selected = items.find(i => i.product_id === product.product_id);
              return (
                <button
                  key={product.product_id}
                  type="button"
                  onClick={() => toggleProduct(product)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border ${selected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selected ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-500"}`}>
                    {selected && <IconCheck className="w-3 h-3 text-white" />}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <IconPackage className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">{product.product_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(product.price)}</div>
                  </div>
                  {selected && (
                    <div className="flex items-center gap-1" onClick={event => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => updateQty(product.product_id, selected.quantity - 1)}
                        className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-600 text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={selected.quantity}
                        onChange={event => updateQty(product.product_id, event.target.value)}
                        className="w-10 h-6 text-center rounded-lg border border-slate-200 dark:border-slate-600 text-xs dark:bg-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => updateQty(product.product_id, selected.quantity + 1)}
                        className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-600 text-xs"
                      >
                        +
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">Không có sản phẩm phù hợp.</div>
            )}
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Tổng cộng</span>
              <span className="text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Thông tin nhận hàng</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Vui lòng điền đầy đủ để chúng tôi liên hệ.</p>
          </div>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={event => setForm({ ...form, full_name: event.target.value })}
              placeholder="Họ và tên *"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
            />
            <input
              type="tel"
              required
              value={form.phone_number}
              onChange={event => setForm({ ...form, phone_number: event.target.value })}
              placeholder="Số điện thoại *"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={useLegacyAddress}
                onChange={event => setUseLegacyAddress(event.target.checked)}
                className="w-4 h-4"
              />
              Dùng địa chỉ trước sáp nhập
            </label>
            {addressError ? (
              <div className="space-y-2">
                <div className="text-xs text-red-600 dark:text-red-400">
                  Không tải được danh mục địa chỉ. Vui lòng nhập địa chỉ đầy đủ.
                </div>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={event => setManualAddress(event.target.value)}
                  placeholder="Nhập địa chỉ đầy đủ"
                  className="w-full px-3 py-2 rounded-lg border border-red-200 dark:border-red-700 dark:bg-slate-700 text-sm"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={provinceCode}
                  onChange={event => {
                    setProvinceCode(event.target.value);
                    setDistrictCode("");
                    setWardCode("");
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
                >
                  <option value="">{addressLoading ? "Đang tải tỉnh/TP..." : "Chọn Tỉnh/TP"}</option>
                  {provinceOptions.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={districtCode}
                  onChange={event => {
                    setDistrictCode(event.target.value);
                    setWardCode("");
                  }}
                  disabled={!provinceCode}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm disabled:opacity-60"
                >
                  <option value="">Chọn Quận/Huyện</option>
                  {districtOptions.map(d => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
                <select
                  value={wardCode}
                  onChange={event => setWardCode(event.target.value)}
                  disabled={!districtCode}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm disabled:opacity-60"
                >
                  <option value="">Chọn Phường/Xã</option>
                  {wardOptions.map(w => (
                    <option key={w.code} value={w.code}>{w.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={addressDetail}
                  onChange={event => setAddressDetail(event.target.value)}
                  placeholder="Địa chỉ cụ thể (số nhà, tên đường)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
                />
              </div>
            )}
            <textarea
              rows={3}
              value={form.note}
              onChange={event => setForm({ ...form, note: event.target.value })}
              placeholder="Ghi chú"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
            />
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Đang gửi..." : "Gửi đơn hàng"}
            </button>
          </form>
          {lastOrder && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                Đặt hàng thành công! Mã đơn: <strong>{lastOrder.order_code}</strong>
              </div>
              {qrUrl && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-3">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">QR chuyển khoản</div>
                  <img src={qrUrl} alt="QR chuyển khoản" className="w-full rounded-lg border border-slate-200 dark:border-slate-700" />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Nội dung đối chiếu: <span className="font-semibold text-blue-600 dark:text-blue-400">{qrContent}</span>
                  </div>
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                    Vui lòng không thay đổi nội dung chuyển khoản để đơn hàng được xác nhận nhanh nhất.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPaidConfirm(true)}
                    className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  >
                    ✅ Tôi đã thanh toán
                  </button>
                  {showPaidConfirm && (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={paidNote}
                        onChange={event => setPaidNote(event.target.value)}
                        placeholder="Bạn có thể để lại ghi chú (tùy chọn)..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
                      />
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                        Cảm ơn bạn! Bọn mình đã nhận thông tin và sẽ xác nhận sớm.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
