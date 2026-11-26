import {
  submitWorkflowTemplateMock,
  workflowTemplateMock,
} from "../../types/mocks";
import { WorkflowTemplateDetails } from "./WorkflowTemplateDetails";
import { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof WorkflowTemplateDetails> = {
  title: "WorkflowTemplateDetails",
  component: WorkflowTemplateDetails,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Displays a workflow template submission page and contains the relevant Apollo queries/mutations for populating the page and submitting workflows.",
      },
    },
  },
};

type Story = StoryObj<typeof WorkflowTemplateDetails>;

export const TemplateSubmissionPage: Story = {
  args: {
    templateName: "mock-template",
  },
  parameters: {
    apolloClient: {
      mocks: [workflowTemplateMock, submitWorkflowTemplateMock],
    },
  },
};

export const Loading: Story = {
  args: {
    templateName: "mock-template",
  },
  parameters: {
    apolloClient: {
      mocks: [{ ...workflowTemplateMock, delay: Infinity }],
    },
  },
};

export default meta;
