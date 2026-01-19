const normalizeText = (input) => {
  return String(input || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const contentHasOrderCode = (content, orderCode) => {
  if (!orderCode) return false;
  const code = normalizeText(orderCode);
  const tokens = normalizeText(content).split(" ");
  return tokens.includes(code);
};

const calculatePaymentStatus = (order, transactions) => {
  if (order.payment_override && order.payment_override !== "AUTO") {
    return { status: order.payment_override, received: 0, diff: 0, tip: 0 };
  }
  // Match by: 1) manually matched order_code OR 2) content contains order code
  const matching = transactions.filter(
    (t) => t.order_code === order.order_code || contentHasOrderCode(t.content, order.order_code)
  );
  const totalReceived = matching.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const orderTotal = Number(order.total_amount) || 0;
  const diff = totalReceived - orderTotal;
  const tip = diff > 0 ? diff : 0;

  if (totalReceived === 0) return { status: "CHUA_CHUYEN", received: 0, diff: 0, tip: 0 };
  if (totalReceived < orderTotal) return { status: "THIEU", received: totalReceived, diff, tip: 0 };
  if (totalReceived === orderTotal) return { status: "DU", received: totalReceived, diff: 0, tip: 0 };
  return { status: "THUA", received: totalReceived, diff, tip };
};

export default calculatePaymentStatus;
