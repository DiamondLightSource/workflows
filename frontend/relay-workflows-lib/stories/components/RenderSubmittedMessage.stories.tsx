import { Meta, StoryObj } from "@storybook/react";
import { RenderSubmittedMessage } from "../../lib/components/RenderSubmittedMessage";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import { MemoryRouter } from "react-router-dom";
import React, { ReactElement } from "react";
import { MockRenderSubmittedMessageQuery } from "../mock-queries/MockRenderSubmittedMessageQuery";
import { MockRenderSubmittedMessageQuery$data } from "../mock-queries/__generated__/MockRenderSubmittedMessageQuery.graphql";

const environment = await getRelayEnvironment();

const Wrapper = ({
  name,
  children,
  ...props
}: {
  name: string;
  children: ReactElement;
}) => {
  const data = useLazyLoadQuery(MockRenderSubmittedMessageQuery, {
    name,
  }) as MockRenderSubmittedMessageQuery$data;
  return React.cloneElement(children, { ...props, fragmentRef: data.workflow });
};

const meta: Meta<typeof RenderSubmittedMessage> = {
  component: RenderSubmittedMessage,
  title: "RenderSubmittedMessage",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Render message",
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
} satisfies Meta<typeof RenderSubmittedMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const unknownStatus: Story = {
  render: (args) => (
    <Wrapper name="workflow-name">
      <RenderSubmittedMessage {...args} />
    </Wrapper>
  ),
  args: {
    result: {
      type: "success",
      message: "workflow-name",
    },
  },
};

export const completedWorkflow: Story = {
  render: (args) => (
    <Wrapper name="completed-workflow">
      <RenderSubmittedMessage {...args} />
    </Wrapper>
  ),
  args: {
    result: {
      type: "success",
      message: "completed-workflow",
    },
  },
};

export const runningWorkflow: Story = {
  render: (args) => (
    <Wrapper name="running-workflow">
      <RenderSubmittedMessage {...args} />
    </Wrapper>
  ),
  args: {
    result: {
      type: "success",
      message: "running-workflow",
    },
  },
};

export const pendingWorkflow: Story = {
  render: (args) => (
    <Wrapper name="pending-workflow">
      <RenderSubmittedMessage {...args} />
    </Wrapper>
  ),
  args: {
    result: {
      type: "success",
      message: "pending-workflow",
    },
  },
};

export const erroredWorkflow: Story = {
  render: (args) => (
    <Wrapper name="errored-workflow">
      <RenderSubmittedMessage {...args} />
    </Wrapper>
  ),
  args: {
    result: {
      type: "success",
      message: "errored-workflow",
    },
  },
};

export const networkError: Story = {
  args: {
    result: {
      type: "networkError",
      error: {
        name: "404",
        message: "Network Error",
      },
    },
  },
};

export const graphqlError: Story = {
  args: {
    result: {
      type: "graphQLError",
      errors: [{ message: "GraphQL Error" }],
    },
  },
};
