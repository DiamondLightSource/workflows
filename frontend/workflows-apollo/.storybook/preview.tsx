import React from "react";
import { CssBaseline } from "@mui/material";
import "./storybook.css"; /* Storybook CSS override */
import { ThemeProvider } from "@mui/material";
import { DiamondDSTheme } from "@diamondlightsource/sci-react-ui";
import { ThemeSwapper, TextLight, TextDark } from "./ThemeSwapper";
import { Decorator, definePreview } from "@storybook/react-vite";
import { ApolloClient, InMemoryCache } from "@apollo/client";
import apolloClient from "storybook-addon-apollo-client";
import { MockLink } from "@apollo/client/testing";
import addonDocs from "@storybook/addon-docs";

const TextThemeDiamondDS = "Theme: DiamondDS";

export const decorators: Decorator[] = [];

export default definePreview({
  decorators: [
    (StoriesWithPadding: React.FC) => {
      return (
        <div style={{ padding: "2em" }}>
          <StoriesWithPadding />
        </div>
      );
    },
    (Story, context) => {
      const disableThemeSwapper =
        context.parameters.disableThemeSwapper === true;
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
  ],
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
    backgrounds: { disable: true },
    layout: "fullscreen",
  },
  argTypes: {
    linkComponent: {
      control: false,
    },
  },
  addons: [
    addonDocs(),
    apolloClient({
      createClient: ({
        mocks = [],
      }: {
        mocks?: ReadonlyArray<MockLink.MockedResponse>;
      }) =>
        new ApolloClient({
          cache: new InMemoryCache(),
          link: new MockLink(mocks),
        }),
    }),
  ],
});
