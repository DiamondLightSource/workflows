import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "relay-workflows-lib";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import { createRouterWithOverlay, NavRouteObject } from "./NavigationOverlay";
import { NotepadText, Workflow, Zap } from "lucide-react";

const routeObjects: NavRouteObject[] = [
  {
    path: "templates",
    element: <p>Templates list page</p>,
    index: true,
    icon: <NotepadText />,
  },
  {
    path: "workflows",
    element: <p>Workflows list page</p>,
    index: true,
    icon: <Workflow />,
  },
  {
    path: "triggers",
    element: <p>Triggers list page</p>,
    index: true,
    icon: <Zap />,
  },
];

async function startMockingIfConfigured() {
  if (import.meta.env.VITE_ENABLE_MOCKING === "true") {
    const { worker } = await import("../tests/browser");
    return worker.start();
  }
}

const root = createRoot(document.getElementById("root") as Element);

void startMockingIfConfigured().then(() => {
  void getRelayEnvironment().then((environment) => {
    root.render(
      <RelayEnvironmentProvider environment={environment}>
        <StrictMode>
          <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
            <RouterProvider router={createRouterWithOverlay(routeObjects)} />
          </ThemeProvider>
        </StrictMode>
      </RelayEnvironmentProvider>,
    );
  });
});
