import type { Meta, StoryObj } from "@storybook/react";
import { fakeWorkflowA, fakeWorkflowB, fakeWorkflowC } from "./common";
import WorkflowStack from "../lib/components/workflow/WorkflowStack";

const meta: Meta<typeof WorkflowStack> = {
  title: "Workflow",
  component: WorkflowStack,
};

type Story = StoryObj<typeof WorkflowStack>;

export default meta;
export const Stack: Story = {
  args: {
    workflows: [fakeWorkflowA, fakeWorkflowB, fakeWorkflowC],
  },
};
