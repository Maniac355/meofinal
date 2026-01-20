import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PaymentBadge from "./components/PaymentBadge";
import ShippingBadge from "./components/ShippingBadge";
import {
  ConfirmModal,
  CustomerModal,
  MatchOrderModal,
  OrderDetailModal,
  OrderModal,
  ProductModal,
  TransactionsModal
} from "./components/modals";
import { getAPI, postAPI } from "./api/api";
import formatCurrency from "./utils/formatCurrency";
import calculatePaymentStatus from "./utils/paymentStatus";
import {
  DB_API_URL,
  ORDER_SORT_OPTIONS,
  PAYMENT_OPTIONS,
  SEPAY_API_URL,
  SHIPPING_FEE_OPTIONS,
  SHIPPING_OPTIONS
} from "./constants";
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
} from "./components/Icons";
import { generateId } from "./utils/ids";
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
