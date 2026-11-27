import TemplateOverviewCard from "./TemplateOverviewCard";
import { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof TemplateOverviewCard> = {
  title: "TemplateOverviewCard",
  component: TemplateOverviewCard,
  tags: ["autodocs"],
  decorators: [(story) => <div style={{ width: "300px" }}>{story()}</div>],
  parameters: {
    docs: {
      description: {
        component:
          "A component for displaying brief details of a workflow template in a small ammount of space",
      },
    },
  },
};

type Story = StoryObj<typeof TemplateOverviewCard>;

export default meta;

export const Basic: Story = {
  args: {
    title: "Title",
    maintainer: "maintainer",
    name: "name",
    description: "description",
  },
};

export const AutomaticTitle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "If no title is provided the template name is used (converted from kebab case to title case)",
      },
    },
  },
  args: {
    title: null,
    maintainer: "maintainer",
    name: "name",
    description: "description",
  },
};

export const NoDescription: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "If no description is provided it is replaced with a helpful message",
      },
    },
  },
  args: {
    title: "Title",
    maintainer: "maintainer",
    name: "name",
    description: null,
  },
};
