/**
 * Viettel Post Proxy API (Google Apps Script)
 * - GET  ?action=ping
 * - POST ?action=track  body: { "orderCode": "..." }
 *
 * Script Properties (required for dynamic token):
 * - VTP_USERNAME
 * - VTP_PASSWORD
 * Optional:
 * - VTP_API_BASE (default: https://partner.viettelpost.vn)
 */

function doGet(e) {
  var action = getAction_(e);

  if (action === "ping") {
    return json_(200, { ok: true, message: "VTP proxy running" });
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
    return handleWebhook_(e);
  }

  var body = parseJsonBody_(e);
  var orderCode = toTrimmedString_(body.orderCode);

  if (!orderCode) {
    return json_(400, { ok: false, message: 'Missing orderCode' });
  }

  var upstream = registerOrderHook_(orderCode, body.message);

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

function getStoredToken_() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('VTP_OWNER_TOKEN');
  if (!token) return null;

  var exp = getStoredTokenExp_();
  if (!exp) {
    exp = getJwtExp_(token);
    if (exp) {
      setStoredTokenExp_(exp);
    }
  }

  if (exp && isExpired_(exp)) {
    clearStoredToken_();
    return null;
  }

  return token;
}

function storeToken_(token, expSeconds) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('VTP_OWNER_TOKEN', token);
  var exp = expSeconds || getJwtExp_(token) || fallbackExp_();
  setStoredTokenExp_(exp);
}

function getStoredTokenExp_() {
  var value = PropertiesService.getScriptProperties().getProperty('VTP_OWNER_TOKEN_EXP');
  if (!value) return null;
  var exp = Number(value);
  return Number.isFinite(exp) ? exp : null;
}

function setStoredTokenExp_(expSeconds) {
  if (!expSeconds) return;
  PropertiesService.getScriptProperties().setProperty('VTP_OWNER_TOKEN_EXP', String(expSeconds));
}

function clearStoredToken_() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('VTP_OWNER_TOKEN');
  props.deleteProperty('VTP_OWNER_TOKEN_EXP');
}

function isExpired_(expSeconds) {
  var now = Math.floor(Date.now() / 1000);
  return now >= (expSeconds - 60);
}

function fallbackExp_() {
  var now = Math.floor(Date.now() / 1000);
  return now + (20 * 60 * 60);
}

function getVtpApiBase_() {
  return PropertiesService.getScriptProperties().getProperty('VTP_API_BASE') || 'https://partner.viettelpost.vn';
}

function getLoginToken_() {
  var username = PropertiesService.getScriptProperties().getProperty('VTP_USERNAME');
  var password = PropertiesService.getScriptProperties().getProperty('VTP_PASSWORD');

  if (!username || !password) {
    return { ok: false, message: 'Missing VTP_USERNAME or VTP_PASSWORD in Script Properties' };
  }

  var url = getVtpApiBase_() + '/v2/user/Login';
  var payload = JSON.stringify({ USERNAME: username, PASSWORD: password });

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true,
    });

    var parsed = parseApiResponse_(res);
    if (!parsed.ok) {
      Logger.log('VTP login failed: %s', parsed.text);
      return { ok: false, message: 'VTP login failed', status: parsed.status, data: parsed.data };
    }

    var tokenInfo = extractTokenInfo_(parsed.data);
    var token = tokenInfo.token;
    if (!token) {
      Logger.log('VTP login response missing token: %s', parsed.text);
      return { ok: false, message: 'VTP login response missing token', status: parsed.status, data: parsed.data };
    }

    return { ok: true, token: token, exp: tokenInfo.exp };
  } catch (err) {
    Logger.log('VTP login error: %s', String(err));
    return { ok: false, message: 'Failed to reach Viettel Post login', error: String(err) };
  }
}

function getOwnerToken_(loginToken) {
  var username = PropertiesService.getScriptProperties().getProperty('VTP_USERNAME');
  var password = PropertiesService.getScriptProperties().getProperty('VTP_PASSWORD');

  if (!username || !password) {
    return { ok: false, message: 'Missing VTP_USERNAME or VTP_PASSWORD in Script Properties' };
  }

  var url = getVtpApiBase_() + '/v2/user/ownerconnect';
  var payload = JSON.stringify({ USERNAME: username, PASSWORD: password });

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Token: loginToken },
      payload: payload,
      muteHttpExceptions: true,
    });

    var parsed = parseApiResponse_(res);
    if (!parsed.ok) {
      Logger.log('VTP ownerconnect failed: %s', parsed.text);
      return { ok: false, message: 'VTP ownerconnect failed', status: parsed.status, data: parsed.data };
    }

    var tokenInfo = extractTokenInfo_(parsed.data);
    var token = tokenInfo.token;
    if (!token) {
      Logger.log('VTP ownerconnect response missing token: %s', parsed.text);
      return { ok: false, message: 'VTP ownerconnect response missing token', status: parsed.status, data: parsed.data };
    }

    return { ok: true, token: token, exp: tokenInfo.exp };
  } catch (err) {
    Logger.log('VTP ownerconnect error: %s', String(err));
    return { ok: false, message: 'Failed to reach Viettel Post ownerconnect', error: String(err) };
  }
}

function getToken_() {
  var stored = getStoredToken_();
  if (stored) return stored;

  var login = getLoginToken_();
  if (!login.ok) {
    return null;
  }
  var owner = getOwnerToken_(login.token);
  if (!owner.ok) {
    return null;
  }
  storeToken_(owner.token, owner.exp);
  return owner.token;
}

