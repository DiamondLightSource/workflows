import { RelayEnvironmentProvider } from "react-relay";
import { RelayEnvironment } from "./RelayEnvironment";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./routes/DashboardPage";
import WorkflowsListPage from "./routes/WorkflowsListPage";
import TemplatesListPage from "./routes/TemplatesListPage";
import SingleTemplatePage from "./routes/SingleTemplatePage";
import SingleWorkflowPage from "./routes/SingleWorkflowPage";
import ErrorPage from "./ErrorPage";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
    errorElement: <ErrorPage />,
  },
  {
    path: "templates",
    element: <TemplatesListPage />,
  },
  {
    path: "templates/:templateName",
    element: <SingleTemplatePage />,
  },
  {
    path: "templates/:templateName/:prepopulate",
    element: <SingleTemplatePage />,
  },
  {
    path: "workflows",
    element: <WorkflowsListPage />,
  },
  {
    path: "workflows/:visitid",
    element: <WorkflowsListPage />,
  },
  {
    path: "workflows/:visitid/:workflowName",
    element: <SingleWorkflowPage />,
  },
  {
    path: "workflows/:visitid/:workflowName/:tasknames",
    element: <SingleWorkflowPage />,
  },
]);

createRoot(document.getElementById("root") as Element).render(
  <RelayEnvironmentProvider environment={RelayEnvironment}>
    <StrictMode>
      <ThemeProvider theme={DiamondTheme} defaultMode="light">
        <RouterProvider router={router} />
      </ThemeProvider>
    </StrictMode>
  </RelayEnvironmentProvider>,
);
