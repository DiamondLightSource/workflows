import { Meta, StoryObj } from "@storybook/react";
import {
  RelayEnvironmentProvider,
  useFragment,
  useLazyLoadQuery,
} from "react-relay";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import React, { ReactElement } from "react";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import WorkflowInfo from "../../lib/components/WorkflowInfo";
import { SingleWorkflowViewQuery } from "../../lib/views/SingleWorkflowView";
import { SingleWorkflowViewQuery$data } from "../../lib/views/__generated__/SingleWorkflowViewQuery.graphql";
import { BaseSingleWorkflowViewFragment } from "../../lib/views/BaseSingleWorkflowView";
import { BaseSingleWorkflowViewFragment$data } from "../../lib/views/__generated__/BaseSingleWorkflowViewFragment.graphql";

const environment = await getRelayEnvironment();

const Wrapper = ({ children }: { children: ReactElement }) => {
  const data = useLazyLoadQuery(
    SingleWorkflowViewQuery,
    {},
  ) as SingleWorkflowViewQuery$data;
  const subdata = useFragment(
    BaseSingleWorkflowViewFragment,
    data.workflow,
  ) as BaseSingleWorkflowViewFragment$data;
  return React.cloneElement(children, {
    fragmentRef: subdata,
  });
};

const meta: Meta<typeof WorkflowInfo> = {
  component: WorkflowInfo,
  title: "WorkflowInfo",
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
          <Story />
        </ThemeProvider>
      </RelayEnvironmentProvider>
    ),
  ],
} satisfies Meta<typeof WorkflowInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  render: (args) => (
    <Wrapper>
      <WorkflowInfo {...args} />
    </Wrapper>
  ),
};
