import { Meta, StoryObj } from "@storybook/react";
import { RelayEnvironmentProvider, useQueryLoader } from "react-relay";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import { MemoryRouter } from "react-router-dom";
import React, { ReactElement } from "react";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import WorkflowsContent from "../../lib/components/WorkflowsContent";
import { WorkflowsListViewQuery } from "../../lib/views/WorkflowsListView";
import { WorkflowsListViewQuery as WorkflowsListViewQueryType } from "../../lib/views/__generated__/WorkflowsListViewQuery.graphql";

const environment = await getRelayEnvironment();

const Wrapper = ({ children }: { children: ReactElement }) => {
  const [queryReference, loadQuery] =
    useQueryLoader<WorkflowsListViewQueryType>(WorkflowsListViewQuery);
  if (queryReference == null) {
    loadQuery({
      visit: {
        proposalCode: "test",
        proposalNumber: 1234,
        number: 1,
      },
    });
  }
  return React.cloneElement(children, {
    queryReference: queryReference,
  });
};

const meta: Meta<typeof WorkflowsContent> = {
  component: WorkflowsContent,
  title: "WorkflowsContent",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Render list of workflow relays",
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
} satisfies Meta<typeof WorkflowsContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Wrapper>
      <WorkflowsContent {...args} />
    </Wrapper>
  ),
  args: {
    currentPage: 1,
    totalPages: 1,
    selectedLimit: 10,
    isPaginated: false,
    onPageChange: () => {},
    onLimitChange: () => {},
    updatePageInfo: () => {},
  },
};
