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

export const Unauthenticated: Story = {
  args: {
    gatewayUrl: "https://workflows.diamond.ac.uk",
  },
};

export const Authenticated: Story = {
  args: {
    gatewayUrl: "https://workflows.diamond.ac.uk",
    accessToken: "example-token",
  },
};
