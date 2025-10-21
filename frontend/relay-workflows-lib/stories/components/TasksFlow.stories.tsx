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
import { WorkflowRelayFragment$key } from "../../lib/components/__generated__/WorkflowRelayFragment.graphql";
import { WorkflowRelayFragment } from "../../lib/components/WorkflowRelay";
import TasksFlow from "../../lib/components/TasksFlow";
import { BaseWorkflowRelayFragment$key } from "../../lib/components/__generated__/BaseWorkflowRelayFragment.graphql";
import { BaseWorkflowRelayFragment } from "../../lib/components/BaseWorkflowRelay";
import { Box } from "@mui/material";

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
  const relayData = useFragment<WorkflowRelayFragment$key>(
    WorkflowRelayFragment,
    workflowsData.nodes[1],
  );
  const data = useFragment<BaseWorkflowRelayFragment$key>(
    BaseWorkflowRelayFragment,
    relayData,
  );
  return React.cloneElement(children, {
    workflowName: data.name,
    tasksRef: data,
  });
};

const meta: Meta<typeof TasksFlow> = {
  component: TasksFlow,
  title: "TasksFlow",
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
            <Box
              sx={{
                width: {
                  xl: "100%",
                  lg: "100%",
                  md: "90%",
                  sm: "80%",
                  xs: "70%",
                },
                minWidth: "300px",
                maxWidth: "1150px",
                height: "200px",
                mx: "auto",
              }}
            >
              <Story />
            </Box>
          </MemoryRouter>
        </ThemeProvider>
      </RelayEnvironmentProvider>
    ),
  ],
} satisfies Meta<typeof TasksFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  render: (args) => (
    <Wrapper>
      <TasksFlow {...args} />
    </Wrapper>
  ),
  args: {
    onNavigate: () => {},
  },
};
