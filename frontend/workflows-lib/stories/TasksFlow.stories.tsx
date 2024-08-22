import type { Meta, StoryObj } from "@storybook/react";
import { fakeTasks } from "./mockData/MockTasks";

import TaskFlow from "../lib/components/workflow/TasksFlow";

const meta: Meta<typeof TaskFlow> = {
  component: TaskFlow,
};

type Story = StoryObj<typeof TaskFlow>;

export default meta;
export const TasksDAG: Story = {
  args: {
    tasks: fakeTasks,
  },
};
