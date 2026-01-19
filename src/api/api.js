export const getAPI = async (baseUrl, action) => {
  try {
    const params = new URLSearchParams({ action });
    return await fetch(`${baseUrl}?${params.toString()}`);
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
};

export const postAPI = async (baseUrl, action, payload) => {
  try {
    return await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data: JSON.stringify(payload) })
    });
  } catch (error) {
    console.error("API error:", error);
  }
};
