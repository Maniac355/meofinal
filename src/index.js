import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
// This app relies on always-fresh data from Google Sheets.
// Disabling the service worker avoids stale caches and prevents
// registration errors on hosts that don't serve service-worker.js.
serviceWorkerRegistration.unregister();
