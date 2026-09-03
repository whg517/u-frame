import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const colorScheme = window.matchMedia("(prefers-color-scheme: dark)")
const applyTheme = ({ matches }: Pick<MediaQueryList, "matches">) => {
  document.documentElement.classList.toggle("dark", matches)
}
applyTheme(colorScheme)
colorScheme.addEventListener("change", applyTheme)

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
