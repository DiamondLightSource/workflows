import type { Meta, StoryObj } from "@storybook/react";
import { fakeWorkflowA } from "./common";
import WorkflowAccordion from "../lib/components/workflow/WorkflowAccordion";
import TasksFlow from "../lib/components/workflow/TasksFlow";
import { fakeTasksA } from "./common";

const meta: Meta<typeof WorkflowAccordion> = {
  title: "Workflow",
  component: WorkflowAccordion,
};

type Story = StoryObj<typeof WorkflowAccordion>;

export default meta;
export const Accordion: Story = {
  args: {
    workflow: fakeWorkflowA,
    children: (
      <TasksFlow tasks={fakeTasksA} isDynamic={true} onNavigate={() => {}} />
    ),
  },
};
