// First on purpose: it must run before the shared schemas are created (see the file).
import "./security/strict-csp-init";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./index.css";
import { createQueryClient } from "./api/query-client";
import { initI18n } from "./i18n";
import { readDsn } from "./observability/config";
import { startErrorReporting } from "./observability/report-error";
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

// After the first render. The Sentry code is a separate file, downloaded only when there is a DSN
// (the production build on Vercel); development and the tests never load it.
startErrorReporting({
  dsn: import.meta.env.PROD ? readDsn(import.meta.env.VITE_SENTRY_DSN) : undefined,
  load: () => import("./observability/sentry-client"),
});
