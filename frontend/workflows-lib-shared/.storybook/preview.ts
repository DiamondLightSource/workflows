import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  globalTypes: {
    diamondMode: {
      description: "Diamond colour scheme",
      toolbar: {
        title: "Diamond Mode",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    diamondMode: "light",
  },

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;