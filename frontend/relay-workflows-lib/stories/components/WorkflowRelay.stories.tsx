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
import WorkflowRelay from "../../lib/components/WorkflowRelay";
import { WorkflowsListViewQuery } from "../../lib/views/WorkflowsListView";
import { WorkflowsListViewQuery$data } from "../../lib/views/__generated__/WorkflowsListViewQuery.graphql";
import { WorkflowsContentFragment$key } from "../../lib/components/__generated__/WorkflowsContentFragment.graphql";
import { WorkflowsContentFragment } from "../../lib/components/WorkflowsContent";

const environment = await getRelayEnvironment();

const Wrapper = ({ children }: { children: ReactElement }) => {
  const queryData = useLazyLoadQuery(
    WorkflowsListViewQuery,
    {},
  ) as WorkflowsListViewQuery$data;
  const data = useFragment<WorkflowsContentFragment$key>(
    WorkflowsContentFragment,
    queryData.workflows,
  );
  return React.cloneElement(children, {
    key: data.nodes[0].name,
    fragmentRef: data.nodes[0],
  });
};

const meta: Meta<typeof WorkflowRelay> = {
  component: WorkflowRelay,
  title: "WorkflowRelay",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Render single workflow relay",
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
} satisfies Meta<typeof WorkflowRelay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  render: (args) => (
    <Wrapper>
      <WorkflowRelay {...args} />
    </Wrapper>
  ),
};
