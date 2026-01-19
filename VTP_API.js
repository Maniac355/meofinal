/**
 * ĐÂY LÀ APPSCRIPT LẤY TOKEN CỦA VIETTEL POST ĐỂ SỬ DỤNG
 * Viettel Post Proxy API (Google Apps Script)
 * - GET  ?action=ping
 * - POST ?action=track  body: { "orderCode": "..." }
 */

function doGet(e) {
  var action = getAction_(e);

  if (action === "ping") {
    return json_(200, { ok: true, message: "VTP proxy running" });
  }

  if (action === "token_status") {
    var token = getVtpToken_();
    if (!token) return json_(200, { ok: true, hasToken: false });

    var exp = getJwtExp_(token);
    if (!exp) return json_(200, { ok: true, hasToken: true, exp: null, secondsLeft: null });

    var now = Math.floor(Date.now() / 1000);
    var secondsLeft = Math.max(0, exp - now);

    return json_(200, { ok: true, hasToken: true, exp: exp, secondsLeft: secondsLeft });
  }

  return json_(404, { ok: false, message: "Unknown action" });
}

function getJwtExp_(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";

    const json = Utilities.newBlob(
      Utilities.base64Decode(payload)
    ).getDataAsString();

    const obj = JSON.parse(json);
    return obj?.exp || null;
  } catch {
    return null;
  }
}


function doPost(e) {
  var action = getAction_(e);
  if (action !== 'track') {
    return json_(400, { ok: false, message: 'Invalid action. Use POST ?action=track' });
  }

  var body = parseJsonBody_(e);
  var orderCode = toTrimmedString_(body.orderCode);

  if (!orderCode) {
    return json_(400, { ok: false, message: 'Missing orderCode' });
  }

  var token = getVtpToken_();
  if (!token) {
    return json_(500, { ok: false, message: 'Missing VTP_TOKEN in Script Properties' });
  }

  var upstream = callViettelPostGetOrderStatus_(token, orderCode);

  // upstream = { status, ok, data }
  return json_(upstream.status, upstream);
}

/* -------------------------- Helpers -------------------------- */

function getAction_(e) {
  if (!e || !e.parameter) return '';
  return String(e.parameter.action || '').trim().toLowerCase();
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function toTrimmedString_(value) {
  return String(value || '').trim();
}

function getVtpToken_() {
  return PropertiesService.getScriptProperties().getProperty('VTP_TOKEN');
}

function callViettelPostGetOrderStatus_(token, orderCode) {
  var url = 'https://partner.viettelpost.vn/v2/order/getOrderStatus';
  var payload = JSON.stringify({ orderCode: orderCode });

  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Token: token },
      payload: payload,
      muteHttpExceptions: true,
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      message: 'Failed to reach Viettel Post',
      error: String(err),
    };
  }

  var status = res.getResponseCode();
  var text = res.getContentText();

  var data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    data = { raw: text };
  }

  return {
    ok: status >= 200 && status < 300,
    status: status,
    data: data,
  };
}

function json_(status, obj) {
  // Note: Google Apps Script Web App often doesn’t let you set headers freely.
  // But adding these is still helpful in many cases.
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);

  // Best-effort CORS (may be ignored in some deployments)
  try {
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  } catch (err) {}

  return output;
}

/**
 * Optional: some browsers send preflight OPTIONS.
 * Apps Script doesn’t officially support doOptions in all modes,
 * but keeping it here doesn’t hurt.
 */
function doOptions() {
  return json_(200, { ok: true });
}

//https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLiU5r4oE3eUAIcYeR-OXq41CWFogzZ35-3ycLhbYKuxWAWcl2lSwNjhsfnzn-0ClRZpzohBypBVstg-DaHFRI5zLsrWYOWl18lP4laB2tlKI6wRT5H7S6uoqSEYUo5Wk3V-qXUE7_C5KHXt47qCt_1BvNDGg8IR_xuW9EQsVVvARmMm5NnMzOS-0qC1frwSza-FCgX9GdwJe-aDq0r0GhdWjLbTf3ZJJzTuoiRP2b1-EtU_HvlPGQ4I6qcN39dfT7joR4LaEX50JOwB1QzgMmdtVG4T043SmRrxP6WdPqjCAO9xAN8Ef-tuFb43nA&lib=MBLzJzNuj5j7zoBIqz9soeyG4CLBIxOvz
