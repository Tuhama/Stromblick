import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./index.css";
import { createQueryClient } from "./api/query-client";
import { initI18n } from "./i18n";
import { routes } from "./routes/routes";

initI18n();
const router = createBrowserRouter(routes);
const queryClient = createQueryClient();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element "#root" not found in index.html');
}
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
