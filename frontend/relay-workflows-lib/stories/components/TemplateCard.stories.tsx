import { Meta, StoryObj } from "@storybook/react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import { MemoryRouter } from "react-router-dom";
import React, { ReactElement } from "react";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { TemplatesListViewQuery } from "../../lib/views/TemplatesListView";
import { TemplatesListViewQuery$data } from "../../lib/views/__generated__/TemplatesListViewQuery.graphql";
import TemplateCard from "../../lib/components/TemplateCard";

const environment = await getRelayEnvironment();

const Wrapper = ({
  responseIndex,
  children,
}: {
  responseIndex: number;
  children: ReactElement;
}) => {
  const data = useLazyLoadQuery(
    TemplatesListViewQuery,
    {},
  ) as TemplatesListViewQuery$data;
  return React.cloneElement(children, {
    template: data.workflowTemplates.nodes[responseIndex],
  });
};

const meta: Meta<typeof TemplateCard> = {
  component: TemplateCard,
  title: "TemplateCard",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Render card displaying template information",
      },
    },
  },
  decorators: [
    (Story) => (
      <RelayEnvironmentProvider environment={environment}>
        <ThemeProvider theme={DiamondTheme} defaultMode="light">
          <MemoryRouter initialEntries={["/"]}>
            <Story />
          </MemoryRouter>
        </ThemeProvider>
      </RelayEnvironmentProvider>
    ),
  ],
} satisfies Meta<typeof TemplateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  render: (args) => (
    <Wrapper responseIndex={0}>
      <TemplateCard {...args} />
    </Wrapper>
  ),
};
