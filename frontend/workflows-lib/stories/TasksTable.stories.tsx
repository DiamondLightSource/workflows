import type { Meta, StoryObj } from "@storybook/react-vite";
import { fakeTasksA } from "./common";
import TasksTable from "../lib/components/workflow/TasksTable";

const meta: Meta<typeof TasksTable> = {
  title: "Tasks",
  component: TasksTable,
};

type Story = StoryObj<typeof TasksTable>;

export default meta;
export const Table: Story = {
  args: {
    tasks: fakeTasksA,
  },
};
