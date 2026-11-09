import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./index.css";
import { initI18n } from "./i18n";
import { routes } from "./routes/routes";

initI18n();
const router = createBrowserRouter(routes);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element "#root" not found in index.html');
}
createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
