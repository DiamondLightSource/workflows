import type { Preview } from "@storybook/react-vite";
import { worker } from "dashboard/src/mocks/browser";

const preview: Preview = {
  async beforeAll() {
    await worker.start();
  },
  beforeEach() {
    return () => {
      worker.resetHandlers();
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
