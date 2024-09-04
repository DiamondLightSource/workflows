import type { Meta, StoryObj } from "@storybook/react";
import WorkflowAccordion from "../lib/components/workflow/WorkflowAccordian";
import { WorkflowStatus } from "../lib/types";

const fakeTasks = [
  {
    workflow: "1",
    name: "task-1",
    status: "completed",
  },
  {
    depends: "task-1",
    workflow: "1",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "completed",
  },
  {
    depends: "task-1",
    workflow: "1",
    name: "task-3",
    status: "running",
  },
  {
    workflow: "1",
    name: "task-4 ERFBAK3KJ34",
    status: "running",
  },
  {
    workflow: "1",
    name: "task-5 EOI909D",
    status: "completed",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-6 KNMNE9",
    status: "running",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-7 KLDJF034 DFJSOID 039402KDJODKLFJLDJFLKSDJFLKJSD",
    status: "running",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-8",
    status: "pending",
  },
  {
    depends: "task-6 KNMNE9",
    workflow: "1",
    name: "task-9",
    status: "pending",
  },
  {
    depends: "task-9",
    workflow: "1",
    name: "task-10",
    status: "pending",
  },
  {
    depends: "task-10",
    workflow: "1",
    name: "task-11",
    status: "pending",
  },
  {
    depends: "task-5 EOI909D",
    workflow: "1",
    name: "task-12",
    status: "completed",
  },
];

const fakeWorkflow = {
  name: "Workflow 1",
  status: "Failed" as WorkflowStatus,
  tasks: fakeTasks,
};

const meta: Meta<typeof WorkflowAccordion> = {
  title: "Workflow",
  component: WorkflowAccordion,
};

type Story = StoryObj<typeof WorkflowAccordion>;

export default meta;
export const Accordion: Story = {
  args: {
    workflow: fakeWorkflow,
  },
};
