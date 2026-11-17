import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import { WorkflowsApolloProvider } from "workflows-apollo";
import { ExampleComponent } from "workflows-ui";
import { createBrowserRouter } from "react-router-dom";

const root = createRoot(document.getElementById("root") as Element);

root.render(
  <WorkflowsApolloProvider>
    <StrictMode>
      <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
        <RouterProvider
          router={createBrowserRouter([
            {
              path: "/",
              element: <ExampleComponent />,
            },
          ])}
        />
      </ThemeProvider>
    </StrictMode>
  </WorkflowsApolloProvider>,
);
