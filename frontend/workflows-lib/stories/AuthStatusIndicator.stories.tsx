import { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import { AuthStatusIndicator } from "../lib/main";

const meta: Meta<typeof AuthStatusIndicator> = {
  title: "AuthStatusIndicator",
  component: AuthStatusIndicator,
  decorators: [
    (Story) => (
      <ThemeProvider theme={DiamondTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

type Story = StoryObj<typeof AuthStatusIndicator>;

export default meta;

// The gateway is same-origin under /auth, which Storybook does not serve, so
// stub the status response to render each state deterministically.
const mockAuthStatus = (authenticated: boolean) => {
  window.fetch = () =>
    Promise.resolve(new Response(JSON.stringify(authenticated)));
};

export const Unauthenticated: Story = {
  decorators: [
    (Story) => {
      sessionStorage.clear();
      mockAuthStatus(false);
      return <Story />;
    },
  ],
  args: {
    accessToken: "example-token",
  },
};

export const Authenticated: Story = {
  decorators: [
    (Story) => {
      sessionStorage.clear();
      mockAuthStatus(true);
      return <Story />;
    },
  ],
  args: {
    accessToken: "example-token",
  },
};
