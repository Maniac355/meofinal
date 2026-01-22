export function normalizeOrderItemsForEdit(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (item?.product_id) {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      return {
        ...item,
        product_id: String(item.product_id),
        quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * quantity
      };
    }
    if (item?.id) {
      const quantity = Number(item.q || 0);
      const unitPrice = Number(item.p || 0);
      return {
        product_id: String(item.id),
        quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * quantity
      };
    }
    return null;
  }).filter(Boolean);
}
