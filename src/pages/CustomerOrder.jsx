import { useEffect, useMemo, useRef, useState } from "react";
import formatCurrency from "../utils/formatCurrency";
import { generateId } from "../utils/ids";
import { includesSearchValue, normalizeSearchValue } from "../utils/search";
import { IconCheck, IconPackage, IconSearch } from "../components/Icons";
import SearchableCombobox from "../components/SearchableCombobox";
import legacyProvinces from "../data/legacy_tinh_tp.json";
import legacyDistricts from "../data/legacy_quan_huyen.json";
import legacyWards from "../data/legacy_xa_phuong.json";
import newProvinces from "../data/new_tinh_tp.json";
import newDistricts from "../data/new_quan_huyen.json";
import newWards from "../data/new_xa_phuong.json";

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
  const [addressMode, setAddressMode] = useState("new");
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [wardId, setWardId] = useState("");
  const [provinceInput, setProvinceInput] = useState("");
  const [districtInput, setDistrictInput] = useState("");
  const [wardInput, setWardInput] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const previousSelectionRef = useRef(null);

  const isLegacyMode = addressMode === "old";

  const activeProducts = useMemo(
    () => products.filter(p => p.is_active === true || p.is_active === "TRUE"),
    [products]
  );
  const productQuery = normalizeSearchValue(productSearch);
  const filteredProducts = activeProducts.filter(p => includesSearchValue(p.product_name, productQuery));
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const isValid = items.length > 0 && form.full_name.trim() && form.phone_number.trim();

  const addressLoading = false;

  const legacyProvinceList = useMemo(() => (
    Object.values(legacyProvinces).map(p => ({
      value: p.code,
      label: p.name_with_type || p.name
    })).sort((a, b) => a.label.localeCompare(b.label, "vi"))
  ), []);

  const legacyDistrictList = useMemo(() => (
    Object.values(legacyDistricts)
      .filter(d => d.parent_code === provinceId)
      .map(d => ({ value: d.code, label: d.name_with_type || d.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"))
  ), [provinceId]);

  const legacyWardList = useMemo(() => (
    Object.values(legacyWards)
      .filter(w => w.parent_code === districtId)
      .map(w => ({ value: w.code, label: w.name_with_type || w.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"))
  ), [districtId]);

  const newProvinceList = useMemo(() => (
    Object.values(newProvinces).map(p => ({
      value: p.code,
      label: p.name_with_type || p.name
    })).sort((a, b) => a.label.localeCompare(b.label, "vi"))
  ), []);

  const newDistrictList = useMemo(() => (
    Object.values(newDistricts)
      .filter(d => d.parent_code === provinceId)
      .map(d => ({ value: d.code, label: d.name_with_type || d.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"))
  ), [provinceId]);

  const newWardList = useMemo(() => (
    Object.values(newWards)
      .filter(w => w.parent_code === districtId)
      .map(w => ({ value: w.code, label: w.name_with_type || w.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"))
  ), [districtId]);

  const provinceOptions = isLegacyMode ? legacyProvinceList : newProvinceList;
  const districtOptions = isLegacyMode ? legacyDistrictList : newDistrictList;
  const wardOptions = isLegacyMode ? legacyWardList : newWardList;

  const selectedProvinceName = provinceOptions.find(p => p.value === provinceId)?.label;
  const selectedDistrictName = districtOptions.find(d => d.value === districtId)?.label;
  const selectedWardName = wardOptions.find(w => w.value === wardId)?.label;

  const builtAddress = [addressDetail, selectedWardName, selectedDistrictName, selectedProvinceName]
    .filter(Boolean)
    .join(", ");
  const shippingAddress = builtAddress;

  const addressValid = Boolean(provinceId && districtId && wardId);
  const formValid = isValid && addressValid;

  const provinceError = showAddressErrors && !provinceId
    ? "Vui lòng chọn Tỉnh/TP"
    : "";
  const districtError = showAddressErrors && provinceId && !districtId
    ? "Vui lòng chọn Quận/Huyện"
    : "";
  const wardError = showAddressErrors && districtId && !wardId
    ? "Vui lòng chọn Phường/Xã"
    : "";

  // TODO: populate mapping tables when old/new datasets are integrated.
  const mappingOldToNew = useMemo(() => ({
    provinces: {},
    districts: {},
    wards: {}
  }), []);

  const mappingNewToOld = useMemo(() => ({
    provinces: {},
    districts: {},
    wards: {}
  }), []);

  const findNewPathByWardId = (targetWardId) => {
    const ward = newWards[targetWardId];
    if (!ward) return null;
    const district = newDistricts[ward.parent_code];
    if (!district) return null;
    return {
      provinceId: district.parent_code,
      districtId: ward.parent_code,
      wardId: targetWardId
    };
  };

  const findNewPathByDistrictId = (targetDistrictId) => {
    const district = newDistricts[targetDistrictId];
    if (!district) return null;
    return {
      provinceId: district.parent_code,
      districtId: targetDistrictId,
      wardId: ""
    };
  };

  const findOldPathByWardId = (targetWardId) => {
    const ward = legacyWards[targetWardId];
    if (!ward) return null;
    const district = legacyDistricts[ward.parent_code];
    if (!district) return null;
    return {
      provinceId: district.parent_code,
      districtId: ward.parent_code,
      wardId: targetWardId
    };
  };

  const findOldPathByDistrictId = (targetDistrictId) => {
    const district = legacyDistricts[targetDistrictId];
    if (!district) return null;
    return {
      provinceId: district.parent_code,
      districtId: targetDistrictId,
      wardId: ""
    };
  };

  const applyMappedSelection = (fromSelection) => {
    if (!fromSelection) return;
    const { mode, provinceId: prevProvinceId, districtId: prevDistrictId, wardId: prevWardId } = fromSelection;
    const movingToLegacy = addressMode === "old";
    const mapping = movingToLegacy ? mappingNewToOld : mappingOldToNew;

    let nextPath = null;
    if (prevWardId && mapping.wards?.[prevWardId]) {
      const mappedWardId = mapping.wards[prevWardId];
      nextPath = movingToLegacy ? findOldPathByWardId(mappedWardId) : findNewPathByWardId(mappedWardId);
    } else if (prevDistrictId && mapping.districts?.[prevDistrictId]) {
      const mappedDistrictId = mapping.districts[prevDistrictId];
      nextPath = movingToLegacy ? findOldPathByDistrictId(mappedDistrictId) : findNewPathByDistrictId(mappedDistrictId);
    } else if (prevProvinceId && mapping.provinces?.[prevProvinceId]) {
      nextPath = {
        provinceId: mapping.provinces[prevProvinceId],
        districtId: "",
        wardId: ""
      };
    }

    if (!nextPath) {
      setProvinceId("");
      setDistrictId("");
      setWardId("");
      setProvinceInput("");
      setDistrictInput("");
      setWardInput("");
      return;
    }

    setProvinceId(nextPath.provinceId || "");
    setDistrictId(nextPath.districtId || "");
    setWardId(nextPath.wardId || "");
    const nextProvinceLabel = movingToLegacy
      ? legacyProvinces[nextPath.provinceId]?.name_with_type || legacyProvinces[nextPath.provinceId]?.name || ""
      : newProvinces[nextPath.provinceId]?.name_with_type || newProvinces[nextPath.provinceId]?.name || "";
    const nextDistrictLabel = movingToLegacy
      ? legacyDistricts[nextPath.districtId]?.name_with_type || legacyDistricts[nextPath.districtId]?.name || ""
      : newDistricts[nextPath.districtId]?.name_with_type || newDistricts[nextPath.districtId]?.name || "";
    const nextWardLabel = movingToLegacy
      ? legacyWards[nextPath.wardId]?.name_with_type || legacyWards[nextPath.wardId]?.name || ""
      : newWards[nextPath.wardId]?.name_with_type || newWards[nextPath.wardId]?.name || "";
    setProvinceInput(nextProvinceLabel);
    setDistrictInput(nextDistrictLabel);
    setWardInput(nextWardLabel);
  };

  const handleModeToggle = (checked) => {
    const nextMode = checked ? "old" : "new";
    if (nextMode === addressMode) return;
    previousSelectionRef.current = {
      mode: addressMode,
      provinceId,
      districtId,
      wardId
    };
    setShowAddressErrors(false);
    setAddressMode(nextMode);
  };

  useEffect(() => {
    if (!previousSelectionRef.current) return;
    applyMappedSelection(previousSelectionRef.current);
    previousSelectionRef.current = null;
  }, [addressMode, legacyDistrictList, legacyProvinceList, legacyWardList, newDistrictList, newProvinceList, newWardList]);

  const resetDistrictAndWard = () => {
    setDistrictId("");
    setWardId("");
    setDistrictInput("");
    setWardInput("");
  };

  const handleProvinceSelect = (nextId) => {
    setProvinceId(nextId);
    setProvinceInput(provinceOptions.find(option => option.value === nextId)?.label || "");
    resetDistrictAndWard();
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
  };

  const handleDistrictInput = (value, meta) => {
    setDistrictInput(value);
    if (meta?.fromSelection) return;
    if (districtId) setDistrictId("");
    setWardId("");
    setWardInput("");
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
                checked={isLegacyMode}
                onChange={event => handleModeToggle(event.target.checked)}
                className="w-4 h-4"
              />
              Dùng địa chỉ trước sáp nhập
            </label>
            <div className="space-y-3">
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
                disabled={addressLoading}
                loading={addressLoading}
                error={provinceError}
                onBlur={() => setShowAddressErrors(true)}
              />
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
                disabled={!provinceId || addressLoading}
                loading={addressLoading}
                error={districtError}
                onBlur={() => setShowAddressErrors(true)}
              />
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
                disabled={!districtId || addressLoading}
                loading={addressLoading}
                error={wardError}
                onBlur={() => setShowAddressErrors(true)}
              />
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
