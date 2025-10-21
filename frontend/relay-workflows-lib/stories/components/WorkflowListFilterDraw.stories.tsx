import { Meta, StoryObj } from "@storybook/react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import React, { ReactElement } from "react";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { WorkflowListFilterDrawer } from "../../lib/components/WorkflowListFilterDrawer";
import { WorkflowsListViewTemplatesQuery } from "../../lib/views/WorkflowsListView";
import { WorkflowsListViewTemplatesQuery$data } from "../../lib/views/__generated__/WorkflowsListViewTemplatesQuery.graphql";

const environment = await getRelayEnvironment();

const Wrapper = ({ children }: { children: ReactElement }) => {
  const data = useLazyLoadQuery(
    WorkflowsListViewTemplatesQuery,
    {},
  ) as WorkflowsListViewTemplatesQuery$data;
  return React.cloneElement(children, {
    data: data.workflowTemplates,
  });
};

const meta: Meta<typeof WorkflowListFilterDrawer> = {
  component: WorkflowListFilterDrawer,
  title: "WorkflowListFilterDraw",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Render drawer for applying search filters to workflows list",
      },
    },
  },
  decorators: [
    (Story) => (
      <RelayEnvironmentProvider environment={environment}>
        <ThemeProvider theme={DiamondTheme} defaultMode="light">
          <Story />
        </ThemeProvider>
      </RelayEnvironmentProvider>
    ),
  ],
} satisfies Meta<typeof WorkflowListFilterDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Wrapper>
      <WorkflowListFilterDrawer {...args} />
    </Wrapper>
  ),
};
