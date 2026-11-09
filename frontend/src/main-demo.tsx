/*
 * Entry point for `npm run build:demo` (see demo.html).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import DemoApp from "./app/dev/DemoApp.tsx";
import "./i18n.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>,
);
