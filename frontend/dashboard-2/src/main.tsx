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
import { TemplateList } from "workflows-lib-2";

const workflowTemplates = [
  {
    name: "normalisation",
    maintainer: "imaging-i14-group",
    title: "Normalisation",
    description: "Normalises data using min-max scaling."
  },
  {
    name: "calibrate",
    maintainer: "imaging-i14-group",
    title: "Calibrate Data",
    description: "Applies calibration to data using provided calirbation coeffiecients."
  },
  {
    name: "align",
    maintainer: "imaging-i14-group",
    title: "Align Data",
    description: `A utility which takes in a file path, a mask, aligns data according to vertical mass or phase 
      correlation between images, and does some more stuff that should overflow the text box and lead to an elipse`
  },
]

// Having to set index to true for all of them is quite annoying
// TODO: Fix this
const routeObjects: NavRouteObject[] = [
  {
    path: "templates",
    element: <TemplateList 
      templateData={workflowTemplates}
    />,
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
