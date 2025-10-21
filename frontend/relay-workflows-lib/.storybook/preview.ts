import type { Preview } from "@storybook/react-vite";
import { server } from "../stories/browser";

const preview: Preview = {
  async beforeAll() {
    await server.start();
  },
  beforeEach() {
    return () => {
      server.resetHandlers();
    };
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
