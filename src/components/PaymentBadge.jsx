import calculatePaymentStatus from "../utils/paymentStatus";
import formatCurrency from "../utils/formatCurrency";

const PaymentBadge = ({ order, transactions }) => {
  const { status, diff } = calculatePaymentStatus(order, transactions);
  const config = {
    CHUA_CHUYEN: { label: "Chưa chuyển", bg: "bg-red-50", text: "text-red-700" },
    THIEU: { label: `Thiếu ${formatCurrency(Math.abs(diff))}`, bg: "bg-red-50", text: "text-red-700" },
    DU: { label: "Đã chuyển", bg: "bg-emerald-50", text: "text-emerald-700" },
    THUA: { label: `Tip +${formatCurrency(diff)}`, bg: "bg-pink-50", text: "text-pink-700" },
  }[status] || { label: status, bg: "bg-slate-100", text: "text-slate-600" };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default PaymentBadge;