function registerOrderHook_(orderCode, message) {
  var token = getToken_();
  if (!token) {
    return { ok: false, status: 500, message: 'Unable to obtain VTP token' };
  }

  var upstream = callViettelPostRegisterHook_(token, orderCode, message);
  if (upstream.ok || !isTokenInvalid_(upstream)) {
    return upstream;
  }

  Logger.log('VTP token invalid, refreshing and retrying once.');
  clearStoredToken_();
  var login = getLoginToken_();
  if (!login.ok) {
    return upstream;
  }
  var owner = getOwnerToken_(login.token);
  if (!owner.ok) {
    return upstream;
  }
  storeToken_(owner.token, owner.exp);

  return callViettelPostRegisterHook_(owner.token, orderCode, message);
}

function isTokenInvalid_(upstream) {
  if (!upstream) return false;
  if (upstream.status === 401 || upstream.status === 403) return true;

  var data = upstream.data || {};
  var statusCode = Number(data.status);
  if (statusCode === 204 || statusCode === 205) return true;

  var message = String(data.message || data.msg || data.error || '').toLowerCase();
  return message.includes('token') && (message.includes('expired') || message.includes('invalid'));
}

function callViettelPostRegisterHook_(token, orderCode, message) {
  var url = getVtpApiBase_() + '/v2/order/registerOrderHook';
  var params = '?oid=' + encodeURIComponent(orderCode) + '&mes=' + encodeURIComponent(message || 'register');

  var res;
  try {
    res = UrlFetchApp.fetch(url + params, {
      method: 'get',
      headers: { Token: token },
      muteHttpExceptions: true,
    });
  } catch (err) {
    Logger.log('VTP register hook error: %s', String(err));
    return {
      ok: false,
      status: 502,
      message: 'Failed to reach Viettel Post',
      error: String(err),
    };
  }

  return parseApiResponse_(res);
}

function parseApiResponse_(res) {
  var status = res.getResponseCode();
  var text = res.getContentText();
  var data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    data = { raw: text };
  }

  var ok = status >= 200 && status < 300;
  if (ok && data && typeof data.status !== 'undefined') {
    ok = Number(data.status) === 200;
  }

  return { ok: ok, status: status, data: data, text: text };
}

function extractTokenInfo_(data) {
  var token = data && (data.token || data.Token || (data.data && (data.data.token || data.data.Token)));
  var exp = null;

  if (data && data.expired) {
    var expMs = Number(data.expired);
    if (Number.isFinite(expMs) && expMs > 0) {
      exp = Math.floor(expMs / 1000);
    }
  } else if (data && data.data && data.data.expired) {
    var expMsNested = Number(data.data.expired);
    if (Number.isFinite(expMsNested) && expMsNested > 0) {
      exp = Math.floor(expMsNested / 1000);
    }
  }

  if (!exp && token) {
    exp = getJwtExp_(token);
  }

  return { token: token, exp: exp };
}

function handleWebhook_(e) {
  var payload = parseJsonBody_(e);
  var orderNumber = toTrimmedString_(payload.ORDER_NUMBER || payload.order_number || payload.orderCode);
  var orderStatus = payload.ORDER_STATUS;

  if (!orderNumber || typeof orderStatus === 'undefined') {
    return json_(400, { ok: false, message: 'Missing ORDER_NUMBER or ORDER_STATUS' });
  }

  if (isEndState_(orderStatus)) {
    Logger.log('VTP webhook received end state %s for %s; skipping update.', orderStatus, orderNumber);
    return json_(200, { ok: true, message: 'End state received; no update applied.' });
  }

  var shippingStatus = mapShippingStatus_(orderStatus);
  if (!shippingStatus) {
    Logger.log('VTP webhook status %s not mapped; skipping update.', orderStatus);
    return json_(200, { ok: true, message: 'Status not mapped; no update applied.' });
  }

  var updated = updateOrderShipping_(orderNumber, shippingStatus);
  if (!updated) {
    return json_(404, { ok: false, message: 'Order not found for ORDER_NUMBER' });
  }

  return json_(200, { ok: true, message: 'Order updated', orderNumber: orderNumber, shipping_status: shippingStatus });
}

function updateOrderShipping_(orderNumber, shippingStatus) {
  var sheet = getOrdersSheet_();
  if (!sheet) {
    Logger.log('Orders sheet not found.');
    return false;
  }

  var data = sheet.getDataRange().getValues();
  if (!data.length) return false;

  var headers = data[0];
  var vtpIndex = headers.indexOf('vtp_order_code');
  var shippingIndex = headers.indexOf('shipping_status');

  if (vtpIndex === -1 || shippingIndex === -1) {
    Logger.log('Orders sheet missing vtp_order_code or shipping_status column.');
    return false;
  }

  for (var i = 1; i < data.length; i += 1) {
    if (String(data[i][vtpIndex]).trim() === String(orderNumber)) {
      sheet.getRange(i + 1, shippingIndex + 1).setValue(shippingStatus);
      return true;
    }
  }

  return false;
}

function getOrdersSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return null;
  return ss.getSheetByName('Orders');
}

function mapShippingStatus_(orderStatus) {
  var status = Number(orderStatus);
  if (status === 501) return 'DA_GIAO';

  var inProgress = [
    -100, 100, 102, 103, 104, -108, -109, -110, 105,
    200, 202, 300, 320, 400, 500, 506, 570, 508, 509, 550
  ];

  if (inProgress.indexOf(status) !== -1) return 'DANG_GIAO';

  return 'VIETTEL_POST';
}

function isEndState_(orderStatus) {
  var status = Number(orderStatus);
  var endStates = [501, 503, 504, 201, 107, -15];
  return endStates.indexOf(status) !== -1;
}

function setupConfig_(username, password) {
  var props = PropertiesService.getScriptProperties();
  if (username) props.setProperty('VTP_USERNAME', username);
  if (password) props.setProperty('VTP_PASSWORD', password);
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
