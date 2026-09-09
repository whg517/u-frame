import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { setActiveLanguage } from "./shared/i18n/i18n";
import { applyPreferences, readPreferences } from "./shared/preferences/preferences";
import { applyStartupRoute } from "./shared/preferences/startup-route";

const initialPreferences = readPreferences();
setActiveLanguage(initialPreferences.language);
applyPreferences(
  initialPreferences,
  window.matchMedia("(prefers-color-scheme: dark)").matches,
);
applyStartupRoute(initialPreferences.defaultStartupPage);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
