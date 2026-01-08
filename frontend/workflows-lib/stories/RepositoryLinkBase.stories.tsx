import { Meta, StoryObj } from "@storybook/react";
import { RepositoryLinkBase } from "../lib/main";

const meta: Meta<typeof RepositoryLinkBase> = {
  title: "RepositoryLink",
  component: RepositoryLinkBase,
};

type Story = StoryObj<typeof RepositoryLinkBase>;

export default meta;

export const IconWithText: Story = {
  args: {
    variant: "TextIcon",
    repository:
      "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates",
  },
};

export const Icon: Story = {
  args: {
    variant: "Icon",
    repository:
      "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates",
  },
};

export const Disabled: Story = {
  args: {},
};
