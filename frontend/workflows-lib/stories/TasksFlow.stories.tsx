import type { Meta, StoryObj } from "@storybook/react";
import { fakeTasksA } from "./common";
import TaskFlow from "../lib/components/workflow/TasksFlow";

const meta: Meta<typeof TaskFlow> = {
  title: "Tasks",
  component: TaskFlow,
};

type Story = StoryObj<typeof TaskFlow>;

export default meta;
export const Graph: Story = {
  args: {
    tasks: fakeTasksA,
  },
};
