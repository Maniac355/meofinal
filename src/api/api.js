export const getAPI = async (baseUrl, action) => {
  try {
    const params = new URLSearchParams({ action });
    return await fetch(`${baseUrl}?${params.toString()}`);
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
};

const normalizeAction = action => {
  if (action.startsWith("upsert_")) {
    return action.replace("upsert_", "save_");
  }
  return action;
};

const buildPayload = (action, payload = {}) => {
  switch (action) {
    case "save_customer":
      return { customer: payload.data ?? payload.customer ?? payload };
    case "delete_customer":
      return { customer_id: payload.customer_id ?? payload.id };
    case "save_product":
      return { product: payload.data ?? payload.product ?? payload };
    case "delete_product":
      return { product_id: payload.product_id ?? payload.id };
    case "save_order":
      return { order: payload.data ?? payload.order ?? payload };
    case "delete_order":
      return { order_id: payload.order_id ?? payload.id };
    case "save_transaction":
      return { transaction: payload.transaction ?? payload };
    case "delete_transaction":
      return { transaction_id: payload.transaction_id ?? payload.id };
    default:
      return payload;
  }
};

export const postAPI = async (baseUrl, action, payload) => {
  const normalizedAction = normalizeAction(action);
  const body = { action: normalizedAction, ...buildPayload(normalizedAction, payload) };
  try {
    return await fetch(baseUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.warn("POST request failed, falling back to GET.", error);
    try {
      const params = new URLSearchParams({
        action: normalizedAction,
        data: JSON.stringify(body)
      });
      return await fetch(`${baseUrl}?${params.toString()}`);
    } catch (fallbackError) {
      console.error("API error:", fallbackError);
    }
  }
};
