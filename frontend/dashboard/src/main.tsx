import { RelayEnvironmentProvider } from "react-relay";
import { RelayEnvironment } from "./RelayEnvironment";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider
} from "react-router-dom";
import App from "./App.tsx";
import WorkflowsList from "./routes/workflows.tsx";
import ErrorPage from "./errorpage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />
  },
  {
    path: "workflows",
    element: <WorkflowsList />
  }
]);

createRoot(document.getElementById("root") as Element).render(
  <RelayEnvironmentProvider environment={RelayEnvironment}>
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  </RelayEnvironmentProvider>
);
