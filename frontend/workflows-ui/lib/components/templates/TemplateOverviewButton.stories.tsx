import TemplateOverviewButton from "./TemplateOverviewButton";
import { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof TemplateOverviewButton> = {
  title: "TemplateOverviewButton",
  component: TemplateOverviewButton,
  tags: ["autodocs"],
  decorators: [(story) => <div style={{ width: "300px" }}>{story()}</div>],
  parameters: {
    docs: {
      description: {
        component:
          "A component for displaying brief details of a workflow template in a small ammount of space that also handles click events",
      },
    },
  },
};

type Story = StoryObj<typeof TemplateOverviewButton>;

export default meta;

export const Basic: Story = {
  args: {
    cardProps: {
      title: "Title",
      maintainer: "maintainer",
      name: "name",
      description: "description",
    },
    selected: false,
    onSelect: () => {},
  },
};

export const Selected: Story = {
  args: {
    cardProps: {
      title: "Title",
      maintainer: "maintainer",
      name: "name",
      description: "description",
    },
    selected: true,
    onSelect: () => {},
  },
};
