import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerOrder from "./pages/CustomerOrder";
import { getAPI, postAPI } from "./api/api";
import calculatePaymentStatus from "./utils/paymentStatus";
import {
  DB_API_URL,
  SEPAY_API_URL
} from "./constants";
import { IconRefresh } from "./components/Icons";
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

// ============ SYNC CONFIG ============
const SYNC_INTERVAL = 10000; // 10 seconds
const SEPAY_INTERVAL = 15000; // 15 seconds

// ============ MAIN APP ============
export default function App() {
  const [route, setRoute] = useState(() => window.location.pathname || "/order");
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

  const navigate = useCallback((path, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    setRoute(path);
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname || "/order");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (route === "/" || !route) {
      navigate("/order", { replace: true });
    }
  }, [route, navigate]);

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
    return newOrder;
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

  const isAdminRoute = (route || "").startsWith("/admin");

  if (isAdminRoute) {
    return (
      <AdminDashboard
        lastSync={lastSync}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        handleManualSync={handleManualSync}
        syncing={syncing}
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        newOrdersCount={newOrdersCount}
        setNewOrdersCount={setNewOrdersCount}
        stats={stats}
        orders={orders}
        customers={customers}
        products={products}
        transactions={transactions}
        filteredOrders={filteredOrders}
        filteredCustomers={filteredCustomers}
        filteredProducts={filteredProducts}
        filterPayment={filterPayment}
        setFilterPayment={setFilterPayment}
        filterShipping={filterShipping}
        setFilterShipping={setFilterShipping}
        filterShippingFee={filterShippingFee}
        setFilterShippingFee={setFilterShippingFee}
        orderSort={orderSort}
        setOrderSort={setOrderSort}
        hasFilters={hasFilters}
        sepaySearch={sepaySearch}
        setSepaySearch={setSepaySearch}
        sepayDateFrom={sepayDateFrom}
        setSepayDateFrom={setSepayDateFrom}
        sepayDateTo={sepayDateTo}
        setSepayDateTo={setSepayDateTo}
        sepayAmountMin={sepayAmountMin}
        setSepayAmountMin={setSepayAmountMin}
        sepayAmountMax={sepayAmountMax}
        setSepayAmountMax={setSepayAmountMax}
        sepaySortOrder={sepaySortOrder}
        setSepaySortOrder={setSepaySortOrder}
        hasSepayFilters={hasSepayFilters}
        filteredTransactions={filteredTransactions}
        showCustomer={showCustomer}
        setShowCustomer={setShowCustomer}
        editCustomer={editCustomer}
        setEditCustomer={setEditCustomer}
        showProduct={showProduct}
        setShowProduct={setShowProduct}
        editProduct={editProduct}
        setEditProduct={setEditProduct}
        showOrder={showOrder}
        setShowOrder={setShowOrder}
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        showTx={showTx}
        setShowTx={setShowTx}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        matchingTx={matchingTx}
        setMatchingTx={setMatchingTx}
        saveCustomer={saveCustomer}
        saveProduct={saveProduct}
        createOrder={createOrder}
        updateOrder={updateOrder}
        deleteOrder={deleteOrder}
        handleMatchOrder={handleMatchOrder}
        handleUnmatchTransaction={handleUnmatchTransaction}
        saveTransaction={saveTransaction}
        markOrderDelivered={markOrderDelivered}
        deleteCustomer={deleteCustomer}
        deleteProduct={deleteProduct}
        onNavigateOrder={() => navigate("/order")}
      />
    );
  }

  return (
    <CustomerOrder
      products={products}
      onCreateOrder={createOrder}
      onNavigateAdmin={() => navigate("/admin")}
    />
  );
}
