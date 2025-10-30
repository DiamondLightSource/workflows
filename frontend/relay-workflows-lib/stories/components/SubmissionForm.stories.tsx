import { Meta, StoryObj } from "@storybook/react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { ThemeProvider, DiamondTheme } from "@diamondlightsource/sci-react-ui";
import React, { ReactElement } from "react";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import SubmissionForm from "../../lib/components/SubmissionForm";
import { TemplateViewQuery } from "../../lib/views/TemplateView";
import { TemplateViewQuery$data } from "../../lib/views/__generated__/TemplateViewQuery.graphql";

const environment = await getRelayEnvironment();

const Wrapper = ({ children }: { children: ReactElement }) => {
  const data = useLazyLoadQuery(
    TemplateViewQuery,
    {},
  ) as TemplateViewQuery$data;
  return React.cloneElement(children, {
    template: data.workflowTemplate,
  });
};

const meta: Meta<typeof SubmissionForm> = {
  component: SubmissionForm,
  title: "SubmissionForm",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Render workflow submission form",
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
} satisfies Meta<typeof SubmissionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  render: (args) => (
    <Wrapper>
      <SubmissionForm {...args} />
    </Wrapper>
  ),
};
