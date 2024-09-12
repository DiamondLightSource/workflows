import type { Meta, StoryObj } from "@storybook/react";
import { fakeWorkflowA } from "./common";
import WorkflowAccordion from "../lib/components/workflow/WorkflowAccordian";

const meta: Meta<typeof WorkflowAccordion> = {
  title: "Workflow",
  component: WorkflowAccordion,
};

type Story = StoryObj<typeof WorkflowAccordion>;

export default meta;
export const Accordion: Story = {
  args: {
    workflow: fakeWorkflowA,
  },
};
