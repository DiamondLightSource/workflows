import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import {
  createBrowserRouter
} from "react-router-dom";

const root = createRoot(document.getElementById("root") as Element);

root.render(
    <StrictMode>
      <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
        <RouterProvider router={createBrowserRouter([])} />
      </ThemeProvider>
    </StrictMode>
);
