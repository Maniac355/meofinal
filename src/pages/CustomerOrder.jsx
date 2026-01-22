import { useEffect, useMemo, useRef, useState } from "react";
import formatCurrency from "../utils/formatCurrency";
import { generateId } from "../utils/ids";
import { includesSearchValue, normalizeSearchValue } from "../utils/search";
import { IconCheck, IconPackage, IconSearch } from "../components/Icons";
import SearchableCombobox from "../components/SearchableCombobox";

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
  const MODE_BEFORE = "before";
  const MODE_AFTER = "after";
  const [addressMode, setAddressMode] = useState(MODE_AFTER);
  const [addressFallback, setAddressFallback] = useState(false);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [wardId, setWardId] = useState("");
  const [provinceInput, setProvinceInput] = useState("");
  const [districtInput, setDistrictInput] = useState("");
  const [wardInput, setWardInput] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [fallbackAddress, setFallbackAddress] = useState("");
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const cacheRef = useRef({
    provinces: {
      [MODE_BEFORE]: null,
      [MODE_AFTER]: null
    },
    districtsByProvince: {},
    wardsByDistrict: {},
    wardsByProvince: {}
  });

  const isBeforeMode = addressMode === MODE_BEFORE;

  const activeProducts = useMemo(
    () => products.filter(p => p.is_active === true || p.is_active === "TRUE"),
    [products]
  );
  const productQuery = normalizeSearchValue(productSearch);
  const filteredProducts = activeProducts.filter(p => includesSearchValue(p.product_name, productQuery));
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const isValid = items.length > 0 && form.full_name.trim() && form.phone_number.trim();

  const baseUrl = addressMode === MODE_BEFORE
    ? "https://provinces.open-api.vn/api/v1"
    : "https://provinces.open-api.vn/api/v2";

  const selectedProvinceName = provinceOptions.find(p => p.value === provinceId)?.label;
  const selectedDistrictName = districtOptions.find(d => d.value === districtId)?.label;
  const selectedWardName = wardOptions.find(w => w.value === wardId)?.label;

  const administrativeAddress = addressFallback
    ? fallbackAddress
    : [
      selectedWardName,
      isBeforeMode ? selectedDistrictName : null,
      selectedProvinceName
    ].filter(Boolean).join(", ");
  const builtAddress = [addressDetail, administrativeAddress].filter(Boolean).join(", ");
  const shippingAddress = builtAddress;

  const addressValid = addressFallback
    ? true
    : isBeforeMode
      ? Boolean(provinceId && districtId && wardId)
      : Boolean(provinceId && wardId);
  const formValid = isValid && addressValid;

  const provinceError = showAddressErrors && !addressFallback && !provinceId
    ? "Vui lòng chọn Tỉnh/TP"
    : "";
  const districtError = showAddressErrors && !addressFallback && isBeforeMode && provinceId && !districtId
    ? "Vui lòng chọn Quận/Huyện"
    : "";
  const wardError = showAddressErrors && !addressFallback && ((isBeforeMode && districtId && !wardId) || (!isBeforeMode && provinceId && !wardId))
    ? "Vui lòng chọn Phường/Xã"
    : "";

  const fetchJSON = async (url, { timeoutMs = 7000 } = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  const fetchWithRetry = async (url, options, retries = 1) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetchJSON(url, options);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const handleFetchFailure = () => {
    setAddressFallback(true);
    setLoadingProvinces(false);
    setLoadingDistricts(false);
    setLoadingWards(false);
  };

  const loadProvinces = async (mode) => {
    const cached = cacheRef.current.provinces[mode];
    if (cached) {
      setProvinceOptions(cached);
      return;
    }
    setLoadingProvinces(true);
    try {
      const data = await fetchWithRetry(`${mode === MODE_BEFORE ? "https://provinces.open-api.vn/api/v1" : "https://provinces.open-api.vn/api/v2"}/p`, { timeoutMs: 7000 });
      const options = (data || [])
        .map(p => ({ value: String(p.code), label: p.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "vi"));
      cacheRef.current.provinces[mode] = options;
      setProvinceOptions(options);
      setAddressFallback(false);
    } catch (error) {
      handleFetchFailure();
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadDistrictsForProvince = async (provinceCode) => {
    const provinceKey = String(provinceCode);
    const cached = cacheRef.current.districtsByProvince[provinceKey];
    if (cached) {
      setDistrictOptions(cached);
      return;
    }
    setLoadingDistricts(true);
    try {
      const data = await fetchWithRetry(`${baseUrl}/p/${provinceKey}?depth=2`, { timeoutMs: 7000 });
      const districts = (data?.districts || [])
        .map(d => ({ value: String(d.code), label: d.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "vi"));
      cacheRef.current.districtsByProvince[provinceKey] = districts;
      (data?.districts || []).forEach(district => {
        const districtKey = String(district.code);
        if (!cacheRef.current.wardsByDistrict[districtKey]) {
          cacheRef.current.wardsByDistrict[districtKey] = (district.wards || [])
            .map(ward => ({ value: String(ward.code), label: ward.name }))
            .sort((a, b) => a.label.localeCompare(b.label, "vi"));
        }
      });
      setDistrictOptions(districts);
      setAddressFallback(false);
    } catch (error) {
      handleFetchFailure();
    } finally {
      setLoadingDistricts(false);
    }
  };

  const loadWardsForDistrict = async (districtCode) => {
    const districtKey = String(districtCode);
    const cached = cacheRef.current.wardsByDistrict[districtKey];
    if (cached) {
      setWardOptions(cached);
      return;
    }
    setLoadingWards(true);
    try {
      const data = await fetchWithRetry(`${baseUrl}/d/${districtKey}?depth=2`, { timeoutMs: 7000 });
      const wards = (data?.wards || [])
        .map(ward => ({ value: String(ward.code), label: ward.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "vi"));
      cacheRef.current.wardsByDistrict[districtKey] = wards;
      setWardOptions(wards);
      setAddressFallback(false);
    } catch (error) {
      handleFetchFailure();
    } finally {
      setLoadingWards(false);
    }
  };

  const loadWardsForProvince = async (provinceCode) => {
    const provinceKey = String(provinceCode);
    const cached = cacheRef.current.wardsByProvince[provinceKey];
    if (cached) {
      setWardOptions(cached);
      return;
    }
    setLoadingWards(true);
    try {
      const data = await fetchWithRetry(`${baseUrl}/p/${provinceKey}?depth=2`, { timeoutMs: 7000 });
      const wards = (data?.wards || [])
        .map(ward => ({ value: String(ward.code), label: ward.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "vi"));
      cacheRef.current.wardsByProvince[provinceKey] = wards;
      setWardOptions(wards);
      setAddressFallback(false);
    } catch (error) {
      handleFetchFailure();
    } finally {
      setLoadingWards(false);
    }
  };

  const handleModeToggle = (checked) => {
    const nextMode = checked ? MODE_BEFORE : MODE_AFTER;
    if (nextMode === addressMode) return;
    setShowAddressErrors(false);
    setAddressMode(nextMode);
    setDistrictId("");
    setWardId("");
    setDistrictInput("");
    setWardInput("");
    setDistrictOptions([]);
    setWardOptions([]);
  };

  useEffect(() => {
    if (addressFallback) return;
    loadProvinces(addressMode);
  }, [addressFallback, addressMode]);

  useEffect(() => {
    if (!provinceId || addressFallback) return;
    if (!provinceOptions.some(option => option.value === provinceId)) return;
    if (isBeforeMode) {
      loadDistrictsForProvince(provinceId);
    } else {
      loadWardsForProvince(provinceId);
    }
  }, [addressFallback, isBeforeMode, provinceId, provinceOptions]);

  useEffect(() => {
    if (!districtId || addressFallback || !isBeforeMode) return;
    loadWardsForDistrict(districtId);
  }, [addressFallback, districtId, isBeforeMode]);

  useEffect(() => {
    if (!provinceId) return;
    const exists = provinceOptions.some(option => option.value === provinceId);
    if (!exists) {
      setProvinceId("");
      setProvinceInput("");
      setDistrictId("");
      setWardId("");
      setDistrictInput("");
      setWardInput("");
    }
  }, [provinceId, provinceOptions]);

  const resetDistrictAndWard = () => {
    setDistrictId("");
    setWardId("");
    setDistrictInput("");
    setWardInput("");
    setDistrictOptions([]);
    setWardOptions([]);
  };

  const handleProvinceSelect = (nextId) => {
    setProvinceId(nextId);
    setProvinceInput(provinceOptions.find(option => option.value === nextId)?.label || "");
    resetDistrictAndWard();
    if (!nextId || addressFallback) return;
    if (isBeforeMode) {
      loadDistrictsForProvince(nextId);
    } else {
      loadWardsForProvince(nextId);
    }
  };

  const handleProvinceInput = (value, meta) => {
    setProvinceInput(value);
    if (meta?.fromSelection) return;
    if (provinceId) setProvinceId("");
    resetDistrictAndWard();
  };

  const handleDistrictSelect = (nextId) => {
    setDistrictId(nextId);
    setDistrictInput(districtOptions.find(option => option.value === nextId)?.label || "");
    setWardId("");
    setWardInput("");
    setWardOptions([]);
    if (!nextId || addressFallback) return;
    loadWardsForDistrict(nextId);
  };

  const handleDistrictInput = (value, meta) => {
    setDistrictInput(value);
    if (meta?.fromSelection) return;
    if (districtId) setDistrictId("");
    setWardId("");
    setWardInput("");
    setWardOptions([]);
  };

  const handleWardSelect = (nextId) => {
    setWardId(nextId);
    setWardInput(wardOptions.find(option => option.value === nextId)?.label || "");
  };

  const handleWardInput = (value, meta) => {
    setWardInput(value);
    if (meta?.fromSelection) return;
    if (wardId) setWardId("");
  };

  const handleProvinceClear = () => {
    setProvinceId("");
    setProvinceInput("");
    resetDistrictAndWard();
  };

  const handleDistrictClear = () => {
    setDistrictId("");
    setDistrictInput("");
    setWardId("");
    setWardInput("");
    setWardOptions([]);
  };

  const handleWardClear = () => {
    setWardId("");
    setWardInput("");
  };

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
    if (!formValid || submitting) {
      setShowAddressErrors(true);
      return;
    }
    setSubmitting(true);
    setShowPaidConfirm(false);
    setPaidNote("");
    setShowAddressErrors(false);

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
    setProvinceId("");
    setDistrictId("");
    setWardId("");
    setProvinceInput("");
    setDistrictInput("");
    setWardInput("");
    setAddressDetail("");
    setFallbackAddress("");
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
                checked={isBeforeMode}
                onChange={event => handleModeToggle(event.target.checked)}
                className="w-4 h-4"
              />
              Dùng địa chỉ trước sáp nhập
            </label>
            <div className="space-y-3">
              {!addressFallback && (
                <>
                  <SearchableCombobox
                    id="province-combobox"
                    label="Tỉnh/TP"
                    required
                    placeholder="Chọn Tỉnh/TP"
                    options={provinceOptions}
                    value={provinceId}
                    inputValue={provinceInput}
                    onInputChange={handleProvinceInput}
                    onChange={handleProvinceSelect}
                    onClear={handleProvinceClear}
                    disabled={loadingProvinces}
                    loading={loadingProvinces}
                    error={provinceError}
                    onBlur={() => setShowAddressErrors(true)}
                  />
                  {isBeforeMode && (
                    <SearchableCombobox
                      id="district-combobox"
                      label="Quận/Huyện"
                      required
                      placeholder="Chọn Quận/Huyện"
                      options={districtOptions}
                      value={districtId}
                      inputValue={districtInput}
                      onInputChange={handleDistrictInput}
                      onChange={handleDistrictSelect}
                      onClear={handleDistrictClear}
                      disabled={!provinceId || loadingDistricts}
                      loading={loadingDistricts}
                      error={districtError}
                      onBlur={() => setShowAddressErrors(true)}
                    />
                  )}
                  <SearchableCombobox
                    id="ward-combobox"
                    label="Phường/Xã"
                    required
                    placeholder="Chọn Phường/Xã"
                    options={wardOptions}
                    value={wardId}
                    inputValue={wardInput}
                    onInputChange={handleWardInput}
                    onChange={handleWardSelect}
                    onClear={handleWardClear}
                    disabled={isBeforeMode ? !districtId || loadingWards : !provinceId || loadingWards}
                    loading={loadingWards}
                    error={wardError}
                    onBlur={() => setShowAddressErrors(true)}
                  />
                </>
              )}
              {addressFallback && (
                <textarea
                  rows={3}
                  value={fallbackAddress}
                  onChange={event => setFallbackAddress(event.target.value)}
                  placeholder="Nhập địa chỉ đầy đủ"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
                />
              )}
              <input
                type="text"
                value={addressDetail}
                onChange={event => setAddressDetail(event.target.value)}
                placeholder="Địa chỉ cụ thể (số nhà, tên đường)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
              />
            </div>
            <textarea
              rows={3}
              value={form.note}
              onChange={event => setForm({ ...form, note: event.target.value })}
              placeholder="Ghi chú"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
            />
            <button
              type="submit"
              disabled={!formValid || submitting}
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
