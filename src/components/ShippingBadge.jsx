const ShippingBadge = ({ status }) => {
  const config = {
    CHUA_GIAO: { label: "Chưa giao", bg: "bg-red-50", text: "text-red-700" },
    DANG_GIAO: { label: "Đang giao", bg: "bg-blue-50", text: "text-blue-700" },
    VIETTEL_POST: { label: "Viettel Post", bg: "bg-orange-50", text: "text-orange-700" },
    DA_GIAO: { label: "Đã giao", bg: "bg-emerald-50", text: "text-emerald-700" },
  }[status] || { label: status || "Chưa giao", bg: "bg-red-50", text: "text-red-700" };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default ShippingBadge;
