import { useState } from "react";
import PaymentBadge from "../components/PaymentBadge";
import ShippingBadge from "../components/ShippingBadge";
import {
  ConfirmModal,
  CustomerModal,
  MatchOrderModal,
  OrderDetailModal,
  OrderModal,
  ProductModal,
  TransactionsModal
} from "../components/modals";
import formatCurrency from "../utils/formatCurrency";
import calculatePaymentStatus from "../utils/paymentStatus";
import {
  ORDER_SORT_OPTIONS,
  PAYMENT_OPTIONS,
  SHIPPING_FEE_OPTIONS,
  SHIPPING_OPTIONS
} from "../constants";
import {
  IconBanknotes,
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
  IconRefresh,
  IconSearch,
  IconSort,
  IconSun,
  IconTrash,
  IconTruck,
  IconUsers,
  IconX
} from "../components/Icons";

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

export default function AdminDashboard({
  lastSync,
  darkMode,
  setDarkMode,
  handleManualSync,
  syncing,
  tab,
  setTab,
  search,
  setSearch,
  newOrdersCount,
  setNewOrdersCount,
  stats,
  orders,
  customers,
  products,
  transactions,
  filteredOrders,
  filteredCustomers,
  filteredProducts,
  filterPayment,
  setFilterPayment,
  filterShipping,
  setFilterShipping,
  filterShippingFee,
  setFilterShippingFee,
  orderSort,
  setOrderSort,
  hasFilters,
  sepaySearch,
  setSepaySearch,
  sepayDateFrom,
  setSepayDateFrom,
  sepayDateTo,
  setSepayDateTo,
  sepayAmountMin,
  setSepayAmountMin,
  sepayAmountMax,
  setSepayAmountMax,
  sepaySortOrder,
  setSepaySortOrder,
  hasSepayFilters,
  filteredTransactions,
  showCustomer,
  setShowCustomer,
  editCustomer,
  setEditCustomer,
  showProduct,
  setShowProduct,
  editProduct,
  setEditProduct,
  showOrder,
  setShowOrder,
  selectedOrder,
  setSelectedOrder,
  showTx,
  setShowTx,
  deleteConfirm,
  setDeleteConfirm,
  matchingTx,
  setMatchingTx,
  saveCustomer,
  saveProduct,
  createOrder,
  updateOrder,
  deleteOrder,
  deleteCustomer,
  deleteProduct,
  handleMatchOrder,
  handleUnmatchTransaction,
  saveTransaction,
  markOrderDelivered,
  onNavigateOrder
}) {
  const tabs = [
    { id: "orders", label: "Đơn hàng", icon: IconClipboard, count: orders.length },
    { id: "customers", label: "Khách hàng", icon: IconUsers, count: customers.length },
    { id: "products", label: "Sản phẩm", icon: IconPackage, count: products.length },
    { id: "sepay", label: "SePay", icon: IconBanknotes, count: transactions.length },
  ];

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
              <button
                onClick={onNavigateOrder}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-all bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300"
              >
                <IconPackage className="w-4 h-4" />
                <span className="font-medium">Giao diện khách</span>
              </button>
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
