import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import WorkflowsRouterProvider from "./navigation-overlay/WorkflowsRouterProvider";
import { NotepadText, Workflow, Zap } from "lucide-react";
import { WorkflowsApolloProvider } from "workflows-apollo";
import { NavRouteObject } from "./navigation-overlay/utils";
import "@diamondlightsource/sci-react-ui/font-styles.css";
// Having to set index to true for all of them is quite annoying
// TODO: Fix this
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

const root = createRoot(document.getElementById("root") as Element);

root.render(
  <WorkflowsApolloProvider>
    <StrictMode>
      <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
        <WorkflowsRouterProvider routeObjects={routeObjects} />
      </ThemeProvider>
    </StrictMode>
  </WorkflowsApolloProvider>,
);
