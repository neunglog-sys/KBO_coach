import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../styles.css";
import "./theme.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.getElementById("app-startup-cover")?.classList.add("is-ready");
    window.dispatchEvent(new Event("app:first-paint"));
  });
});
