import { RelayEnvironmentProvider } from "react-relay";
import { RelayEnvironment } from "./RelayEnvironment";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider
} from "react-router-dom";
import Dashboard from "./components/dashboard.tsx";
import WorkflowsList from "./routes/workflows.tsx";
import TemplatesList from "./routes/templates.tsx";
import ErrorPage from "./errorpage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
    errorElement: <ErrorPage />
  },
  {
    path: "workflows",
    element: <WorkflowsList />
  },
  {
    path: "templates",
    element: <TemplatesList />
  }
]);

createRoot(document.getElementById("root") as Element).render(
  <RelayEnvironmentProvider environment={RelayEnvironment}>
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  </RelayEnvironmentProvider>
);
