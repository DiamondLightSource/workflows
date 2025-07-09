import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { fakeWorkflowA } from "./common";
import WorkflowAccordion from "../lib/components/workflow/WorkflowAccordion";
import TasksFlow from "../lib/components/workflow/TasksFlow";
import { fakeTasksA } from "./common";

const meta: Meta<typeof WorkflowAccordion> = {
  title: "Workflow",
  component: WorkflowAccordion,

  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
};

type Story = StoryObj<typeof WorkflowAccordion>;

export default meta;
export const Accordion: Story = {
  args: {
    workflow: fakeWorkflowA,
    children: (
      <TasksFlow
        workflowName={fakeWorkflowA.name}
        tasks={fakeTasksA}
        isDynamic={true}
        onNavigate={() => {}}
      />
    ),
  },
};
