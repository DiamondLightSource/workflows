import { RelayEnvironmentProvider } from "react-relay";
import { RelayEnvironment } from "./RelayEnvironment";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./routes/Dashboard.tsx";
import WorkflowsSelect from "./routes/workflows.tsx";
import TemplatesList from "./routes/TemplatesList.tsx";
import TemplateView from "./routes/templateview.tsx";
import WorkflowsList from "./routes/workflowslist.tsx";
import WorkflowView from "./routes/workflowview.tsx";
import ErrorPage from "./errorpage.tsx";


const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
    errorElement: <ErrorPage />,
  },
  {
    path: "workflows",
    element: <WorkflowsSelect />,
  },
  {
    path: "templates",
    element: <TemplatesList />,
  },
  {
    path: "templates/:templatename",
    element: <TemplateView />,
  },
  {
    path: "workflows/:visitid",
    element: <WorkflowsList />,
  },
  {
    path: "workflows/:visitid/:workflowname",
    element: <WorkflowView />,
  },
  {
    path: "workflows/:visitid/:workflowname/:taskname",
    element: <WorkflowView />,
  },
]);

createRoot(document.getElementById("root") as Element).render(
  <RelayEnvironmentProvider environment={RelayEnvironment}>
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  </RelayEnvironmentProvider>
);
