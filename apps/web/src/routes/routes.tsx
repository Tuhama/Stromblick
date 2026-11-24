import type { RouteObject } from "react-router";
import { ExplainPage } from "../features/explain/ExplainPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { TomorrowPage } from "../features/tomorrow/TomorrowPage";
import { AppLayout } from "../layout/AppLayout";
import { NotFoundPage } from "./NotFoundPage";
import { RouteError } from "./RouteError";

/** The app's pages. Shared by the browser router and the tests' memory router. */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        // A page that throws shows the error inside the layout, so the navigation stays usable.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: "tomorrow", element: <TomorrowPage /> },
          {
            // Loaded when the page is opened: its code would push the first load over the size budget.
            path: "explorer",
            lazy: async () => ({
              Component: (await import("../features/explorer/ExplorerPage")).ExplorerPage,
            }),
          },
          { path: "explain", element: <ExplainPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
