import React from "react";
import { CssBaseline } from "@mui/material";
import "./storybook.css"; /* Storybook CSS override */
import { ThemeProvider } from "@mui/material";
import { DiamondDSTheme } from "@diamondlightsource/sci-react-ui";
import { ThemeSwapper, TextLight, TextDark } from "./ThemeSwapper";
import { Decorator } from "@storybook/react-vite";

const TextThemeDiamondDS = "Theme: DiamondDS";

export const decorators: Decorator[] = [
  (StoriesWithPadding: React.FC) => {
    return (
      <div style={{ padding: "2em" }}>
        <StoriesWithPadding />
      </div>
    );
  },
  (Story, context) => {
    const disableThemeSwapper = context.parameters.disableThemeSwapper === true;
    return (
      <ThemeProvider theme={DiamondDSTheme}>
        <CssBaseline />

        {disableThemeSwapper ? (
          <Story />
        ) : (
          <ThemeSwapper context={context}>
            <Story />
          </ThemeSwapper>
        )}
      </ThemeProvider>
    );
  },
];

const preview = {
  globalTypes: {
    themeMode: {
      description: "Global theme mode for components",
      toolbar: {
        title: "Theme Mode",
        icon: "mirror",
        items: [TextLight, TextDark],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: TextThemeDiamondDS,
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disabled: true },
    layout: "fullscreen",
  },
  argTypes: {
    linkComponent: {
      control: false,
    },
  },
};

export default preview;
