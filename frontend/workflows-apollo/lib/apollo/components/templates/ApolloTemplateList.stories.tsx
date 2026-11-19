import { getTemplatesMock } from "../../types/mocks";
import ApolloTemplateList from "./ApolloTemplateList";
import { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof ApolloTemplateList> = {
  title: "ApolloTemplateList",
  component: ApolloTemplateList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Displays multiple workflows template overviews",
      },
    },
  },
};

type Story = StoryObj<typeof ApolloTemplateList>;

export default meta;

export const Basic: Story = {
  args: {
    selectedName: null,
    setSelectedName: () => {},
  },
  parameters: {
    apolloClient: {
      mocks: [getTemplatesMock],
    },
  },
};

export const Loading: Story = {
  args: {
    selectedName: "name-2",
    setSelectedName: () => {},
  },
  parameters: {
    apolloClient: {
      mocks: [{ ...getTemplatesMock, delay: Infinity }],
    },
  },
};
