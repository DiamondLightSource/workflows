import { Meta, StoryObj } from "@storybook/react";
import {
  RelayEnvironmentProvider,
  useFragment,
  useLazyLoadQuery,
} from "react-relay";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import { MemoryRouter } from "react-router-dom";
import React, { ReactElement } from "react";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { WorkflowsListViewQuery } from "../../lib/views/WorkflowsListView";
import { WorkflowsListViewQuery$data } from "../../lib/views/__generated__/WorkflowsListViewQuery.graphql";
import { WorkflowsContentFragment$key } from "../../lib/components/__generated__/WorkflowsContentFragment.graphql";
import { WorkflowsContentFragment } from "../../lib/components/WorkflowsContent";
import BaseWorkflowRelay from "../../lib/components/BaseWorkflowRelay";
import { WorkflowRelayFragment$key } from "../../lib/components/__generated__/WorkflowRelayFragment.graphql";
import { WorkflowRelayFragment } from "../../lib/components/WorkflowRelay";

const environment = await getRelayEnvironment();

const Wrapper = ({ children }: { children: ReactElement }) => {
  const queryData = useLazyLoadQuery(
    WorkflowsListViewQuery,
    {},
  ) as WorkflowsListViewQuery$data;
  const workflowsData = useFragment<WorkflowsContentFragment$key>(
    WorkflowsContentFragment,
    queryData.workflows,
  );
  const data = useFragment<WorkflowRelayFragment$key>(
    WorkflowRelayFragment,
    workflowsData.nodes[1],
  );
  return React.cloneElement(children, {
    fragmentRef: data,
  });
};

const meta: Meta<typeof BaseWorkflowRelay> = {
  component: BaseWorkflowRelay,
  title: "BaseWorkflowRelay",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Render base version of workflow relay",
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
} satisfies Meta<typeof BaseWorkflowRelay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  render: (args) => (
    <Wrapper>
      <BaseWorkflowRelay {...args} />
    </Wrapper>
  ),
};
